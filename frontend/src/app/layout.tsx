import type { Metadata } from "next"
import { Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-sans"
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
})

export const metadata: Metadata = {
  title: "PaperHub - AI Conference Papers",
  description: "探索 ICLR、ICML、NeurIPS 2025 顶会论文，智能问答与知识图谱可视化"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased bg-black text-white min-h-screen`}>
        {/* Background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        </div>
        
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
