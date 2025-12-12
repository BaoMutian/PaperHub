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

export function PaperCard({ paper }: PaperCardProps) {
  return (
    <Link href={`/papers/${paper.id}`}>
      <Card className="group hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300 cursor-pointer h-full">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("border", getConferenceColor(paper.conference))}>
                {paper.conference}
              </Badge>
              <Badge className={cn("border", getStatusColor(paper.status))}>
                {paper.status}
              </Badge>
            </div>
            {paper.avg_rating && (
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-sm font-medium">{paper.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-white leading-snug mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
            {paper.title}
          </h3>
          
          {/* Authors */}
          <p className="text-sm text-white/50 mb-3 line-clamp-1">
            {paper.authors.slice(0, 4).join(", ")}
            {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
          </p>
          
          {/* Abstract */}
          <p className="text-sm text-white/60 mb-4 line-clamp-3">
            {truncate(paper.abstract, 200)}
          </p>
          
          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {paper.keywords.slice(0, 4).map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-0.5 text-xs bg-white/5 text-white/50 rounded-md"
                >
                  {keyword}
                </span>
              ))}
              {paper.keywords.length > 4 && (
                <span className="px-2 py-0.5 text-xs text-white/40">
                  +{paper.keywords.length - 4}
                </span>
              )}
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(paper.creation_date)}
            </div>
            <div className="flex items-center gap-2">
              {paper.pdf_link && (
                <span className="flex items-center gap-1 text-violet-400">
                  <ExternalLink className="w-3 h-3" />
                  PDF
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

