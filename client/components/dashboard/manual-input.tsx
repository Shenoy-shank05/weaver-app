"use client"

import type React from "react"

import { useState } from "react"
import axios from "axios"
import { Loader2 } from "lucide-react"
import PredictionResult from "./prediction-result"

interface FormData {
  title: string
  company_name: string
  recruiter_email: string
  company_website: string
  company_linkedin: string
  registration_id: string
  company_location: string
  company_profile: string
  description: string
  requirements: string
  benefits: string
  telecommuting: number // 0 or 1
  has_company_logo: number // 0 or 1
  has_questions: number // 0 or 1
  employment_type: string
  required_experience: string
  required_education: string
  industry: string
  function: string
}

export default function ManualInput() {
  // Predefined function options from CSV
  const functionOptions = [
    "Marketing",
    "Customer Service",
    "Sales",
    "Health Care Provider",
    "Management",
    "Information Technology",
    "Engineering",
    "Administrative",
    "Design",
    "Education",
    "Supply Chain",
    "Business Development",
    "Product Management",
    "Financial Analyst",
    "Consulting",
    "Human Resources",
    "Project Management",
    "Public Relations",
    "Manufacturing",
    "Strategy/Planning",
    "Advertising",
    "Finance",
    "Business Analyst",
    "Writing/Editing",
    "Art/Creative",
    "Quality Assurance",
    "Data Analyst",
    "Research",
    "Training",
    "Science",
    "Distribution",
    "Purchasing",
    "Other"
  ]

  // Predefined industry options from CSV
  const industryOptions = [
    "Marketing and Advertising",
    "Computer Software",
    "Hospital & Health Care",
    "Online Media",
    "Information Technology and Services",
    "Financial Services",
    "Management Consulting",
    "Internet",
    "Education Management",
    "Telecommunications",
    "Banking",
    "Insurance",
    "Real Estate",
    "Consumer Services",
    "Construction",
    "Automotive",
    "Oil & Energy",
    "Retail",
    "Entertainment",
    "Media Production",
    "Pharmaceuticals",
    "Health, Wellness and Fitness",
    "Computer Hardware",
    "Consumer Goods",
    "Design",
    "Human Resources",
    "Logistics and Supply Chain",
    "Manufacturing",
    "Food & Beverages",
    "Aviation & Aerospace",
    "Computer Games",
    "E-Learning",
    "Biotechnology",
    "Electrical/Electronic Manufacturing",
    "Other"
  ]

  const [formData, setFormData] = useState<FormData>({
    title: "",
    company_name: "",
    recruiter_email: "",
    company_website: "",
    company_linkedin: "",
    registration_id: "",
    company_location: "",
    company_profile: "",
    description: "",
    requirements: "",
    benefits: "",
    telecommuting: 0,
    has_company_logo: 0,
    has_questions: 0,
    employment_type: "Full-time",
    required_experience: "",
    required_education: "",
    industry: "",
    function: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [prediction, setPrediction] = useState<any>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    // For binary fields, convert to number
    if (["telecommuting", "has_company_logo", "has_questions"].includes(name)) {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked ? 1 : 0 : Number(value),
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/api/predict`, {
        jobData: formData,
        url: "manual-input",
      })

      // Fetch contributing factors for the analyzed job
      const factorsResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/api/explain`,
        formData
      )
      const nextPrediction = { ...response.data, contributingFactors: factorsResponse.data.top_contributors }
      setPrediction(nextPrediction)

      const token = localStorage.getItem("token")
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/save-prediction`,
        {
          title: formData.title,
          companyName: formData.company_name,
          company: formData.company_profile,
          description: formData.description,
          prediction: response.data.prediction,
          result: response.data.result,
          confidence: response.data.confidence,
          confidencePercentage: response.data.confidence_percentage,
          source: "manual",
          jobData: formData,
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

  if (prediction) {
    return <PredictionResult prediction={prediction} onReset={() => setPrediction(null)} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manual Job Input</h1>
        <p className="text-gray-400">Enter job details manually for analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="glass p-8 rounded-xl border border-[#00d9ff]/20 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">{error}</div>
        )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Job Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Senior Developer"
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="e.g., Infosys, Accenture"
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
          />
        </div>

        {/* Employment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Employment Type</label>
          <select
            name="employment_type"
            value={formData.employment_type}
            onChange={handleChange}
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
            name="required_experience"
            value={formData.required_experience}
            onChange={handleChange}
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
            name="required_education"
            value={formData.required_education}
            onChange={handleChange}
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
          <select
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white focus:border-[#00d9ff] focus:outline-none transition"
          >
            <option value="">Select Industry</option>
            {industryOptions.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* Function */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Function</label>
          <select
            name="function"
            value={formData.function}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white focus:border-[#00d9ff] focus:outline-none transition"
          >
            <option value="">Select Function</option>
            {functionOptions.map((func) => (
              <option key={func} value={func}>
                {func}
              </option>
            ))}
          </select>
        </div>
      </div>

        {/* Company Profile */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Company Profile *</label>
          <textarea
            name="company_profile"
            value={formData.company_profile}
            onChange={handleChange}
            placeholder="Describe the company..."
            rows={3}
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Job Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter the job description..."
            rows={4}
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
            required
          />
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Requirements *</label>
          <textarea
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            placeholder="List job requirements..."
            rows={3}
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
            required
          />
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Benefits</label>
          <textarea
            name="benefits"
            value={formData.benefits}
            onChange={handleChange}
            placeholder="List job benefits..."
            rows={3}
            className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition resize-none"
          />
        </div>

        <div className="rounded-2xl border border-[#00d9ff]/20 bg-[#0f1530]/70 p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Company Background Verification</h3>
            <p className="mt-1 text-sm text-gray-400">
              Add official company details so we can verify the recruiter email, website domain, and registration signals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Recruiter Email</label>
              <input
                type="email"
                name="recruiter_email"
                value={formData.recruiter_email}
                onChange={handleChange}
                placeholder="e.g., hiring@company.com"
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Official Website</label>
              <input
                type="url"
                name="company_website"
                value={formData.company_website}
                onChange={handleChange}
                placeholder="https://company.com"
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company LinkedIn</label>
              <input
                type="url"
                name="company_linkedin"
                value={formData.company_linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Registration ID / CIN / LLPIN</label>
              <input
                type="text"
                name="registration_id"
                value={formData.registration_id}
                onChange={handleChange}
                placeholder="e.g., U12345KA2024PTC123456"
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Location</label>
              <input
                type="text"
                name="company_location"
                value={formData.company_location}
                onChange={handleChange}
                placeholder="e.g., Bengaluru, Karnataka, India"
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Checkboxes */}
      <div className="grid md:grid-cols-3 gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="telecommuting"
            checked={formData.telecommuting === 1}
            onChange={handleChange}
            className="w-4 h-4 rounded border-[#00d9ff]/30 bg-[#1a1f3a] cursor-pointer"
          />
          <span className="text-gray-300">Telecommuting</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="has_company_logo"
            checked={formData.has_company_logo === 1}
            onChange={handleChange}
            className="w-4 h-4 rounded border-[#00d9ff]/30 bg-[#1a1f3a] cursor-pointer"
          />
          <span className="text-gray-300">Has Company Logo</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="has_questions"
            checked={formData.has_questions === 1}
            onChange={handleChange}
            className="w-4 h-4 rounded border-[#00d9ff]/30 bg-[#1a1f3a] cursor-pointer"
          />
          <span className="text-gray-300">Has Questions</span>
        </label>
      </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-linear-to-r from-[#00d9ff] to-[#6366f1] rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-[#00d9ff]/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Job"
          )}
        </button>
      </form>
    </div>
  )
}
