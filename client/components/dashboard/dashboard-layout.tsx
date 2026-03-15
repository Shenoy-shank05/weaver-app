"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu, X, LogOut } from "lucide-react"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: any) => void
}

export default function DashboardLayout({ children, activeTab, setActiveTab }: DashboardLayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const tabs = [
    { id: "paste", label: "Paste Job Link" },
    { id: "manual", label: "Manual Input" },
    { id: "history", label: "Prediction History" },
  ] // Removed Explanations tab

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0e27] via-[#1a1f3a] to-[#1a0f2e] text-white">
      {/* Header */}
      <header className="glass border-b border-[#00d9ff]/20 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-[#00d9ff]/10 rounded-lg transition"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link
              href="/"
              className="text-2xl font-bold bg-linear-to-r from-[#00d9ff] to-[#6366f1] bg-clip-text text-transparent"
            >
              WEAVER
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? "w-64" : "w-0"} lg:w-64 glass border-r border-[#00d9ff]/20 transition-all duration-300 overflow-hidden`}
        >
          <nav className="p-6 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSidebarOpen(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? "bg-linear-to-r from-[#00d9ff] to-[#6366f1] text-white"
                    : "hover:bg-[#00d9ff]/10 text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="w-full max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
