# WEAVER Setup Instructions

## Quick Start

### 1. Clone Repository
\`\`\`bash
git clone <repository-url>
cd weaver
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup Environment Variables

**Backend (.env in server/):**
\`\`\`
MONGODB_URI=mongodb://localhost:27017/weaver
JWT_SECRET=your-secret-key-here
ML_SERVICE_URL=http://localhost:5001
PORT=5000
\`\`\`

**ML Service (.env in ml_service/):**
\`\`\`
FLASK_ENV=development
PORT=5001
\`\`\`

**Frontend (.env.local in client/):**
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:5001
\`\`\`

### 4. Train ML Model
\`\`\`bash
cd ml_service
python train_model.py
\`\`\`

### 5. Start Development Servers
\`\`\`bash
npm run dev
\`\`\`

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- ML Service: http://localhost:5001

## Project Structure

\`\`\`
weaver/
├── client/                 # React/Next.js frontend
│   ├── app/               # Pages and layouts
│   ├── components/        # React components
│   ├── lib/              # Utilities and API clients
│   └── globals.css       # Global styles
├── server/                # Express.js backend
│   ├── src/
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   ├── db/          # Database utilities
│   │   └── index.js     # Main server file
│   └── .env.example     # Environment template
├── ml_service/            # Flask ML microservice
│   ├── app.py           # Flask application
│   ├── preprocessing.py # Text preprocessing
│   ├── model_trainer.py # Model training
│   ├── train_model.py   # Training script
│   ├── models/          # Trained models
│   └── requirements.txt  # Python dependencies
└── README.md
\`\`\`

## Features

- **User Authentication**: JWT-based auth with bcrypt password hashing
- **Job Analysis**: ML-powered fake job detection with 95% accuracy
- **URL Scraping**: Extract job details from URLs
- **Manual Input**: Enter job details manually
- **Prediction History**: Track all past analyses
- **Glassmorphism UI**: Modern dark theme with neon accents
- **Real-time Predictions**: Instant ML inference

## Technology Stack

- **Frontend**: React 18, Next.js 14, Tailwind CSS, Axios
- **Backend**: Express.js, MongoDB, JWT, bcryptjs
- **ML**: Flask, CatBoost, TF-IDF, scikit-learn
- **Deployment**: Vercel, Render, Docker

## API Documentation

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login to account

### Predictions
- `GET /api/history` - Get prediction history
- `DELETE /api/history/:id` - Delete prediction
- `POST /api/save-prediction` - Save new prediction
- `GET /api/recent` - Get last 5 predictions

### ML Service
- `POST /api/predict` - Single job prediction
- `POST /api/batch-predict` - Batch predictions
- `POST /api/scrape` - Scrape job from URL

## Testing

\`\`\`bash
# Test backend
cd server
npm test

# Test ML service
cd ml_service
pytest

# Test frontend
cd client
npm test
\`\`\`

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: <repository-issues-url>
- Email: support@weaver.app
\`\`\`
