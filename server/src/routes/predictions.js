import express from "express"
import { authMiddleware } from "../middleware/auth.js"
import Prediction from "../models/Prediction.js"
import axios from "axios"

const router = express.Router()

// Get prediction history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.userId }).sort({ timestamp: -1 }).limit(50)

    res.json(predictions)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Delete prediction
router.delete("/history/:id", authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id)

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" })
    }

    if (prediction.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    await Prediction.findByIdAndDelete(req.params.id)
    res.json({ message: "Prediction deleted" })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Save prediction
router.post("/predict", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      companyName,
      company,
      description,
      prediction,
      result,
      confidence,
      confidencePercentage,
      source,
      url,
      jobData,
      predictionPayload,
      contributingFactors,
      companyVerification,
    } = req.body

    const newPrediction = new Prediction({
      userId: req.userId,
      title,
      companyName,
      company,
      description,
      prediction,
      result,
      confidence,
      confidencePercentage,
      source,
      url,
      jobData,
      predictionPayload,
      contributingFactors,
      companyVerification,
    })

    await newPrediction.save()
    res.status(201).json(newPrediction)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/save-prediction", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      companyName,
      company,
      description,
      prediction,
      result,
      confidence,
      confidencePercentage,
      source,
      url,
      jobData,
      predictionPayload,
      contributingFactors,
      companyVerification,
    } = req.body

    // Validate required fields
    if (!title || prediction === undefined || !result) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const newPrediction = new Prediction({
      userId: req.userId,
      title,
      companyName,
      company,
      description,
      prediction,
      result,
      confidence,
      confidencePercentage,
      source,
      url,
      jobData,
      predictionPayload,
      contributingFactors,
      companyVerification,
    })

    await newPrediction.save()
    res.status(201).json(newPrediction)
  } catch (error) {
    res.status(500).json({ message: "Failed to save prediction", error: error.message })
  }
})

// Get last 5 predictions for dashboard
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.userId }).sort({ timestamp: -1 }).limit(5)

    res.json(predictions)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Fetch SHAP explanations for a specific prediction
router.get("/shap-explanations/:id", authMiddleware, async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id)

    if (!prediction) {
      return res.status(404).json({ message: "Prediction not found" })
    }

    if (prediction.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    // Send raw job data to the Python API for preprocessing and SHAP explanations
    const jobData =
      prediction.jobData || {
        title: prediction.title,
        company_profile: prediction.company,
        description: prediction.description,
        requirements: prediction.requirements || "",
        benefits: prediction.benefits || "",
        telecommuting: prediction.telecommuting || 0,
        has_company_logo: prediction.has_company_logo || 0,
        has_questions: prediction.has_questions || 0,
        employment_type: prediction.employment_type || "",
        required_experience: prediction.required_experience || "",
        required_education: prediction.required_education || "",
        industry: prediction.industry || "",
        function: prediction.function || "",
      }

    // Make a request to the Python API service
    const response = await axios.post("http://localhost:5001/api/explain", jobData)

    res.json({ top_contributors: response.data.top_contributors })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

export default router
