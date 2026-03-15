"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Loader2, Trash2 } from "lucide-react"
import FeatureContributionChart from "@/components/dashboard/feature-contribution-chart"

interface Prediction {
  _id: string
  title: string
  confidence: number
  result: string
  timestamp: string
}

export default function PredictionHistory() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [contributingFactors, setContributingFactors] = useState<any>({})

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
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/shap-explanations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log("Fetched contributing factors:", response.data.top_contributors)
      setContributingFactors((prev: any) => ({ ...prev, [id]: response.data.top_contributors }))
    } catch (err) {
      console.error("Failed to fetch contributing factors", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPredictions(predictions.filter((p) => p._id !== id))
    } catch (err) {
      setError("Failed to delete prediction")
    }
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold mb-2">Prediction History</h1>
        <p className="text-gray-400">View all your past job analyses</p>
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
                <tr key={pred._id} className="border-b border-[#00d9ff]/10 hover:bg-[#1a1f3a]/50 transition">
                  <td className="px-6 py-4 text-white">{pred.title}</td>
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
                      onClick={() => handleDelete(pred._id)}
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
