"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Loader2, Trash2 } from "lucide-react"
import PredictionResult from "./prediction-result"

interface StoredPrediction {
  _id: string
  title: string
  companyName?: string
  company?: string
  description?: string
  prediction: number
  result: string
  confidence: number
  confidencePercentage: number
  source: "link" | "manual"
  url?: string
  timestamp: string
  companyVerification?: any
  predictionPayload?: any
  contributingFactors?: { feature: string; shap_value: number }[]
  jobData?: Record<string, any>
}

export default function PredictionHistory() {
  const [predictions, setPredictions] = useState<StoredPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPredictions(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch history")
    } finally {
      setLoading(false)
    }
  }

  const fetchContributingFactors = async (id: string) => {
    const token = localStorage.getItem("token")
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/shap-explanations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data.top_contributors || []
  }

  const openPrediction = async (prediction: StoredPrediction) => {
    try {
      setOpeningId(prediction._id)
      const storedPayload = prediction.predictionPayload || {}
      let contributingFactors = prediction.contributingFactors || []

      if (!contributingFactors.length) {
        try {
          contributingFactors = await fetchContributingFactors(prediction._id)
        } catch (err) {
          console.error("Failed to fetch contributing factors", err)
        }
      }

      setSelectedPrediction({
        prediction: storedPayload.prediction ?? prediction.prediction,
        result: storedPayload.result ?? prediction.result,
        confidence: storedPayload.confidence ?? prediction.confidence,
        confidence_percentage: storedPayload.confidence_percentage ?? prediction.confidencePercentage,
        predicted_class_confidence:
          storedPayload.predicted_class_confidence ??
          Math.max(storedPayload.confidence ?? prediction.confidence, 0),
        predicted_class_confidence_pct:
          storedPayload.predicted_class_confidence_pct ??
          ((storedPayload.confidence ?? prediction.confidence) * 100),
        confidence_message:
          storedPayload.confidence_message ||
          `Saved analysis for ${prediction.title}. Review the job and company verification details below.`,
        fraud_confidence_label: storedPayload.fraud_confidence_label || prediction.result,
        llm_fraud_score: storedPayload.llm_fraud_score,
        contributingFactors,
        company_verification: storedPayload.company_verification || prediction.companyVerification,
      })
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to open saved prediction")
    } finally {
      setOpeningId(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPredictions(predictions.filter((p) => p._id !== id))
      if (selectedPrediction?._id === id) {
        setSelectedPrediction(null)
      }
    } catch (err) {
      setError("Failed to delete prediction")
    }
  }

  if (selectedPrediction) {
    return <PredictionResult prediction={selectedPrediction} onReset={() => setSelectedPrediction(null)} />
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold mb-2">Prediction History</h1>
        <p className="text-gray-400">Click any row to reopen the full saved analysis view.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#00d9ff]" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">{error}</div>
      ) : predictions.length === 0 ? (
        <div className="glass p-8 rounded-xl border border-[#00d9ff]/20 text-center">
          <p className="text-gray-400">No predictions yet. Start by analyzing a job posting!</p>
        </div>
      ) : (
        <div className="glass rounded-xl border border-[#00d9ff]/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a1f3a] border-b border-[#00d9ff]/20">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Job Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Result</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Confidence</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((pred) => (
                <tr
                  key={pred._id}
                  onClick={() => openPrediction(pred)}
                  className="cursor-pointer border-b border-[#00d9ff]/10 transition hover:bg-[#1a1f3a]/50"
                >
                  <td className="px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                      {openingId === pred._id ? <Loader2 className="h-4 w-4 animate-spin text-[#00d9ff]" /> : null}
                      <div>
                        <p>{pred.title}</p>
                        {pred.companyName ? <p className="text-xs text-gray-400">{pred.companyName}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        pred.result === "Real Job"
                          ? "bg-green-500/20 text-green-400"
                          : pred.result === "Fake Job"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {pred.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">{(pred.confidence * 100).toFixed(2)}%</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{new Date(pred.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDelete(pred._id)
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
