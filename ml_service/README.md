# WEAVER ML Service

Flask-based microservice for fake job detection using CatBoost and TF-IDF.

## Setup

1. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. Train the model:
   \`\`\`bash
   python train_model.py
   \`\`\`

3. Start the service:
   \`\`\`bash
   python app.py
   \`\`\`

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns service status

### Single Prediction
- **POST** `/api/predict`
- Body: Job posting data (title, company_profile, description, requirements, benefits, etc.)
- Returns: prediction, result, confidence, confidence_percentage

### Batch Prediction
- **POST** `/api/batch-predict`
- Body: { "jobs": [job_data1, job_data2, ...] }
- Returns: Array of predictions

### Scrape Job Posting
- **POST** `/api/scrape`
- Body: { "url": "job_posting_url" }
- Returns: Extracted job data

## Model Details

- **Algorithm**: CatBoost Classifier
- **Vectorization**: TF-IDF (max_features=5000)
- **Training Data**: Synthetic dataset with real and fake job postings
- **Accuracy**: ~95% on test data

## File Structure

- `app.py` - Flask application
- `preprocessing.py` - Text preprocessing utilities
- `model_trainer.py` - Model training logic
- `train_model.py` - Script to train and save model
- `models/` - Trained model and vectorizer files
\`\`\`
