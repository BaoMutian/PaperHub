"use client"

import { Trophy, Zap, Pin, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusConfig {
  icon: LucideIcon
  label: string
  gradient: string
  border: string
  bg: string
  textColor: string
  iconColor: string
}

const statusConfigs: Record<string, StatusConfig> = {
  oral: {
    icon: Trophy,
    label: "Oral",
    gradient: "from-amber-400 via-yellow-400 to-amber-500",
    border: "border-amber-400/50",
    bg: "bg-gradient-to-br from-amber-500/20 to-yellow-500/20",
    textColor: "text-amber-300",
    iconColor: "text-amber-400"
  },
  spotlight: {
    icon: Zap,
    label: "Spotlight",
    gradient: "from-violet-400 via-purple-400 to-fuchsia-500",
    border: "border-violet-400/50",
    bg: "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20",
    textColor: "text-violet-300",
    iconColor: "text-violet-400"
  },
  poster: {
    icon: Pin,
    label: "Poster",
    gradient: "from-blue-400 via-cyan-400 to-teal-500",
    border: "border-blue-400/50",
    bg: "bg-gradient-to-br from-blue-500/20 to-teal-500/20",
    textColor: "text-blue-300",
    iconColor: "text-blue-400"
  }
}

interface StatusBadgeProps {
  status: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StatusBadge({ 
  status, 
  size = "md", 
  className 
}: StatusBadgeProps) {
  const config = statusConfigs[status]
  if (!config) return null
  
  const Icon = config.icon
  
  const sizeClasses = {
    sm: {
      wrapper: "gap-1.5 px-2 py-0.5",
      iconWrapper: "p-0.5 rounded",
      icon: "w-3 h-3",
      label: "text-xs font-semibold",
    },
    md: {
      wrapper: "gap-2.5 px-3 py-1.5",
      iconWrapper: "p-1 rounded-md",
      icon: "w-4 h-4",
      label: "text-sm font-bold",
    },
    lg: {
      wrapper: "gap-3 px-4 py-2",
      iconWrapper: "p-1.5 rounded-lg",
      icon: "w-5 h-5",
      label: "text-base font-bold",
    }
  }
  
  const sizes = sizeClasses[size]
  
  return (
    <div className={cn(
      "inline-flex items-center rounded-lg border backdrop-blur-sm transition-all hover:brightness-110",
      sizes.wrapper,
      config.border, 
      config.bg,
      className
    )}>
      <div className={cn("bg-gradient-to-br shadow-sm", sizes.iconWrapper, config.gradient)}>
        <Icon className={cn(sizes.icon, "text-white")} />
      </div>
      <span className={cn(sizes.label, config.textColor)}>{config.label}</span>
    </div>
  )
}

// 检查是否是接受状态（可以显示徽章）
export function isAcceptedStatus(status: string): boolean {
  return ['oral', 'spotlight', 'poster'].includes(status)
}

export { statusConfigs }
