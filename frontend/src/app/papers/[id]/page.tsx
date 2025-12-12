"use client"

import { useEffect, useState, use, useMemo } from "react"
import Link from "next/link"
import { getPaper, getReviewSummary, type PaperDetail, type ReviewSummary, type Review } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/ui/markdown"
import { cn, getStatusColor, getConferenceColor, formatDate } from "@/lib/utils"
import { 
  ArrowLeft, ExternalLink, FileText, Calendar, Star, 
  Users, MessageSquare, ThumbsUp, ThumbsDown, HelpCircle,
  Sparkles, Loader2, ChevronDown, ChevronUp, Reply, User,
  MessageCircle, CheckCircle, AlertCircle
} from "lucide-react"

// 构建评论树结构
interface ReviewThread extends Review {
  replies: ReviewThread[]
  depth: number
}

function buildReviewTree(reviews: Review[]): ReviewThread[] {
  const reviewMap = new Map<string, ReviewThread>()
  const rootReviews: ReviewThread[] = []
  
  // 初始化所有评论
  reviews.forEach(review => {
    reviewMap.set(review.id, { ...review, replies: [], depth: 0 })
  })
  
  // 构建树结构
  reviews.forEach(review => {
    const threadReview = reviewMap.get(review.id)!
    if (review.replyto && reviewMap.has(review.replyto)) {
      const parent = reviewMap.get(review.replyto)!
      threadReview.depth = parent.depth + 1
      parent.replies.push(threadReview)
    } else {
      rootReviews.push(threadReview)
    }
  })
  
  // 按时间排序
  const sortByDate = (a: ReviewThread, b: ReviewThread) => {
    return (a.cdate || 0) - (b.cdate || 0)
  }
  
  const sortReplies = (reviews: ReviewThread[]) => {
    reviews.sort(sortByDate)
    reviews.forEach(r => sortReplies(r.replies))
  }
  
  sortReplies(rootReviews)
  
  return rootReviews
}

// 获取评论类型的显示信息
function getReviewTypeInfo(type: string) {
  switch (type) {
    case "official_review":
      return { label: "官方评审", color: "text-violet-400", icon: Star }
    case "rebuttal":
      return { label: "作者回复", color: "text-emerald-400", icon: Reply }
    case "decision":
      return { label: "决定", color: "text-amber-400", icon: CheckCircle }
    case "meta_review":
      return { label: "Meta Review", color: "text-blue-400", icon: User }
    case "comment":
      return { label: "评论", color: "text-white/60", icon: MessageCircle }
    default:
      return { label: type, color: "text-white/60", icon: MessageCircle }
  }
}

// 单个评论/回复组件
function ReviewItem({ 
  review, 
  isExpanded, 
  onToggle 
}: { 
  review: ReviewThread
  isExpanded: boolean
  onToggle: () => void
}) {
  const typeInfo = getReviewTypeInfo(review.review_type || "comment")
  const TypeIcon = typeInfo.icon
  const indentClass = review.depth > 0 ? `ml-${Math.min(review.depth * 4, 16)}` : ""
  
  return (
    <div className={cn("border-l-2 border-white/10 pl-4", indentClass)}>
      <div className="p-4 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <TypeIcon className={cn("w-4 h-4", typeInfo.color)} />
            <span className={cn("text-sm font-medium", typeInfo.color)}>
              {typeInfo.label}
            </span>
            {review.reviewer && (
              <span className="text-sm text-white/50">
                by {review.reviewer}
              </span>
            )}
            {review.number && (
              <span className="text-sm text-white/50">
                #{review.number}
              </span>
            )}
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
        
        {/* Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Decision */}
            {review.decision && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <CheckCircle className="w-5 h-5 text-amber-400" />
                <span className="font-medium text-amber-300">{review.decision}</span>
              </div>
            )}
            
            {/* Summary */}
            {review.summary && (
              <div>
                <div className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Summary
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <Markdown content={review.summary} />
                </div>
              </div>
            )}
            
            {/* Strengths */}
            {review.strengths && (
              <div>
                <div className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  Strengths
                </div>
                <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                  <Markdown content={review.strengths} />
                </div>
              </div>
            )}
            
            {/* Weaknesses */}
            {review.weaknesses && (
              <div>
                <div className="text-sm font-medium text-rose-400 mb-2 flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4" />
                  Weaknesses
                </div>
                <div className="bg-rose-500/5 rounded-lg p-3 border border-rose-500/10">
                  <Markdown content={review.weaknesses} />
                </div>
              </div>
            )}
            
            {/* Questions */}
            {review.questions && (
              <div>
                <div className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Questions
                </div>
                <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
                  <Markdown content={review.questions} />
                </div>
              </div>
            )}
            
            {/* Comment / Content */}
            {review.comment && (
              <div className="bg-black/20 rounded-lg p-3">
                <Markdown content={review.comment} />
              </div>
            )}
            
            {/* Flag if needed */}
            {review.flag_for_ethics_review && (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Flagged for ethics review
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Replies */}
      {review.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {review.replies.map((reply) => (
            <ReviewItemWrapper key={reply.id} review={reply} />
          ))}
        </div>
      )}
    </div>
  )
}

// Wrapper to manage individual expand state
function ReviewItemWrapper({ review }: { review: ReviewThread }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <ReviewItem 
      review={review} 
      isExpanded={isExpanded} 
      onToggle={() => setIsExpanded(!isExpanded)} 
    />
  )
}

export default function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [paper, setPaper] = useState<PaperDetail | null>(null)
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [expandAllReviews, setExpandAllReviews] = useState(false)
  
  useEffect(() => {
    getPaper(id)
      .then(setPaper)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])
  
  // 构建评论树
  const reviewTree = useMemo(() => {
    if (!paper?.reviews) return []
    return buildReviewTree(paper.reviews)
  }, [paper?.reviews])
  
  // 分类评论
  const { officialReviews, discussions } = useMemo(() => {
    const official = reviewTree.filter(r => r.review_type === "official_review")
    const others = reviewTree.filter(r => r.review_type !== "official_review")
    return { officialReviews: official, discussions: others }
  }, [reviewTree])
  
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
            <Markdown content={paper.abstract || ""} />
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
                    <Markdown content={summary.summary_text} />
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
        
        {/* Official Reviews - Thread Style */}
        {officialReviews.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-violet-400" />
                  官方评审 ({officialReviews.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandAllReviews(!expandAllReviews)}
                >
                  {expandAllReviews ? "全部收起" : "全部展开"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {officialReviews.map((review) => (
                <ReviewItemWrapper key={review.id} review={review} />
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Discussion Thread - 作者与Reviewer的互动 */}
        {discussions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                讨论区 ({discussions.length})
              </CardTitle>
              <p className="text-sm text-white/50 mt-1">
                作者回复 (Rebuttal)、Meta Review、决定 (Decision) 等互动内容
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {discussions.map((review) => (
                <ReviewItemWrapper key={review.id} review={review} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
