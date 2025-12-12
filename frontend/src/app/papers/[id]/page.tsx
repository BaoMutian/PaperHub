"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { getPaper, getReviewSummary, type PaperDetail, type ReviewSummary } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, getStatusColor, getConferenceColor, formatDate } from "@/lib/utils"
import { 
  ArrowLeft, ExternalLink, FileText, Calendar, Star, 
  Users, MessageSquare, ThumbsUp, ThumbsDown, HelpCircle,
  Sparkles, Loader2, ChevronDown, ChevronUp
} from "lucide-react"

export default function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [paper, setPaper] = useState<PaperDetail | null>(null)
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    getPaper(id)
      .then(setPaper)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])
  
  const loadSummary = async () => {
    setSummaryLoading(true)
    try {
      const result = await getReviewSummary(id)
      setSummary(result)
    } catch (error) {
      console.error(error)
    } finally {
      setSummaryLoading(false)
    }
  }
  
  const toggleReview = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev)
      if (next.has(reviewId)) {
        next.delete(reviewId)
      } else {
        next.add(reviewId)
      }
      return next
    })
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }
  
  if (!paper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/50">论文不存在</p>
        <Link href="/papers">
          <Button variant="outline">返回论文列表</Button>
        </Link>
      </div>
    )
  }
  
  const officialReviews = paper.reviews.filter((r) => r.review_type === "official_review")
  const otherReviews = paper.reviews.filter((r) => r.review_type !== "official_review")
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <Link href="/papers" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回论文列表
        </Link>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className={cn("border", getConferenceColor(paper.conference))}>
              {paper.conference} 2025
            </Badge>
            <Badge className={cn("border", getStatusColor(paper.status))}>
              {paper.status}
            </Badge>
            {paper.primary_area && (
              <Badge variant="outline">{paper.primary_area}</Badge>
            )}
          </div>
          
          <h1 className="text-3xl font-bold mb-4 leading-tight">{paper.title}</h1>
          
          {/* Authors */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-white/40" />
            {paper.authors.map((author, i) => (
              <span key={i}>
                <Link 
                  href={`/authors/${encodeURIComponent(paper.authorids?.[i] || author)}`}
                  className="text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {author}
                </Link>
                {i < paper.authors.length - 1 && <span className="text-white/30">,</span>}
              </span>
            ))}
          </div>
          
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(paper.creation_date)}
            </div>
            {paper.avg_rating && (
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                {paper.avg_rating.toFixed(1)}
              </div>
            )}
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {paper.review_count} 评审
            </div>
          </div>
          
          {/* Links */}
          <div className="flex flex-wrap gap-3 mt-6">
            {paper.forum_link && (
              <a href={paper.forum_link} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  OpenReview
                </Button>
              </a>
            )}
            {paper.pdf_link && (
              <a href={paper.pdf_link} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </a>
            )}
          </div>
        </div>
        
        {/* TLDR */}
        {paper.tldr && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-violet-400 mb-1">TL;DR</div>
              <p className="text-white/80">{paper.tldr}</p>
            </CardContent>
          </Card>
        )}
        
        {/* Abstract */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
              {paper.abstract}
            </p>
          </CardContent>
        </Card>
        
        {/* Keywords */}
        {paper.keywords && paper.keywords.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>关键词</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {paper.keywords.map((keyword) => (
                  <Link key={keyword} href={`/papers?keyword=${encodeURIComponent(keyword)}`}>
                    <Badge variant="secondary" className="hover:bg-white/20 cursor-pointer transition-colors">
                      {keyword}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* AI Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                AI 评审总结
              </CardTitle>
              {!summary && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={loadSummary}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    "生成总结"
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/50">整体评价：</span>
                  <Badge className={cn(
                    summary.overall_sentiment === "positive" ? "bg-emerald-500/20 text-emerald-300" :
                    summary.overall_sentiment === "negative" ? "bg-rose-500/20 text-rose-300" :
                    "bg-amber-500/20 text-amber-300"
                  )}>
                    {summary.overall_sentiment === "positive" ? "正面" :
                     summary.overall_sentiment === "negative" ? "负面" : "中立"}
                  </Badge>
                </div>
                
                {summary.main_strengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400 mb-2">
                      <ThumbsUp className="w-4 h-4" />
                      主要优点
                    </div>
                    <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                      {summary.main_strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                
                {summary.main_weaknesses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-rose-400 mb-2">
                      <ThumbsDown className="w-4 h-4" />
                      主要缺点
                    </div>
                    <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                      {summary.main_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                
                {summary.key_questions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
                      <HelpCircle className="w-4 h-4" />
                      关键问题
                    </div>
                    <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                      {summary.key_questions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                
                {summary.summary_text && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-white/60">{summary.summary_text}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/40">
                点击"生成总结"按钮，AI 将分析所有评审意见并生成简明总结
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Reviews */}
        {officialReviews.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>评审意见 ({officialReviews.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {officialReviews.map((review) => {
                const isExpanded = expandedReviews.has(review.id)
                return (
                  <div 
                    key={review.id} 
                    className="p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleReview(review.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white/50">
                          Reviewer {review.number || "?"}
                        </span>
                        {review.rating && (
                          <Badge className="bg-violet-500/20 text-violet-300">
                            评分: {review.rating}
                          </Badge>
                        )}
                        {review.confidence && (
                          <Badge variant="outline" className="text-white/50">
                            置信度: {review.confidence}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">
                          {formatDate(review.cdate)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-white/40" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/40" />
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 space-y-4 text-sm">
                        {review.summary && (
                          <div>
                            <div className="font-medium text-white/70 mb-1">Summary</div>
                            <p className="text-white/60 whitespace-pre-wrap">{review.summary}</p>
                          </div>
                        )}
                        {review.strengths && (
                          <div>
                            <div className="font-medium text-emerald-400 mb-1">Strengths</div>
                            <p className="text-white/60 whitespace-pre-wrap">{review.strengths}</p>
                          </div>
                        )}
                        {review.weaknesses && (
                          <div>
                            <div className="font-medium text-rose-400 mb-1">Weaknesses</div>
                            <p className="text-white/60 whitespace-pre-wrap">{review.weaknesses}</p>
                          </div>
                        )}
                        {review.questions && (
                          <div>
                            <div className="font-medium text-amber-400 mb-1">Questions</div>
                            <p className="text-white/60 whitespace-pre-wrap">{review.questions}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
        
        {/* Other interactions */}
        {otherReviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>其他互动 ({otherReviews.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {otherReviews.slice(0, 10).map((review) => (
                <div 
                  key={review.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {review.review_type}
                    </Badge>
                    <span className="text-xs text-white/40">
                      {formatDate(review.cdate)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-white/60 line-clamp-3">
                      {review.comment}
                    </p>
                  )}
                  {review.decision && (
                    <p className="text-sm text-violet-400">
                      Decision: {review.decision}
                    </p>
                  )}
                </div>
              ))}
              {otherReviews.length > 10 && (
                <p className="text-sm text-white/40 text-center">
                  还有 {otherReviews.length - 10} 条互动记录
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

