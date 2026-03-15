"use client"

import { CheckCircle, AlertCircle, HelpCircle, RotateCcw } from "lucide-react"

interface PredictionResultProps {
  prediction: {
    prediction: number
    result: string
    confidence: number
    confidence_percentage: number
    predicted_class_confidence: number
    predicted_class_confidence_pct: number
    confidence_message: string
    fraud_confidence_label?: string
    contributingFactors?: { feature: string; value: number }[] // Added contributing factors
  }
  onReset: () => void
}

export default function PredictionResult({ prediction, onReset }: PredictionResultProps) {
  // prediction.prediction === 1 means Fake Job in the backend
  const isFake = prediction.prediction === 1
  const confidence = prediction.confidence_percentage

  // Default visuals use a neutral (yellow) state
  let resultColor = "text-yellow-400"
  let resultBg = "bg-yellow-500/20"
  let resultBorder = "border-yellow-500/50"
  let resultIcon = HelpCircle
  let resultLabel = prediction.fraud_confidence_label || "Unknown"

  // If confidence is high, show green or red; otherwise keep the neutral styling but still display model result
  if (confidence >= 70) {
    if (!isFake) {
      resultColor = "text-green-400"
      resultBg = "bg-green-500/20"
      resultBorder = "border-green-500/50"
      resultIcon = CheckCircle
    } else {
      resultColor = "text-red-400"
      resultBg = "bg-red-500/20"
      resultBorder = "border-red-500/50"
      resultIcon = AlertCircle
    }
  }

  const Icon = resultIcon

  return (
    <div className="space-y-6">
      <div className={`glass p-8 rounded-xl border ${resultBorder} ${resultBg}`}>
        <div className="flex items-center gap-4 mb-6">
          <Icon className={`w-12 h-12 ${resultColor}`} />
          <div>
            {prediction.fraud_confidence_label && (
              <h2 className={`text-3xl font-bold mb-1 ${
                prediction.fraud_confidence_label === "Genuine" ? "text-green-400" :
                prediction.fraud_confidence_label === "Seems Good" ? "text-blue-400" :
                prediction.fraud_confidence_label === "Suspicious" ? "text-yellow-400" :
                prediction.fraud_confidence_label === "Highly Suspicious" ? "text-orange-400" :
                "text-red-400"
              }`}>
                {prediction.fraud_confidence_label}
              </h2>
            )}
           
          </div>
          {/* Right-aligned real/fake job badge */}
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              !isFake ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-red-400 bg-red-500/10 border border-red-500/20"
            }`}>
              {prediction.result}
            </span>
          </div>
          </div>

        {/* Confidence Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Confidence Score</span>
            <span className="text-sm font-semibold text-white">{prediction.predicted_class_confidence_pct.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-[#1a1f3a] rounded-full h-3 overflow-hidden border border-[#00d9ff]/20">
            <div
              className={`h-full transition-all duration-500 ${
                prediction.predicted_class_confidence_pct >= 70
                  ? !isFake
                    ? "bg-linear-to-r from-green-500 to-green-400"
                    : "bg-linear-to-r from-red-500 to-red-400"
                  : "bg-linear-to-r from-yellow-500 to-yellow-400"
              }`}
              style={{ width: `${prediction.predicted_class_confidence_pct}%` }}
            />
          </div>
        </div>

        {/* Interpretation */}
        <div className="p-4 bg-[#1a1f3a] rounded-lg border border-[#00d9ff]/20">
          <p className="text-gray-300">
            {prediction.confidence_message || (confidence >= 70
              ? !isFake
                ? "This job posting appears to be legitimate with high confidence. However, always verify company details independently."
                : "This job posting shows signs of being fraudulent. Exercise caution and verify all details before applying."
              : `Model label: ${prediction.fraud_confidence_label || 'Low confidence'}. Review the details carefully and verify independently.`)}
          </p>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg font-semibold text-white hover:bg-[#252d4a] transition flex items-center justify-center gap-2"
      >
        <RotateCcw size={20} />
        Analyze Another Job
      </button>
    </div>
  )
}
