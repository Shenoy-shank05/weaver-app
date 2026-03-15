# WEAVER Deployment Guide

## Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (Atlas or local)
- Git

## Environment Setup

### 1. MongoDB Setup

**Option A: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to environment variables

**Option B: Local MongoDB**
1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/weaver`

### 2. Backend Setup

\`\`\`bash
cd server
npm install
\`\`\`

Create `.env` file:
\`\`\`
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-super-secret-key
ML_SERVICE_URL=http://localhost:5001
PORT=5000
NODE_ENV=production
\`\`\`

### 3. ML Service Setup

\`\`\`bash
cd ml_service
pip install -r requirements.txt
python train_model.py
\`\`\`

Create `.env` file:
\`\`\`
FLASK_ENV=production
PORT=5001
\`\`\`

### 4. Frontend Setup

\`\`\`bash
cd client
npm install
\`\`\`

Create `.env.local` file:
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ML_SERVICE_URL=http://localhost:5001
\`\`\`

## Local Development

Start all services:

\`\`\`bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: ML Service
cd ml_service
python app.py

# Terminal 3: Frontend
cd client
npm run dev
\`\`\`

Access at: http://localhost:3000

## Production Deployment

### Option 1: Vercel (Frontend) + Render (Backend & ML)

**Frontend on Vercel:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy

**Backend on Render:**
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

**ML Service on Render:**
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `pip install -r requirements.txt && python train_model.py`
4. Set start command: `python app.py`
5. Add environment variables
6. Deploy

### Option 2: Docker Deployment

**Backend Dockerfile:**
\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
\`\`\`

**ML Service Dockerfile:**
\`\`\`dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["python", "app.py"]
\`\`\`

### Option 3: AWS Deployment

**Backend on EC2:**
1. Launch EC2 instance
2. Install Node.js and MongoDB
3. Clone repository
4. Configure environment variables
5. Start service with PM2

**ML Service on Lambda:**
1. Package Flask app
2. Create Lambda function
3. Set up API Gateway
4. Deploy

## Database Migrations

\`\`\`bash
cd server
node src/db/seed.js  # Seed initial data
\`\`\`

## Monitoring

- Backend logs: Check service provider logs
- ML Service logs: Check service provider logs
- Frontend errors: Check browser console and Vercel analytics

## Troubleshooting

### Connection Issues
- Verify all services are running
- Check environment variables
- Verify firewall/network settings

### Model Loading Issues
- Ensure `train_model.py` was executed
- Check `models/` directory exists
- Verify model files are present

### Database Issues
- Verify MongoDB connection string
- Check database credentials
- Ensure indexes are created

## Security Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Use HTTPS in production
- [ ] Enable CORS only for trusted domains
- [ ] Implement rate limiting
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB authentication
- [ ] Regular security updates
\`\`\`
