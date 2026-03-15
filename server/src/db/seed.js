import mongoose from "mongoose"
import User from "../models/User.js"
import Prediction from "../models/Prediction.js"

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/weaver")

    // Clear existing data
    await User.deleteMany({})
    await Prediction.deleteMany({})

    // Create sample users
    const user1 = await User.create({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    })

    const user2 = await User.create({
      name: "Jane Smith",
      email: "jane@example.com",
      password: "password123",
    })

    // Create sample predictions
    const predictions = [
      {
        userId: user1._id,
        title: "Senior Software Engineer",
        company: "Tech Corp",
        description: "We are looking for a senior engineer...",
        prediction: 1,
        result: "Real Job",
        confidence: 0.92,
        confidencePercentage: 92,
        source: "link",
        url: "https://example.com/job/1",
      },
      {
        userId: user1._id,
        title: "Work from Home Data Entry",
        company: "Unknown Company",
        description: "Make $5000 per week from home...",
        prediction: 0,
        result: "Fake Job",
        confidence: 0.88,
        confidencePercentage: 88,
        source: "manual",
      },
      {
        userId: user2._id,
        title: "Product Manager",
        company: "StartUp Inc",
        description: "Join our growing team as a PM...",
        prediction: 1,
        result: "Real Job",
        confidence: 0.85,
        confidencePercentage: 85,
        source: "link",
        url: "https://example.com/job/2",
      },
    ]

    await Prediction.insertMany(predictions)

    console.log("Database seeded successfully")
    await mongoose.disconnect()
  } catch (error) {
    console.error("Seeding error:", error)
    process.exit(1)
  }
}

seedDatabase()
