# WEAVER Testing Guide

## Backend Testing

### Setup
\`\`\`bash
cd server
npm install --save-dev jest supertest
\`\`\`

### Test Authentication
\`\`\`bash
npm test -- auth.test.js
\`\`\`

### Test Predictions
\`\`\`bash
npm test -- predictions.test.js
\`\`\`

## ML Service Testing

### Setup
\`\`\`bash
cd ml_service
pip install pytest pytest-cov
\`\`\`

### Test Model Training
\`\`\`bash
pytest test_model_trainer.py
\`\`\`

### Test Predictions
\`\`\`bash
pytest test_predictions.py
\`\`\`

## Frontend Testing

### Setup
\`\`\`bash
cd client
npm install --save-dev @testing-library/react @testing-library/jest-dom
\`\`\`

### Test Components
\`\`\`bash
npm test
\`\`\`

## Integration Testing

### Test Full Flow
1. User signup
2. Job analysis
3. Prediction saving
4. History retrieval

## Performance Testing

### Load Testing
\`\`\`bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:5000/api/health
\`\`\`

### ML Service Performance
- Average prediction time: < 500ms
- Batch prediction throughput: > 100 jobs/sec

## Security Testing

- SQL injection prevention
- XSS protection
- CSRF token validation
- JWT token expiration
- Password strength validation
\`\`\`
