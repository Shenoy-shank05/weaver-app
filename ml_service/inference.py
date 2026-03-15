import re
import pickle
import numpy as np
import pandas as pd
from joblib import load
from sklearn.feature_extraction.text import TfidfVectorizer
from catboost import Pool
import shap

class JobPredictionEngine:
    def _load_categories(self, csv_file, column_name, default_categories):
        try:
            categories = pd.read_csv(csv_file)[column_name].dropna().unique().tolist()
            # Add 'Other' if not present
            if 'Other' not in categories:
                categories.append('Other')
            return categories
        except Exception:
            return default_categories

    def __init__(self, model_path='catboost_model.pkl'):
        self.model = None
        self.vectorizer = None
        self.model_path = model_path
        
        # Dataset structure - matches the order used in training
        self.text_columns = ['title', 'company_profile', 'description', 'requirements', 'benefits']
        self.binary_columns = ['telecommuting', 'has_company_logo', 'has_questions']
        self.categorical_columns = ['employment_type', 'required_experience', 'required_education', 'industry', 'function']
        
        # Load TF-IDF vectorizer using joblib
        try:
            self.vectorizer = load('tfidf_vectorizer.pkl')
        except FileNotFoundError as e:
            raise FileNotFoundError(f"TF-IDF vectorizer file not found. Please ensure tfidf_vectorizer.pkl exists.")
        
        self.load_model()
    
    def load_model(self):
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            # Try to extract expected feature names from the model (if saved with names)
            self.expected_feature_names = None
            try:
                # CatBoost stores feature names under attribute 'feature_names_'
                if hasattr(self.model, 'feature_names_') and self.model.feature_names_:
                    self.expected_feature_names = list(self.model.feature_names_)
                # Fallback: some model objects may expose 'feature_names' or 'get_feature_names'
                elif hasattr(self.model, 'feature_names') and self.model.feature_names:
                    self.expected_feature_names = list(self.model.feature_names)
            except Exception:
                self.expected_feature_names = None
        except FileNotFoundError as e:
            raise FileNotFoundError(f"Model file not found at {self.model_path}. Please ensure the model is saved.")
    
    def preprocess_text(self, text):
        if not isinstance(text, str):
            return ""
        
        text = text.lower()  # Convert to lowercase
        text = re.sub(r'\d+', '', text)  # Remove digits
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        text = ' '.join(text.split())  # Remove extra whitespace
        
        return text
    
    def combine_text_fields(self, job_data):
        """Combine all text fields for TF-IDF vectorization"""
        text_fields = []
        for col in self.text_columns:
            value = job_data.get(col, '')
            if not isinstance(value, str):
                value = ''
            text_fields.append(value)
        
        # Combine all text fields
        combined_text = ' '.join(text_fields)
        
        # Clean the combined text
        cleaned_text = self.preprocess_text(combined_text)
        
        return cleaned_text
    
    def prepare_features(self, job_data):
        binary_features = []
        for col in self.binary_columns:
            value = job_data.get(col, 0)
            binary_features.append(int(value) if value in [0, 1] else 0)
        # 2. Extract and validate categorical features (indices 3-7)
        categorical_features = []
        predefined_categories = {
            'employment_type': ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Other'],
            'required_experience': ['Internship', 'Entry level', 'Associate', 'Mid-Senior level', 'Director', 'Executive', 'Not Specified'],
            'required_education': ["High School", "Bachelor's Degree", "Master's Degree", "Doctorate", "Associate's Degree", "Certification", "Some College", "Not Specified"],
            'industry': self._load_categories('industries.csv', 'industry', [
                'Information Technology and Services', 'Marketing and Advertising', 'Computer Software',
                'Financial Services', 'Hospital & Health Care', 'Education Management', 'Internet',
                'Telecommunications', 'Other'
            ]),
            'function': self._load_categories('function.csv', 'function', [
                'Information Technology', 'Marketing', 'Sales', 'Engineering', 'Management',
                'Customer Service', 'Administrative', 'Finance', 'Human Resources', 'Other'
            ])
        }

        for col in self.categorical_columns:
            value = job_data.get(col, '').strip()
            # Handle missing or invalid values
            if not isinstance(value, str) or value == '':
                value = 'Not Specified' if col in ['required_experience', 'required_education'] else 'Other'
            else:
                # Match to predefined categories
                valid_categories = predefined_categories.get(col, [])
                if valid_categories:
                    # Try exact match first
                    if value not in valid_categories:
                        # Try case-insensitive match
                        value_lower = value.lower()
                        matched = False
                        for category in valid_categories:
                            if category.lower() == value_lower or value_lower in category.lower():
                                value = category
                                matched = True
                                break
                        if not matched:
                            value = 'Other'
            categorical_features.append(value)

        # 3. Extract TF-IDF features (indices 8-5007)
        combined_text = self.combine_text_fields(job_data)
        tfidf_features = self.vectorizer.transform([combined_text]).toarray()

        # Build pandas DataFrame with proper column names in the exact order used during training
        # Binary columns
        df_binary = pd.DataFrame([binary_features], columns=self.binary_columns)

        # Categorical columns (strings)
        df_cats = pd.DataFrame([categorical_features], columns=self.categorical_columns)

        # TF-IDF columns named tfidf_0 ... tfidf_{n-1}
        n_tfidf = tfidf_features.shape[1]
        tfidf_cols = [f"tfidf_{i}" for i in range(n_tfidf)]
        df_tfidf = pd.DataFrame(tfidf_features, columns=tfidf_cols)

        # Concatenate in the training order: binary -> categorical -> tfidf
        df_all = pd.concat([df_binary, df_cats, df_tfidf], axis=1)

        # Provide categorical feature names (column names) for Pool
        categorical_feature_names = self.categorical_columns.copy()

        # If the model has expected feature names, align df_all to them:
        if getattr(self, 'expected_feature_names', None):
            model_cols = list(self.expected_feature_names)

            # Create missing columns DataFrame at once
            missing_cols = {}
            for col in model_cols:
                if col not in df_all.columns:
                    # Create value for missing column based on type
                    missing_cols[col] = ['Missing'] if col in self.categorical_columns else [0]
            
            # Add missing columns using concat if there are any
            if missing_cols:
                missing_df = pd.DataFrame(missing_cols)
                df_all = pd.concat([df_all, missing_df], axis=1)

            # Drop any columns not expected by the model (to avoid mismatch)
            extra_cols = [c for c in df_all.columns if c not in model_cols]
            if extra_cols:
                df_all = df_all.drop(columns=extra_cols)

            # Reorder columns to match the model exactly
            df_all = df_all[model_cols]

        else:
            # If model feature names are not available, ensure TF-IDF columns reach vectorizer.max_features
            # (fill missing tfidf_* columns with zeros to match expected dimensionality)
            max_feats = getattr(self.vectorizer, 'max_features', None)
            if max_feats:
                expected_tfidf_cols = [f"tfidf_{i}" for i in range(max_feats)]
                missing_tfidf = {}
                for col in expected_tfidf_cols:
                    if col not in df_all.columns:
                        missing_tfidf[col] = [0]
                
                # Add missing TF-IDF columns all at once
                if missing_tfidf:
                    missing_df = pd.DataFrame(missing_tfidf)
                    df_all = pd.concat([df_all, missing_df], axis=1)

                # Ensure binary and categorical columns remain first in the DataFrame
                ordered_cols = self.binary_columns + self.categorical_columns + expected_tfidf_cols
                # Keep only columns that exist in df_all
                ordered_cols = [c for c in ordered_cols if c in df_all.columns]
                df_all = df_all[ordered_cols]

        return df_all, categorical_feature_names
    
    def predict(self, job_data):
        if self.model is None:
            print("[DEBUG] Model is None - not loaded properly")
            raise ValueError("Model not loaded. Please check model file.")
        
        try:
            print("\n[DEBUG] Starting prediction process...")
            print(f"[DEBUG] Model type: {type(self.model)}")
            
            # Prepare features
            X, categorical_indices = self.prepare_features(job_data)
            print(f"[DEBUG] Features prepared. Shape: {X.shape}")
            print(f"[DEBUG] Categorical indices: {categorical_indices}")
            print(f"[DEBUG] Feature columns: {X.columns.tolist()}")
            
            # Create CatBoost Pool with categorical features
            pool = Pool(X, cat_features=categorical_indices)
            print("[DEBUG] CatBoost Pool created")
            
            # Get prediction and probabilities
            print("[DEBUG] Making prediction...")
            prediction = self.model.predict(pool)[0]
            print(f"[DEBUG] Raw prediction: {prediction}")
            
            print("[DEBUG] Getting probabilities...")
            probabilities = self.model.predict_proba(pool)[0]
            print(f"[DEBUG] Raw probabilities: {probabilities}")

            fraud_prob = 0.0
            try:
                print("[DEBUG] Processing probabilities...")
                # probabilities is an array like [p_class0, p_class1]
                if len(probabilities) > 1:
                    print("[DEBUG] Using second class probability (index 1)")
                    fraud_prob = float(probabilities[1])
                else:
                    print("[DEBUG] Only one probability available, using prediction to determine")
                    # fallback: if only one probability returned, and prediction==1 assume 1.0 else 0.0
                    fraud_prob = float(probabilities[0]) if int(prediction) == 1 else 0.0
                print(f"[DEBUG] Calculated fraud probability: {fraud_prob}")
            except Exception as e:
                print(f"[DEBUG] Error processing probabilities: {str(e)}")
                fraud_prob = 0.0

            fraud_pct = round(fraud_prob * 100, 2)

            if fraud_pct < 30:
                fraud_label = "Genuine"
            elif fraud_pct < 50:
                fraud_label = "Seems Good"
            elif fraud_pct < 70:
                fraud_label = "Suspicious"
            elif fraud_pct < 80:
                fraud_label = "Highly Suspicious"
            else:
                fraud_label = "Fraudulent"

            print(f"Prediction: {int(prediction)}, Fraud Probability: {fraud_pct}%, Label: {fraud_label}")
            # Determine result string and confidence message
            is_fake = int(prediction) == 1
            result = "Fake Job" if is_fake else "Real Job"
            
            # Calculate confidence for the predicted class
            predicted_class_confidence = fraud_prob if is_fake else (1 - fraud_prob)
            predicted_class_confidence_pct = round(predicted_class_confidence * 100, 2)
            
            # Generate confidence message
            confidence_message = f"We are {predicted_class_confidence_pct}% confident that this is a {result.lower()}"
            
            return {
                'prediction': int(prediction),
                'result': result,
                'confidence': fraud_prob,
                'confidence_percentage': fraud_pct,
                'predicted_class_confidence': predicted_class_confidence,
                'predicted_class_confidence_pct': predicted_class_confidence_pct,
                'confidence_message': confidence_message,
                'fraud_confidence_label': fraud_label
            }
            print(f"[DEBUG] Final prediction result: {final_result}")
            return final_result
        
        except Exception as e:
            raise ValueError(f"Prediction error: {str(e)}")
          
    def explain_prediction(self, job_data):

        if self.model is None:
            raise ValueError("Model not loaded. Please check model file.")

        print("[DEBUG] Starting SHAP explanation process...")
        print(f"[DEBUG] Input job data: {job_data}")

        # Prepare features (use the same preprocessing as in predict)
        X, categorical_indices = self.prepare_features(job_data)
        print(f"[DEBUG] Prepared features DataFrame: {X.head()} with shape {X.shape}")
        print(f"[DEBUG] Categorical indices: {categorical_indices}")

        pool = Pool(X, cat_features=categorical_indices)

        # Initialize SHAP explainer
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(pool)

        # Handle multi-class SHAP values
        if isinstance(shap_values, list):
            print("[DEBUG] Multi-class SHAP values detected. Using the first class.")
            shap_values = shap_values[0]

        print(f"[DEBUG] SHAP values shape: {shap_values.shape}")

        # Ensure SHAP values align with features
        if shap_values.shape[1] != len(X.columns):
            raise ValueError("Mismatch between SHAP values and feature columns")

        # Get feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'shap_value': shap_values[0] if shap_values.ndim > 1 else shap_values
        })
        feature_importance['abs_shap_value'] = feature_importance['shap_value'].abs()
        feature_importance = feature_importance.sort_values(by='abs_shap_value', ascending=False)
        print(f"[DEBUG] Feature importance DataFrame: {feature_importance.head(10)}")

        # Mapping for tfidf features to text columns
        tfidf_mapping = {
            'tfidf_1489': 'Job Title',
            'tfidf_2828': 'Company Profile',
            'tfidf_2213': 'Job Description',
            'tfidf_1772': 'Requirements',
            'tfidf_471': 'Benefits',
            'tfidf_1279': 'Department'
        }

        # Normalize SHAP values to percentages
        total_abs_shap = feature_importance['abs_shap_value'].sum()
        feature_importance['shap_value_percentage'] = (
            feature_importance['abs_shap_value'] / total_abs_shap * 100
        )

        # Replace tfidf features with mapped text columns
        feature_importance['feature'] = feature_importance['feature'].apply(
            lambda x: tfidf_mapping.get(x, x)
        )

        # Select top 10 contributors
        top_contributors = feature_importance.head(10)

        # Format data for frontend
        frontend_data = top_contributors[['feature', 'shap_value_percentage']].rename(
            columns={'shap_value_percentage': 'shap_value'}
        ).to_dict(orient='records')

        print(f"[DEBUG] Top contributors for frontend: {frontend_data}")

        return {
            'top_contributors': frontend_data
        }
