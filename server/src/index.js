import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose"
import authRoutes from "./routes/auth.js"
import predictionRoutes from "./routes/predictions.js"
import scrapeRoutes from "./routes/scrape.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())
console.log("Mongo URI:", process.env.MONGODB_URI)

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/weaver")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" })
})

app.use("/api/auth", authRoutes)
app.use("/api", predictionRoutes)
app.use("/api", scrapeRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Internal server error", error: err.message })
})

// Start server
app.listen(PORT, () => {
  console.log(`WEAVER Server running on port ${PORT}`)
})
