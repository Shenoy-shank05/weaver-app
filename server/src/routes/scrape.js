import express from "express"
import axios from "axios"
import { authMiddleware } from "../middleware/auth.js"

const router = express.Router()

// Scrape job posting
router.post("/scrape", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ message: "URL is required" })
    }

    // Forward to Flask ML service
    const response = await axios.post(`${process.env.ML_SERVICE_URL || "http://localhost:5001"}/api/scrape`, { url })

    res.json(response.data)
  } catch (error) {
    res.status(500).json({ message: "Scraping failed", error: error.message })
  }
})

export default router
