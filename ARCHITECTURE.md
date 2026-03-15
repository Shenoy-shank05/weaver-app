# WEAVER Architecture

## System Overview

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│  - Landing Page, Auth Pages, Dashboard                      │
│  - Glassmorphism UI with Dark Theme                         │
│  - Real-time Predictions Display                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────────┐
│              Backend (Express.js + MongoDB)                  │
│  - User Authentication (JWT)                                │
│  - Prediction Management                                    │
│  - History Tracking                                         │
│  - URL Scraping Coordination                                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────────┐
│         ML Service (Flask + CatBoost + TF-IDF)              │
│  - Job Posting Analysis                                     │
│  - Fake/Real Classification                                 │
│  - Confidence Scoring                                       │
│  - URL Scraping (Scrapy)                                    │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Data Flow

### 1. User Registration/Login
\`\`\`
Frontend → Backend (Auth Route) → MongoDB (User Storage)
                ↓
           JWT Token Generated
                ↓
           Frontend (Stored in localStorage)
\`\`\`

### 2. Job Analysis (URL)
\`\`\`
Frontend (URL Input)
    ↓
Backend (Scrape Route)
    ↓
ML Service (Scrape Endpoint)
    ↓
Scrapy Spider (Extract Job Data)
    ↓
ML Service (Predict Endpoint)
    ↓
CatBoost Model (Classification)
    ↓
Backend (Save Prediction)
    ↓
MongoDB (Prediction Storage)
    ↓
Frontend (Display Result)
\`\`\`

### 3. Job Analysis (Manual)
\`\`\`
Frontend (Form Input)
    ↓
ML Service (Predict Endpoint)
    ↓
Text Preprocessing (TF-IDF)
    ↓
CatBoost Model (Classification)
    ↓
Backend (Save Prediction)
    ↓
MongoDB (Prediction Storage)
    ↓
Frontend (Display Result)
\`\`\`

## Component Architecture

### Frontend Components
- **Pages**: Landing, Login, Signup, Dashboard
- **Layouts**: DashboardLayout with Sidebar
- **Components**: 
  - PasteJobLink (URL input & scraping)
  - ManualInput (Form-based input)
  - PredictionResult (Result display)
  - PredictionHistory (History table)

### Backend Routes
- `/api/auth/*` - Authentication
- `/api/history` - Prediction history
- `/api/save-prediction` - Save predictions
- `/api/scrape` - URL scraping

### ML Service Endpoints
- `/api/predict` - Single prediction
- `/api/batch-predict` - Batch predictions
- `/api/scrape` - URL scraping

## Database Schema

### Users Collection
\`\`\`javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date
}
\`\`\`

### Predictions Collection
\`\`\`javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  company: String,
  description: String,
  prediction: Number (0 or 1),
  result: String,
  confidence: Number,
  confidencePercentage: Number,
  source: String ("link" or "manual"),
  url: String (optional),
  timestamp: Date
}
\`\`\`

## ML Model Pipeline

1. **Text Preprocessing**
   - Lowercase conversion
   - URL/email removal
   - Special character removal
   - Tokenization

2. **Vectorization**
   - TF-IDF with max_features=5000
   - Bigram support
   - Stop word removal

3. **Classification**
   - CatBoost Classifier
   - 100 iterations
   - Learning rate: 0.1
   - Depth: 6

4. **Output**
   - Prediction (0 or 1)
   - Probability scores
   - Confidence percentage

## Security Measures

- JWT authentication with expiration
- Password hashing with bcryptjs
- MongoDB connection with credentials
- CORS configuration
- Input validation on all endpoints
- Error handling without exposing internals
- Environment variables for secrets

## Performance Optimization

- Database indexes on frequently queried fields
- Vectorizer caching in ML service
- Model caching in memory
- Batch prediction support
- Request timeout configuration
- Efficient text preprocessing

## Scalability Considerations

- Horizontal scaling of backend services
- Load balancing for multiple instances
- Database replication for MongoDB
- Caching layer (Redis) for predictions
- Async job processing for scraping
- ML model versioning and updates
\`\`\`
