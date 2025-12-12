import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A"
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  } catch {
    return dateStr
  }
}

export function truncate(str: string, length: number): string {
  if (!str) return ""
  return str.length > length ? str.slice(0, length) + "..." : str
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    poster: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    spotlight: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    oral: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    rejected: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    withdrawn: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    desk_rejected: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
  return colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"
}

export function getConferenceColor(conference: string): string {
  const colors: Record<string, string> = {
    ICLR: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    ICML: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    NeurIPS: "bg-teal-500/20 text-teal-300 border-teal-500/30"
  }
  return colors[conference] || "bg-slate-500/20 text-slate-400 border-slate-500/30"
}

export function isAccepted(status: string): boolean {
  return ["poster", "spotlight", "oral"].includes(status)
}

