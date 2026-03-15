"use client"

import Link from "next/link"
import { ArrowRight, Shield, Zap, BarChart3 } from "lucide-react"

import { useEffect, useState } from "react"

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in by looking for token in localStorage
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#1a0f2e] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-[#00d9ff]/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#6366f1] bg-clip-text text-transparent">
            WEAVER
          </div>
          <div className="flex gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#6366f1] hover:shadow-lg hover:shadow-[#00d9ff]/50 transition flex items-center gap-2"
              >
                Move to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-6 py-2 rounded-lg border border-[#00d9ff]/50 hover:bg-[#00d9ff]/10 transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#00d9ff] to-[#6366f1] hover:shadow-lg hover:shadow-[#00d9ff]/50 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-[#00d9ff] via-[#6366f1] to-[#00d9ff] bg-clip-text text-transparent">
            Protect Your Career
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            WEAVER uses advanced AI to detect fake job postings and protect job seekers from scams. Get instant
            verification with confidence scores for every job posting.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00d9ff] to-[#6366f1] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#00d9ff]/50 transition"
          >
            Get Started <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose WEAVER?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass p-8 rounded-xl border border-[#00d9ff]/20 hover:border-[#00d9ff]/50 transition">
              <Shield className="w-12 h-12 text-[#00d9ff] mb-4" />
              <h3 className="text-xl font-semibold mb-3">AI-Powered Detection</h3>
              <p className="text-gray-400">
                Our CatBoost machine learning model analyzes job postings with 95% accuracy to identify fraudulent
                listings.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass p-8 rounded-xl border border-[#00d9ff]/20 hover:border-[#00d9ff]/50 transition">
              <Zap className="w-12 h-12 text-[#6366f1] mb-4" />
              <h3 className="text-xl font-semibold mb-3">Instant Results</h3>
              <p className="text-gray-400">
                Get real-time predictions with confidence scores. Paste a link or enter job details manually.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass p-8 rounded-xl border border-[#00d9ff]/20 hover:border-[#00d9ff]/50 transition">
              <BarChart3 className="w-12 h-12 text-[#10b981] mb-4" />
              <h3 className="text-xl font-semibold mb-3">Track History</h3>
              <p className="text-gray-400">
                Keep a complete history of all predictions. Review past analyses and build your job search confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-[#00d9ff]/20">
        <div className="max-w-4xl mx-auto text-center glass p-12 rounded-xl border border-[#00d9ff]/30">
          <h2 className="text-3xl font-bold mb-4">Ready to Verify Job Postings?</h2>
          <p className="text-gray-300 mb-8">Join thousands of job seekers using WEAVER to stay safe and informed.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00d9ff] to-[#6366f1] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#00d9ff]/50 transition"
          >
            Start Verifying Now <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#00d9ff]/20 py-8 px-6 text-center text-gray-400">
        <p>&copy; 2025 WEAVER. Protecting job seekers worldwide.</p>
      </footer>
    </div>
  )
}
