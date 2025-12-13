"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Search, Home, Users, Network, MessageSquare, BarChart3 } from "lucide-react"

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/papers", label: "论文", icon: Search },
  { href: "/authors", label: "作者", icon: Users },
  { href: "/network", label: "协作网络", icon: Network },
  { href: "/qa", label: "智能问答", icon: MessageSquare },
  { href: "/stats", label: "统计", icon: BarChart3 }
]

export function Navbar() {
  const pathname = usePathname()
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="PaperHub"
              width={180}
              height={40}
              className="h-10 w-auto group-hover:opacity-90 transition-opacity"
              priority
            />
            <div className="hidden lg:block pl-2 border-l border-white/10">
              <div className="text-xs text-white/50 font-medium">你的AI学术豆瓣</div>
            </div>
          </Link>
          
          {/* Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/" && pathname.startsWith(item.href))
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-white/10 text-white" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

