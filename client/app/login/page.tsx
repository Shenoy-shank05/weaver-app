"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Eye, EyeOff, LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, { email, password })

      localStorage.setItem("token", response.data.token)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#1a0f2e] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-3xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#6366f1] bg-clip-text text-transparent mb-4"
          >
            WEAVER
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 mt-2">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="glass p-8 rounded-xl border border-[#00d9ff]/20 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">{error}</div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-[#00d9ff]/30 rounded-lg text-white placeholder-gray-500 focus:border-[#00d9ff] focus:outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-[#00d9ff] transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#00d9ff] to-[#6366f1] rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-[#00d9ff]/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link href="/signup" className="text-[#00d9ff] hover:text-[#6366f1] transition font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
