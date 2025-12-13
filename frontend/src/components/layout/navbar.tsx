"use client"

import Link from "next/link"
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
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              AI
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-white tracking-tight">PaperHub</div>
              <div className="text-[12px] text-white/50 -mt-0.5">你的AI学术豆瓣</div>
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

