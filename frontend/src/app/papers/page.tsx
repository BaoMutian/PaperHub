"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getPapers, type Paper } from "@/lib/api"
import { PaperCard } from "@/components/papers/paper-card"
import { PaperFilters } from "@/components/papers/paper-filters"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Loader2, ArrowUpDown, Star, MessageSquare, Calendar, BookOpen } from "lucide-react"

const SORT_OPTIONS = [
  { value: "", label: "默认排序", icon: Calendar },
  { value: "rating_desc", label: "评分 ↓", icon: Star },
  { value: "rating_asc", label: "评分 ↑", icon: Star },
  { value: "reviews_desc", label: "讨论度 ↓", icon: MessageSquare },
  { value: "reviews_asc", label: "讨论度 ↑", icon: MessageSquare },
]

function PapersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [papers, setPapers] = useState<Paper[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  
  const page = parseInt(searchParams.get("page") || "1")
  const pageSize = 12
  const conference = searchParams.get("conference") || ""
  const status = searchParams.get("status") || ""
  const keyword = searchParams.get("keyword") || ""
  const sortBy = searchParams.get("sort_by") || ""
  
  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    // Reset to page 1 when filters change (except for page itself)
    if (!("page" in updates)) {
      params.set("page", "1")
    }
    router.push(`/papers?${params.toString()}`)
  }, [router, searchParams])
  
  useEffect(() => {
    setLoading(true)
    getPapers({ page, page_size: pageSize, conference, status, keyword, sort_by: sortBy || undefined })
      .then((data) => {
        setPapers(data.papers)
        setTotal(data.total)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, conference, status, keyword, sortBy])
  
  const totalPages = Math.ceil(total / pageSize)
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-violet-400" />
            论文库
          </h1>
          <p className="text-white/50">
            浏览 ICLR、ICML、NeurIPS 2025 全部论文
          </p>
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <PaperFilters
            conference={conference}
            status={status}
            keyword={keyword}
            onConferenceChange={(v) => updateParams({ conference: v })}
            onStatusChange={(v) => updateParams({ status: v })}
            onKeywordChange={(v) => updateParams({ keyword: v })}
          />
        </div>
        
        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <ArrowUpDown className="w-4 h-4 text-white/40 flex-shrink-0" />
          <span className="text-sm text-white/40 flex-shrink-0">排序:</span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => updateParams({ sort_by: option.value })}
                  className={cn(
                    "h-8 px-3 text-xs whitespace-nowrap",
                    sortBy === option.value 
                      ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30" 
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <Icon className="w-3 h-3 mr-1.5" />
                  {option.label}
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Results info */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-white/50">
            共 {total.toLocaleString()} 篇论文
            {(conference || status || keyword) && " (已筛选)"}
          </div>
          <div className="text-sm text-white/50">
            第 {page} / {totalPages} 页
          </div>
        </div>
        
        {/* Papers Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-white/50">
            没有找到符合条件的论文
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: String(page - 1) })}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一页
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => updateParams({ page: String(pageNum) })}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams({ page: String(page + 1) })}
              disabled={page >= totalPages}
            >
              下一页
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PapersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    }>
      <PapersContent />
    </Suspense>
  )
}

