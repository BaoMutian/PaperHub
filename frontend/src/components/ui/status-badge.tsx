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
  glow: string
}

const statusConfigs: Record<string, StatusConfig> = {
  oral: {
    icon: Trophy,
    label: "Oral",
    gradient: "from-amber-400 via-yellow-400 to-amber-500",
    border: "border-amber-400/60",
    bg: "bg-gradient-to-r from-amber-500/25 to-yellow-500/25",
    textColor: "text-amber-200",
    glow: "shadow-amber-500/20"
  },
  spotlight: {
    icon: Zap,
    label: "Spotlight",
    gradient: "from-violet-400 via-purple-400 to-fuchsia-500",
    border: "border-violet-400/60",
    bg: "bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25",
    textColor: "text-violet-200",
    glow: "shadow-violet-500/20"
  },
  poster: {
    icon: Pin,
    label: "Poster",
    gradient: "from-sky-400 via-cyan-400 to-teal-500",
    border: "border-sky-400/60",
    bg: "bg-gradient-to-r from-sky-500/25 to-teal-500/25",
    textColor: "text-sky-200",
    glow: "shadow-sky-500/20"
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
      iconWrapper: "p-0.5",
      icon: "w-3 h-3",
      label: "text-[10px]"
    },
    md: {
      wrapper: "gap-2 px-3 py-1",
      iconWrapper: "p-1",
      icon: "w-3.5 h-3.5",
      label: "text-xs"
    },
    lg: {
      wrapper: "gap-2.5 px-4 py-1.5",
      iconWrapper: "p-1.5",
      icon: "w-4 h-4",
      label: "text-sm"
    }
  }
  
  const sizes = sizeClasses[size]
  
  return (
    <div className={cn(
      "inline-flex items-center rounded-full border backdrop-blur-sm shadow-lg",
      sizes.wrapper,
      config.border, 
      config.bg,
      config.glow,
      className
    )}>
      <div className={cn("rounded-full bg-gradient-to-br", sizes.iconWrapper, config.gradient)}>
        <Icon className={cn(sizes.icon, "text-white drop-shadow-sm")} />
      </div>
      <span className={cn("font-bold tracking-wide", sizes.label, config.textColor)}>
        {config.label}
      </span>
    </div>
  )
}

// Check if status is accepted (can show badge)
export function isAcceptedStatus(status: string): boolean {
  return ['oral', 'spotlight', 'poster'].includes(status)
}

export { statusConfigs }
