"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Globe,
  HelpCircle,
  Mail,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import ContributingFactors from "./contributing-factors"

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
    llm_fraud_score?: number
    contributingFactors?: { feature: string; shap_value: number }[]
    company_verification?: {
      email_consistency?: {
        status: string
        score: number
        risk_level: string
        summary: string
        matched_domains: string[]
        mismatched_domains: string[]
        email_domains: string[]
        reference_domains: string[]
      }
      domain_age?: {
        status: string
        score: number
        risk_level: string
        summary: string
        checked_domain: string | null
        created_at: string | null
        age_days: number | null
        age_years: number | null
        lookup_source: string
        lookup_error: string | null
      }
      registration_check?: {
        status: string
        score: number
        risk_level: string
        summary: string
        company_name: string | null
        sources: {
          mca: {
            status: string
            score: number
            risk_level: string
            summary: string
            company_name: string | null
            identifier_type: string | null
            identifier_value: string | null
            source: string
            lookup_available: boolean
          }
          explorium: {
            status: string
            score: number
            risk_level: string
            summary: string
            company_name: string | null
            matched_name: string | null
            matched_domain: string | null
            business_id: string | null
            linkedin_profile: string | null
            industry: string | null
            employee_range: string | null
            revenue_range: string | null
            country: string | null
            source: string
            lookup_available: boolean
          }
        }
      }
    }
  }
  onReset: () => void
}

type RiskLevel = "Low" | "Medium" | "High" | "Unknown"

function riskBadgeClasses(level?: string) {
  switch (level) {
    case "Low":
      return "text-green-300 bg-green-500/10 border border-green-500/20"
    case "High":
      return "text-red-300 bg-red-500/10 border border-red-500/20"
    case "Medium":
      return "text-yellow-300 bg-yellow-500/10 border border-yellow-500/20"
    default:
      return "text-slate-300 bg-slate-500/10 border border-slate-500/20"
  }
}

function scoreTone(score: number) {
  if (score >= 70) return "text-red-300"
  if (score >= 40) return "text-yellow-300"
  return "text-green-300"
}

function Card({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#00d9ff]/15 bg-[#11172d] p-6 shadow-lg shadow-black/10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
        </div>
        {badge ? <span className="rounded-full border border-[#00d9ff]/20 bg-[#00d9ff]/10 px-3 py-1 text-xs font-medium text-[#9be7ff]">{badge}</span> : null}
      </div>
      {children}
    </div>
  )
}

