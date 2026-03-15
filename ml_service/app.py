from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from inference import JobPredictionEngine
import google.generativeai as genai
import json
import re
import math 

load_dotenv()

app = Flask(__name__)
CORS(app)

# Gemini AI Configuration


GEMINI_API_KEY = "AIzaSyDvLt0Mp9HaZdzYGfsla4BkK_kGkBHXqZY"
genai.configure(api_key=GEMINI_API_KEY)
# Initialize the Gemini model
model = genai.GenerativeModel('gemini-flash-lite-latest')
available_models = [model.name for model in genai.list_models()]
print( available_models)

# Global prediction engine
prediction_engine = None

def initialize_engine():
    """Initialize the prediction engine on startup"""
    global prediction_engine
    try:
        prediction_engine = JobPredictionEngine()
        print("[v0] Prediction engine initialized successfully")
        return True
    except Exception as e:
        print(f"[v0] Error initializing prediction engine: {e}")
        return False

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    if prediction_engine is None:
        return jsonify({'status': 'ML Service is running but model not loaded'}), 503
    return jsonify({'status': 'ML Service is running', 'model_loaded': True})

@app.route('/api/list-models', methods=['GET'])
def list_models():
    """List available Gemini AI models"""
    try:
        available_models = [model.name for model in genai.list_models()]
        return jsonify({'available_models': available_models})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if prediction_engine is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.json
        job_data = data.get('jobData')
        job_link = data.get('url')
        print("[DEBUG] Received job link for prediction:", job_link)

        required_fields = ['title', 'company_profile', 'description', 'requirements', 'benefits']
        if not all(field in job_data for field in required_fields):
            return jsonify({'error': f'Missing required fields. Required: {required_fields}'}), 400

        # Base (CatBoost)
        result = prediction_engine.predict(job_data)
        catboost_fraud = float(result.get('confidence', 0.0))
        catboost_fraud = max(0.0, min(1.0, catboost_fraud))

        if job_link != "manual-input" and job_link is not None and job_link.strip() != "":
            print("[DEBUG] Performing LLM evaluation for job link:", job_link)

            llm_prompt = f"""
You are a strict evaluator that analyzes a job posting and produces a single numeric fraud probability score.

Your task:
- Return ONLY valid JSON containing:
      "fraud_score": <float between 0.00 and 100.00>

Meaning of the score:
- 0.00  → extremely likely to be GENUINE
- 100.00 → extremely likely to be FAKE
- Must be PRECISE (not rounded to whole numbers).

Strict Rules:
- Score must be entirely based on:
      (a) Job data provided
      (b) Website / job link authenticity
- Do NOT assume anything beyond what is given.
- Do NOT hallucinate anything not explicitly present.
- Score must ALWAYS be between 0.00 and 100.00.
- NEVER output 0 or 100 unless evidence is overwhelming.
- MUST produce the EXACT SAME output for identical input (deterministic).
- NO explanations. NO extra text.

Evaluation Criteria:
- Grammar, clarity, completeness
- Unrealistic salary or perks
- Pressure language (“urgent”, “immediate hire”)
- Requests for sensitive info
- Description inconsistencies
- Missing company profile
- URL authenticity signals (HTTPS, domain trustworthiness)
- Scam-like patterns visible in content

Job Data: {job_data}
Job Link: {job_link}

Return ONLY:
{{ "fraud_score": <float> }}
"""

            llm_response = model.generate_content(llm_prompt)
            raw_text = getattr(llm_response, "text", "") or ""
            print("[DEBUG] LLM response RAW:", repr(raw_text))

            clean = raw_text.strip()
            clean = clean.strip("`").strip()
            clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
            clean = re.sub(r"\s*```$", "", clean, flags=re.IGNORECASE)

            fraud_score = None
            try:
                parsed = json.loads(clean)
                fraud_score = float(parsed.get("fraud_score", 0.0))
            except Exception:
                m = re.search(r"\{.*\}", clean, flags=re.DOTALL)
                if m:
                    try:
                        parsed = json.loads(m.group(0))
                        fraud_score = float(parsed.get("fraud_score", 0.0))
                    except:
                        fraud_score = None

            if fraud_score is None:
                num = re.search(r"(\d+(?:\.\d+)?)", clean)
                if num:
                    fraud_score = float(num.group(1))

            if fraud_score is None:
                fraud_score = 50.0

            fraud_score = max(0.0, min(100.0, fraud_score))
            print("[DEBUG] LLM fraud_score:", fraud_score)

            llm_fraud = fraud_score / 100.0

            # Weighted combination
            w_base = 0.5
            w_llm = 0.5

            final_fraud = (w_base * catboost_fraud) + (w_llm * llm_fraud)
            final_fraud = max(0.0, min(1.0, final_fraud))

            real_prob = 1.0 - final_fraud

            if final_fraud >= real_prob:
                result['prediction'] = 1
                result['result'] = "Fake Job"
                result['predicted_class_confidence'] = final_fraud
            else:
                result['prediction'] = 0
                result['result'] = "Real Job"
                result['predicted_class_confidence'] = real_prob

            result['confidence'] = final_fraud
            result['confidence_percentage'] = final_fraud * 100.0
            result['predicted_class_confidence_pct'] = result['predicted_class_confidence'] * 100.0

            msg = f"We are {math.ceil(result['predicted_class_confidence_pct'] * 100) / 100}% confident that this is a {result['result']}."
            result['confidence_message'] = msg

            pct = final_fraud * 100.0
            if pct < 30:
                fraud_label = "Genuine"
            elif pct < 50:
                fraud_label = "Seems Good"
            elif pct < 70:
                fraud_label = "Suspicious"
            elif pct < 80:
                fraud_label = "Highly Suspicious"
            else:
                fraud_label = "Fraudulent"

            result['fraud_confidence_label'] = fraud_label
            result['llm_fraud_score'] = float(f"{fraud_score:.2f}")

            print("[DEBUG] Final fraud probability:", final_fraud)
            print("[DEBUG] Result:", result)

        else:
            # No LLM → CatBoost only
            result['confidence'] = catboost_fraud
            result['confidence_percentage'] = catboost_fraud * 100.0
            result['predicted_class_confidence'] = catboost_fraud
            result['predicted_class_confidence_pct'] = catboost_fraud * 100.0
            result['prediction'] = 1 if catboost_fraud > 0.5 else 0

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 400




