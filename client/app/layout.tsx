import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WEAVER - Detect Fake Job Postings",
  description: "Web Extraction & AI Verification for Employment Reliability",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.className} bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#1a0f2e]`}>
        {children}
      </body>
    </html>
  )
}
