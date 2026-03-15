import User from "../models/User.js"
import Prediction from "../models/Prediction.js"

export const createIndexes = async () => {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })

    // Prediction indexes
    await Prediction.collection.createIndex({ userId: 1 })
    await Prediction.collection.createIndex({ timestamp: -1 })
    await Prediction.collection.createIndex({ userId: 1, timestamp: -1 })

    console.log("Database indexes created successfully")
  } catch (error) {
    console.error("Index creation error:", error)
  }
}