@app.route('/api/scrape', methods=['POST'])
def scrape():
    """
    Scrape and format job posting from URL using Google's Gemini AI
    Expected JSON: { "url": str }
    Returns: Formatted job data matching model requirements
    """
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Format the prompt for Gemini AI
        prompt = f"""You are a job posting analyzer. Analyze this job posting URL: {url}
        Extract and format ALL of the following information in a structured way. If information is not found, use reasonable defaults or leave as empty string:

        1. Job Title (required): The main job title
        2. Company Profile (required): Company description, background, and culture
        3. Job Description (required): Detailed description of the role and responsibilities
        4. Requirements (required): Skills, qualifications and requirements
        5. Benefits (optional): Company benefits and perks
        6. Employment Type: Must be one of [Full-time, Part-time, Contract, Temporary, Other]
        7. Required Experience: Must be one of [Internship, Entry level, Associate, Mid-Senior level, Director, Executive, Other]
        8. Required Education: Must be one of [High School, Associate's Degree, Bachelor's Degree, Master's Degree, Doctorate, Other]
        9. Industry: The industry sector (e.g., Information Technology, Healthcare)
        10. Function: The job function/department (e.g., Engineering, Sales)

        For the following, answer yes/no:
        11. Telecommuting: Is remote work mentioned or available?
        12. Company Logo: Is there a company logo visible on the posting?
        13. Screening Questions: Are there any screening or application questions?

        Format the response as a JSON object matching these exact field names:
        {{
            "title": "str",
            "company_profile": "str",
            "description": "str",
            "requirements": "str",
            "benefits": "str",
            "employment_type": "str",
            "required_experience": "str",
            "required_education": "str",
            "industry": "str",
            "function": "str",
            "telecommuting": 0 or 1,
            "has_company_logo": 0 or 1,
            "has_questions": 0 or 1
        }}"""

        # Call Gemini AI
        response = model.generate_content(prompt)
        
        if not response:
            return jsonify({
                'error': 'No response from Gemini AI'
            }), 500

        try:
            # Extract the JSON part from the response
            import json
            import re
            
            # Try to find JSON-like content in the response
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if not json_match:
                raise ValueError("No JSON content found in response")
                
            job_data = json.loads(json_match.group())
            
            # Ensure binary fields are actually 0/1 integers
            for field in ['telecommuting', 'has_company_logo', 'has_questions']:
                if field in job_data:
                    job_data[field] = 1 if str(job_data[field]).lower() in ['1', 'true', 'yes', 'y'] else 0

            return jsonify(job_data)

        except json.JSONDecodeError as e:
            return jsonify({
                'error': 'Failed to parse job data from AI response',
                'details': str(e)
            }), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/explain', methods=['POST'])
def explain():
    """
    Explain the prediction using SHAP and highlight major contributing features.

    Expected JSON: {
        "title": str,
        "company_profile": str,
        "description": str,
        "requirements": str,
        "benefits": str
    }

    Returns: {
        "top_contributors": [
            { "feature": str, "shap_value": float }
        ]
    }
    """
    try:
        if prediction_engine is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.json
        print("[DEBUG] Received data for explanation:", data)

        required_fields = ['title', 'company_profile', 'description', 'requirements', 'benefits']
        if not all(field in data for field in required_fields):
            print("[DEBUG] Missing required fields in data")
            return jsonify({'error': f'Missing required fields. Required: {required_fields}'}), 400

        # Call the updated explain_prediction method
        explanation = prediction_engine.explain_prediction(data)
        print("[DEBUG] Explanation result:", explanation)

        return jsonify({
            'top_contributors': explanation['top_contributors']
        })

    except Exception as e:
        print("[DEBUG] Error in /api/explain endpoint:", str(e))
        return jsonify({'error': str(e)}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize prediction engine on startup
    
    if initialize_engine():
        app.run(debug=True, port=5001)
    else:
        print("[v0] Failed to initialize prediction engine. Please check model files.")
