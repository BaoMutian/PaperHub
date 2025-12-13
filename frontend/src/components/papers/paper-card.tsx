"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, truncate, getStatusColor, getConferenceColor, formatDate } from "@/lib/utils"
import type { Paper } from "@/lib/api"
import { Star, Calendar, ExternalLink } from "lucide-react"

interface PaperCardProps {
  paper: Paper
}

// 获取会议的满分
function getMaxRating(conference: string): number {
  switch (conference?.toUpperCase()) {
    case "ICLR":
      return 10
    case "ICML":
      return 5
    case "NEURIPS":
      return 6
    default:
      return 10
  }
}

export function PaperCard({ paper }: PaperCardProps) {
  const maxRating = getMaxRating(paper.conference)
  
  // 根据评分计算颜色 (复用详情页逻辑)
  const getRatingColor = (rating: number) => {
    const normalized = (rating - 1) / (maxRating - 1)
    if (normalized >= 0.7) return "text-emerald-400"
    if (normalized >= 0.5) return "text-amber-400"
    if (normalized >= 0.3) return "text-orange-400"
    return "text-rose-400"
  }
  
  const getRatingBg = (rating: number) => {
    const normalized = (rating - 1) / (maxRating - 1)
    if (normalized >= 0.7) return "bg-emerald-500/10 border-emerald-500/20"
    if (normalized >= 0.5) return "bg-amber-500/10 border-amber-500/20"
    if (normalized >= 0.3) return "bg-orange-500/10 border-orange-500/20"
    return "bg-rose-500/10 border-rose-500/20"
  }
  
  return (
    <Link href={`/papers/${paper.id}`}>
      <Card className="group hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer h-full border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden flex flex-col">
        <CardContent className="p-5 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("border bg-white/5 hover:bg-white/10", getConferenceColor(paper.conference))}>
                {paper.conference}
              </Badge>
              <Badge className={cn("border bg-white/5 hover:bg-white/10", getStatusColor(paper.status))}>
                {paper.status}
              </Badge>
            </div>
            {paper.avg_rating && (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold border",
                getRatingBg(paper.avg_rating),
                getRatingColor(paper.avg_rating)
              )}>
                {paper.avg_rating.toFixed(1)}
                <span className="opacity-50 font-normal">/{maxRating}</span>
              </div>
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-bold text-white leading-snug mb-2 group-hover:text-violet-300 transition-colors line-clamp-2 text-lg">
            {paper.title}
          </h3>
          
          {/* Authors */}
          <p className="text-sm text-white/50 mb-4 line-clamp-1">
            {paper.authors.slice(0, 3).join(", ")}
            {paper.authors.length > 3 && <span className="opacity-50 ml-1">+{paper.authors.length - 3}</span>}
          </p>
          
          {/* Abstract */}
          <p className="text-sm text-white/60 mb-4 line-clamp-3 leading-relaxed flex-1">
            {truncate(paper.abstract, 180)}
          </p>
          
          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {paper.keywords.slice(0, 3).map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/5 text-white/50 rounded-full group-hover:border-white/10 transition-colors"
                >
                  {keyword}
                </span>
              ))}
              {paper.keywords.length > 3 && (
                <span className="px-2 py-0.5 text-[10px] text-white/30">
                  +{paper.keywords.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>
        
        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDate(paper.creation_date)}
          </div>
          {paper.pdf_link && (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400">
              PDF <ExternalLink className="w-3 h-3" />
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}

