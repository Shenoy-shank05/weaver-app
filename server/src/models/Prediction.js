import mongoose from "mongoose"

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
  },
  company: {
    type: String,
  },
  description: {
    type: String,
  },
  prediction: {
    type: Number,
    enum: [0, 1],
    required: true,
  },
  result: {
    type: String,
    enum: ["Real Job", "Fake Job", "Uncertain"],
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
  },
  confidencePercentage: {
    type: Number,
    required: true,
  },
  source: {
    type: String,
    enum: ["link", "manual"],
    required: true,
  },
  url: {
    type: String,
  },
  jobData: {
    type: mongoose.Schema.Types.Mixed,
  },
  predictionPayload: {
    type: mongoose.Schema.Types.Mixed,
  },
  contributingFactors: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  companyVerification: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model("Prediction", predictionSchema)
