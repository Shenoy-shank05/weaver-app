# WEAVER - Web Extraction & AI Verification for Employment Reliability

A full-stack application for detecting fake job postings using machine learning.

## Project Structure

\`\`\`
weaver/
├── client/              # React frontend
├── server/              # Express.js backend
├── ml_service/          # Flask ML microservice
└── README.md
\`\`\`

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB

### Installation

1. **Clone and install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Setup environment variables**
   - Create `.env` in `server/` directory
   - Create `.env` in `ml_service/` directory

3. **Start development servers**
   \`\`\`bash
   npm run dev
   \`\`\`

## Features

- User authentication with JWT
- Job posting URL scraping
- Manual job data input
- ML-powered fake job detection
- Prediction history tracking
- Glassmorphism UI with dark theme

## Technology Stack

- **Frontend**: React.js, Next.js, Tailwind CSS
- **Backend**: Express.js, MongoDB, JWT
- **ML**: Flask, CatBoost, TF-IDF, Scrapy