export default function PredictionResult({ prediction, onReset }: PredictionResultProps) {
  const [activeTab, setActiveTab] = useState<"job" | "company">("job")
  const isFake = prediction.prediction === 1
  const confidence = prediction.predicted_class_confidence_pct
  const emailConsistency = prediction.company_verification?.email_consistency
  const domainAge = prediction.company_verification?.domain_age
  const registrationCheck = prediction.company_verification?.registration_check

  const companyScore = useMemo(() => {
    const scores = [emailConsistency?.score, domainAge?.score, registrationCheck?.score].filter(
      (value): value is number => typeof value === "number",
    )
    if (!scores.length) return null
    return scores.reduce((sum, value) => sum + value, 0) / scores.length
  }, [domainAge?.score, emailConsistency?.score, registrationCheck?.score])

  let resultColor = "text-yellow-400"
  let resultBg = "bg-yellow-500/20"
  let resultBorder = "border-yellow-500/50"
  let resultIcon = HelpCircle

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
      <div className={`glass rounded-3xl border ${resultBorder} ${resultBg} p-8`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-4 ${resultBg} ${resultBorder} border`}>
              <Icon className={`h-10 w-10 ${resultColor}`} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Overall Job Verdict</p>
              <h2 className={`mt-2 text-3xl font-bold ${resultColor}`}>{prediction.fraud_confidence_label || prediction.result}</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-300">{prediction.confidence_message}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-[#11172d] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Decision</p>
              <p className="mt-2 text-xl font-semibold text-white">{prediction.result}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#11172d] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Job Risk Score</p>
              <p className={`mt-2 text-xl font-semibold ${scoreTone(prediction.confidence_percentage)}`}>{prediction.confidence_percentage.toFixed(2)}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#11172d] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Company Risk Score</p>
              <p className={`mt-2 text-xl font-semibold ${scoreTone(companyScore ?? 50)}`}>{companyScore !== null ? `${companyScore.toFixed(2)}%` : "N/A"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 rounded-2xl border border-[#00d9ff]/15 bg-[#0c1227] p-2">
          <button
            onClick={() => setActiveTab("job")}
            className={`rounded-xl px-5 py-3 text-sm font-medium transition ${
              activeTab === "job" ? "bg-linear-to-r from-[#00d9ff] to-[#6366f1] text-white shadow-lg" : "text-gray-300 hover:bg-white/5"
            }`}
          >
            Job Description Analysis
          </button>
          <button
            onClick={() => setActiveTab("company")}
            className={`rounded-xl px-5 py-3 text-sm font-medium transition ${
              activeTab === "company" ? "bg-linear-to-r from-[#00d9ff] to-[#6366f1] text-white shadow-lg" : "text-gray-300 hover:bg-white/5"
            }`}
          >
            Company Background Verification
          </button>
        </div>
      </div>

      {activeTab === "job" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Job Description Confidence" subtitle="This section combines the CatBoost job model with the LLM fraud check.">
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Predicted Class Confidence</span>
                  <span className="font-semibold text-white">{prediction.predicted_class_confidence_pct.toFixed(2)}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full border border-[#00d9ff]/20 bg-[#1a1f3a]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      confidence >= 70 ? (!isFake ? "bg-linear-to-r from-green-500 to-emerald-400" : "bg-linear-to-r from-red-500 to-rose-400") : "bg-linear-to-r from-yellow-500 to-amber-400"
                    }`}
                    style={{ width: `${prediction.predicted_class_confidence_pct}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Model Label</p>
                  <p className="mt-2 text-lg font-semibold text-white">{prediction.fraud_confidence_label || "Unknown"}</p>
                </div>
                <div className="rounded-2xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">CatBoost + LLM Risk</p>
                  <p className={`mt-2 text-lg font-semibold ${scoreTone(prediction.confidence_percentage)}`}>{prediction.confidence_percentage.toFixed(2)}%</p>
                </div>
                <div className="rounded-2xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">LLM Fraud Score</p>
                  <p className={`mt-2 text-lg font-semibold ${scoreTone(prediction.llm_fraud_score ?? 0)}`}>{prediction.llm_fraud_score !== undefined ? `${prediction.llm_fraud_score.toFixed(2)}%` : "Not used"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-5 text-sm text-gray-300">
                <p className="font-medium text-white">Interpretation</p>
                <p className="mt-2">{prediction.confidence_message || "Review the extracted job details and the feature explanation before making a decision."}</p>
              </div>
            </div>
          </Card>

          <Card title="Quick Insights" subtitle="High-level takeaways from the authenticity engine." badge="Job Signals">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#00d9ff]" />
                  <p className="font-medium text-white">Decision Summary</p>
                </div>
                <p className="mt-3 text-sm text-gray-300">{prediction.result === "Fake Job" ? "The posting carries enough risk signals that the combined model classifies it as fake." : "The posting looks comparatively legitimate based on the combined job-content model."}</p>
              </div>
              <div className="rounded-2xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#00d9ff]" />
                  <p className="font-medium text-white">What To Review</p>
                </div>
                <p className="mt-3 text-sm text-gray-300">Use the SHAP chart to see which job fields influenced the CatBoost prediction the most, then compare that with the company verification tab.</p>
              </div>
            </div>
          </Card>

          <div className="xl:col-span-2">
            <Card title="SHAP Feature Contributions" subtitle="These are the strongest CatBoost feature contributions for the job description model.">
              {prediction.contributingFactors && prediction.contributingFactors.length > 0 ? (
                <ContributingFactors factors={prediction.contributingFactors} />
              ) : (
                <div className="rounded-2xl border border-dashed border-[#00d9ff]/20 bg-[#1a1f3a] p-10 text-center text-sm text-gray-400">
                  SHAP factors are not available for this prediction.
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card
            title="Email Consistency"
            subtitle={emailConsistency?.summary || "No recruiter email or website domain could be evaluated."}
            badge={emailConsistency ? `${emailConsistency.risk_level} Risk` : "Unavailable"}
          >
            <div className="space-y-4 text-sm">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${riskBadgeClasses(emailConsistency?.risk_level)}`}>
                {emailConsistency?.risk_level || "Unknown"}
              </span>
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <div className="mb-2 flex items-center gap-2 text-white"><Mail className="h-4 w-4 text-[#00d9ff]" />Detected Email Domains</div>
                  <p className="break-words text-gray-300">{emailConsistency?.email_domains?.length ? emailConsistency.email_domains.join(", ") : "Not found"}</p>
                </div>
                <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <p className="mb-2 text-white">Reference Domains</p>
                  <p className="break-words text-gray-300">{emailConsistency?.reference_domains?.length ? emailConsistency.reference_domains.join(", ") : "Not found"}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Domain Age Analysis"
            subtitle={domainAge?.summary || "Domain age evidence is not available."}
            badge={domainAge ? `${domainAge.risk_level} Risk` : "Unavailable"}
          >
            <div className="space-y-4 text-sm">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${riskBadgeClasses(domainAge?.risk_level)}`}>
                {domainAge?.risk_level || "Unknown"}
              </span>
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <div className="mb-2 flex items-center gap-2 text-white"><Globe className="h-4 w-4 text-[#00d9ff]" />Checked Domain</div>
                  <p className="break-words text-gray-300">{domainAge?.checked_domain || "Not found"}</p>
                </div>
                <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                  <p className="mb-2 text-white">Registration History</p>
                  <p className="text-gray-300">{domainAge?.age_years !== null && domainAge?.age_years !== undefined ? `${domainAge.age_years} years (${domainAge.age_days} days)` : "Unavailable"}</p>
                  <p className="mt-2 text-gray-400">Registered on: {domainAge?.created_at ? new Date(domainAge.created_at).toLocaleDateString() : "Unavailable"}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Registration Check"
            subtitle={registrationCheck?.summary || "Registry-related checks are not available."}
            badge={registrationCheck ? `${registrationCheck.risk_level} Risk` : "Unavailable"}
          >
            <div className="space-y-4 text-sm">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${riskBadgeClasses(registrationCheck?.risk_level as RiskLevel | undefined)}`}>
                {registrationCheck?.risk_level || "Unknown"}
              </span>
              <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                <div className="mb-2 flex items-center gap-2 text-white"><Building2 className="h-4 w-4 text-[#00d9ff]" />Company Used</div>
                <p className="break-words text-gray-300">{registrationCheck?.company_name || "Not available"}</p>
              </div>
              <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                <p className="font-medium text-white">MCA Signal</p>
                <p className="mt-2 text-gray-300">{registrationCheck?.sources.mca.summary || "No MCA evidence"}</p>
                <p className="mt-2 text-gray-400">Identifier: {registrationCheck?.sources.mca.identifier_value || "Not found"}</p>
              </div>
              <div className="rounded-xl border border-[#00d9ff]/10 bg-[#1a1f3a] p-4">
                <p className="font-medium text-white">Explorium Signal</p>
                <p className="mt-2 text-gray-300">{registrationCheck?.sources.explorium.summary || "No Explorium evidence"}</p>
                <p className="mt-2 text-gray-400">Match: {registrationCheck?.sources.explorium.matched_name || "Not found"}</p>
                <p className="mt-1 text-gray-400">Domain: {registrationCheck?.sources.explorium.matched_domain || "Not found"}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-[#00d9ff]/30 bg-[#1a1f3a] py-3 font-semibold text-white transition hover:bg-[#252d4a]"
      >
        <span className="flex items-center justify-center gap-2">
          <RotateCcw size={20} />
          Analyze Another Job
        </span>
      </button>
    </div>
  )
}
