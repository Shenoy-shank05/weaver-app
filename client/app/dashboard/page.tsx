"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import PasteJobLink from "@/components/dashboard/paste-job-link"
import ManualInput from "@/components/dashboard/manual-input"
import PredictionHistory from "@/components/dashboard/prediction-history"
import FeatureContributionChart from "@/components/dashboard/feature-contribution-chart"

type TabType = "paste" | "manual" | "history" | "explanations"

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("paste")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "paste" && <PasteJobLink />}
      {activeTab === "manual" && <ManualInput />}
      {activeTab === "history" && <PredictionHistory />}
      {activeTab === "explanations" && <FeatureContributionChart />}
    </DashboardLayout>
  )
}
