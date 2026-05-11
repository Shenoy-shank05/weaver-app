"use client"

import type React from "react"

import { useState } from "react"
import axios from "axios"
import { Loader2, LinkIcon } from "lucide-react"
import PredictionResult from "./prediction-result"

interface JobData {
  title: string
  company_name: string
  recruiter_email?: string
  company_profile: string
  description: string
  requirements: string
  benefits: string
  telecommuting: number
  has_company_logo: number
  has_questions: number
  employment_type: string
  required_experience: string
  required_education: string
  industry: string
  function: string
  [key: string]: string | number
}

export default function PasteJobLink() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [jobData, setJobData] = useState<JobData | null>(null)
  const [prediction, setPrediction] = useState<any>(null)

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/api/scrape`, { url })
      setJobData(response.data)
    } catch (err: any) {
      const apiError = err.response?.data
      const message = apiError?.details ? `${apiError.error}: ${apiError.details}` : apiError?.error
      setError(message || "Failed to scrape job posting")
    } finally {
      setLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!jobData) return

    setLoading(true)
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/api/predict`, {jobData, url})

      // Fetch contributing factors for the analyzed job
      const factorsResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/api/explain`,
        jobData
      )
      const nextPrediction = { ...response.data, contributingFactors: factorsResponse.data.top_contributors }
      setPrediction(nextPrediction)

      const token = localStorage.getItem("token")
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/save-prediction`,
        {
          title: jobData.title,
          companyName: jobData.company_name,
          company: jobData.company_profile,
          description: jobData.description,
          prediction: response.data.prediction,
          result: response.data.result,
          confidence: response.data.confidence,
          confidencePercentage: response.data.confidence_percentage,
          source: "link",
          url: url,
          jobData,
          predictionPayload: response.data,
          contributingFactors: factorsResponse.data.top_contributors,
          companyVerification: response.data.company_verification,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
    } catch (err: any) {
      setError(err.response?.data?.error || "Prediction failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Paste Job Link</h1>
        <p className="text-gray-400">Enter a job posting URL to analyze</p>
      </div>

      {!prediction ? (
        <>
          <form onSubmit={handleScrape} className="glass p-8 rounded-xl border border-[#00d9ff]/20 space-y-4">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Job Posting URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/job/..."
                  className="w-full pl-10 pr-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-linear-to-r from-[#00d9ff] to-[#6366f1] rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-[#00d9ff]/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Scraping...
                </>
              ) : (
                "Scrape Job Posting"
              )}
            </button>
          </form>

          {jobData && (
            <div className="glass p-8 rounded-xl border border-[#00d9ff]/20 space-y-6">
              <h2 className="text-xl font-semibold">Review & Edit Job Data</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Job Title *</label>
                  <input
                    type="text"
                    value={jobData.title}
                    onChange={(e) => setJobData({ ...jobData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={jobData.company_name || ""}
                    onChange={(e) => setJobData({ ...jobData, company_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recruiter Email</label>
                  <input
                    type="email"
                    value={jobData.recruiter_email || ""}
                    onChange={(e) => setJobData({ ...jobData, recruiter_email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Employment Type</label>
                  <select
                    value={jobData.employment_type}
                    onChange={(e) => setJobData({ ...jobData, employment_type: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white focus:border-[#00d9ff] focus:outline-none transition"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Required Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Required Experience</label>
                  <select
                    value={jobData.required_experience}
                    onChange={(e) => setJobData({ ...jobData, required_experience: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white focus:border-[#00d9ff] focus:outline-none transition"
                  >
                    <option value="">Select</option>
                    <option value="Internship">Internship</option>
                    <option value="Entry level">Entry level</option>
                    <option value="Associate">Associate</option>
                    <option value="Mid-Senior level">Mid-Senior level</option>
                    <option value="Director">Director</option>
                    <option value="Executive">Executive</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Required Education */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Required Education</label>
                  <select
                    value={jobData.required_education}
                    onChange={(e) => setJobData({ ...jobData, required_education: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white focus:border-[#00d9ff] focus:outline-none transition"
                  >
                    <option value="">Select</option>
                    <option value="High School">High School</option>
                    <option value="Associate's Degree">Associate's Degree</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="Doctorate">Doctorate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Industry</label>
                  <input
                    type="text"
                    value={jobData.industry}
                    onChange={(e) => setJobData({ ...jobData, industry: e.target.value })}
                    placeholder="e.g., Information Technology"
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                  />
                </div>

                {/* Function */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Function</label>
                  <input
                    type="text"
                    value={jobData.function}
                    onChange={(e) => setJobData({ ...jobData, function: e.target.value })}
                    placeholder="e.g., Engineering"
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Company Profile */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Profile *</label>
                <textarea
                  value={jobData.company_profile}
                  onChange={(e) => setJobData({ ...jobData, company_profile: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Job Description *</label>
                <textarea
                  value={jobData.description}
                  onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
                  required
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Requirements *</label>
                <textarea
                  value={jobData.requirements}
                  onChange={(e) => setJobData({ ...jobData, requirements: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
                  required
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Benefits</label>
                <textarea
                  value={jobData.benefits}
                  onChange={(e) => setJobData({ ...jobData, benefits: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobData.telecommuting === 1}
                    onChange={(e) => setJobData({ ...jobData, telecommuting: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded border-[#00d9ff]/30 bg-[#1a1f3a] cursor-pointer"
                  />
                  <span className="text-gray-300">Telecommuting</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobData.has_company_logo === 1}
                    onChange={(e) => setJobData({ ...jobData, has_company_logo: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded border-[#00d9ff]/30 bg-[#1a1f3a] cursor-pointer"
                  />
                  <span className="text-gray-300">Has Company Logo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobData.has_questions === 1}
                    onChange={(e) => setJobData({ ...jobData, has_questions: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded border-[#00d9ff]/30 bg-[#1a1f3a] cursor-pointer"
                  />
                  <span className="text-gray-300">Has Questions</span>
                </label>
              </div>

              <button
                onClick={handlePredict}
                disabled={loading}
                className="w-full py-3 bg-linear-to-r from-[#00d9ff] to-[#6366f1] rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-[#00d9ff]/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Job Posting"
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <PredictionResult prediction={prediction} onReset={() => setPrediction(null)} />
      )}
    </div>
  )
}
