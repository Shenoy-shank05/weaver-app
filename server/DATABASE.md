# WEAVER Database Schema

## Collections

### Users
Stores user account information and authentication details.

\`\`\`javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date
}
\`\`\`

### Predictions
Stores all job prediction results for each user.

\`\`\`javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  company: String,
  description: String,
  prediction: Number (0 or 1),
  result: String ("Real Job", "Fake Job", "Uncertain"),
  confidence: Number (0-1),
  confidencePercentage: Number (0-100),
  source: String ("link" or "manual"),
  url: String (optional),
  timestamp: Date
}
\`\`\`

## Indexes

- Users: email (unique)
- Predictions: userId, timestamp, userId+timestamp

## Setup Instructions

1. Install MongoDB locally or use MongoDB Atlas
2. Update MONGODB_URI in .env
3. Run seed script: \`node src/db/seed.js\`
4. Indexes are created automatically on first connection
\`\`\`
