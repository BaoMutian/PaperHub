"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface PaperFiltersProps {
  conference: string
  status: string
  keyword: string
  onConferenceChange: (value: string) => void
  onStatusChange: (value: string) => void
  onKeywordChange: (value: string) => void
}

const conferences = [
  { value: "", label: "全部会议" },
  { value: "ICLR", label: "ICLR" },
  { value: "ICML", label: "ICML" },
  { value: "NeurIPS", label: "NeurIPS" }
]

const statuses = [
  { value: "", label: "全部状态" },
  { value: "poster", label: "Poster" },
  { value: "spotlight", label: "Spotlight" },
  { value: "oral", label: "Oral" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" }
]

export function PaperFilters({
  conference,
  status,
  keyword,
  onConferenceChange,
  onStatusChange,
  onKeywordChange
}: PaperFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="搜索关键词..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          className="pl-10"
        />
        {keyword && (
          <button
            onClick={() => onKeywordChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Conference Filter */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        {conferences.map((conf) => (
          <Button
            key={conf.value}
            variant="ghost"
            size="sm"
            onClick={() => onConferenceChange(conf.value)}
            className={cn(
              "px-3 h-8",
              conference === conf.value && "bg-white/10 text-white"
            )}
          >
            {conf.label}
          </Button>
        ))}
      </div>
      
      {/* Status Filter */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg overflow-x-auto">
        {statuses.map((s) => (
          <Button
            key={s.value}
            variant="ghost"
            size="sm"
            onClick={() => onStatusChange(s.value)}
            className={cn(
              "px-3 h-8 whitespace-nowrap",
              status === s.value && "bg-white/10 text-white"
            )}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

