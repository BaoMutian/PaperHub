"use client"

import { Trophy, Zap, Pin, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusConfig {
  icon: LucideIcon
  label: string
  subtitle: string
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
    subtitle: "口头报告",
    gradient: "from-amber-400 via-yellow-400 to-amber-500",
    border: "border-amber-400/50",
    bg: "bg-gradient-to-br from-amber-500/20 to-yellow-500/20",
    textColor: "text-amber-300",
    iconColor: "text-amber-400"
  },
  spotlight: {
    icon: Zap,
    label: "Spotlight",
    subtitle: "聚光灯",
    gradient: "from-violet-400 via-purple-400 to-fuchsia-500",
    border: "border-violet-400/50",
    bg: "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20",
    textColor: "text-violet-300",
    iconColor: "text-violet-400"
  },
  poster: {
    icon: Pin,
    label: "Poster",
    subtitle: "海报展示",
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
  showSubtitle?: boolean
  className?: string
}

export function StatusBadge({ 
  status, 
  size = "md", 
  showSubtitle = true,
  className 
}: StatusBadgeProps) {
  const config = statusConfigs[status]
  if (!config) return null
  
  const Icon = config.icon
  
  const sizeClasses = {
    sm: {
      wrapper: "gap-2 px-2.5 py-1",
      iconWrapper: "p-1",
      icon: "w-3 h-3",
      label: "text-xs",
      subtitle: "text-[8px]"
    },
    md: {
      wrapper: "gap-3 px-4 py-2",
      iconWrapper: "p-1.5",
      icon: "w-4 h-4",
      label: "text-sm",
      subtitle: "text-[10px]"
    },
    lg: {
      wrapper: "gap-4 px-5 py-3",
      iconWrapper: "p-2",
      icon: "w-5 h-5",
      label: "text-base",
      subtitle: "text-xs"
    }
  }
  
  const sizes = sizeClasses[size]
  
  return (
    <div className={cn(
      "inline-flex items-center rounded-xl border backdrop-blur-sm",
      sizes.wrapper,
      config.border, 
      config.bg,
      className
    )}>
      <div className={cn("rounded-lg bg-gradient-to-br", sizes.iconWrapper, config.gradient)}>
        <Icon className={cn(sizes.icon, "text-white drop-shadow-sm")} />
      </div>
      <div className="flex flex-col">
        <span className={cn("font-bold", sizes.label, config.textColor)}>{config.label}</span>
        {showSubtitle && (
          <span className={cn("text-white/40 -mt-0.5", sizes.subtitle)}>{config.subtitle}</span>
        )}
      </div>
    </div>
  )
}

// 检查是否是接受状态（可以显示徽章）
export function isAcceptedStatus(status: string): boolean {
  return ['oral', 'spotlight', 'poster'].includes(status)
}

export { statusConfigs }

