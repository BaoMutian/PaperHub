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
  MessageCircle, CheckCircle
} from "lucide-react"

// 构建评论树结构
interface ReviewThread extends Review {
  replies: ReviewThread[]
  depth: number
}

function buildReviewTree(reviews: Review[]): ReviewThread[] {
  const reviewMap = new Map<string, ReviewThread>()
  const rootReviews: ReviewThread[] = []
  
  reviews.forEach(review => {
    reviewMap.set(review.id, { ...review, replies: [], depth: 0 })
  })
  
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

// 获取会议的评分范围
function getConferenceRatingScale(conference: string): { min: number; max: number } {
  switch (conference?.toUpperCase()) {
    case "ICLR":
      return { min: 1, max: 10 }
    case "ICML":
      return { min: 1, max: 5 }
    case "NEURIPS":
      return { min: 1, max: 6 }
    default:
      return { min: 1, max: 10 }
  }
}

// 审稿人评分数据接口
interface ReviewerRating {
  rating: number
  confidence?: number
}

// 主评分展示组件 - 展示各审稿人评分和置信度
function RatingCard({ 
  avgRating, 
  reviewerRatings, 
  conference
}: { 
  avgRating?: number
  reviewerRatings: ReviewerRating[]
  conference: string
}) {
  const scale = getConferenceRatingScale(conference)
  const validRatings = reviewerRatings.filter(r => r.rating != null && !isNaN(r.rating))
  const actualAvg = validRatings.length > 0 
    ? validRatings.reduce((a, b) => a + b.rating, 0) / validRatings.length 
    : avgRating
  
  // 根据评分计算颜色
  const getRatingColor = (rating: number) => {
    const normalized = (rating - scale.min) / (scale.max - scale.min)
    if (normalized >= 0.7) return "text-emerald-400"
    if (normalized >= 0.5) return "text-amber-400"
    if (normalized >= 0.3) return "text-orange-400"
    return "text-rose-400"
  }
  
  const getRatingBgColor = (rating: number) => {
    const normalized = (rating - scale.min) / (scale.max - scale.min)
    if (normalized >= 0.7) return "bg-emerald-500"
    if (normalized >= 0.5) return "bg-amber-500"
    if (normalized >= 0.3) return "bg-orange-500"
    return "bg-rose-500"
  }
  
  if (!actualAvg && validRatings.length === 0) {
    return (
      <Card className="border-white/10 h-full bg-white/[0.02] backdrop-blur-sm">
        <CardContent className="p-6 flex items-center justify-center h-full min-h-[200px]">
          <div className="text-white/30 font-light tracking-wide">暂无评分数据</div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="border-white/10 h-full bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6">
        {/* 平均分展示 - 豆瓣风格 */}
        <div className="flex flex-col items-center mb-8 pb-8 border-b border-white/10 relative">
          <div className="absolute top-0 right-0 text-xs font-mono text-white/20">{conference}</div>
          
          <div className="text-xs text-white/40 mb-3 font-medium tracking-widest uppercase">Average Rating</div>
          
          <div className="flex items-baseline gap-1 mb-3">
            <span className={cn("text-6xl font-bold tracking-tighter", getRatingColor(actualAvg || 0))}>
              {actualAvg?.toFixed(1) || "N/A"}
            </span>
            <span className="text-lg text-white/20 font-light">/ {scale.max}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-white/40 bg-white/5 px-3 py-1.5 rounded-full">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={cn(
                    "w-3.5 h-3.5", 
                    i < Math.round(((actualAvg || 0) - scale.min) / (scale.max - scale.min) * 5) 
                      ? "text-amber-400 fill-amber-400" 
                      : "text-white/10 fill-white/10"
                  )} 
                />
              ))}
            </div>
            <div className="w-px h-3 bg-white/10" />
            <span>{validRatings.length} 人评价</span>
          </div>
        </div>
        
        {/* 各审稿人评分 - 现代条形图风格 */}
        <div className="space-y-3">
          {validRatings.map((r, i) => (
            <div key={i} className="group flex items-center gap-3">
              <div className="w-20 text-xs text-white/40 font-medium shrink-0 group-hover:text-white/60 transition-colors uppercase tracking-wide">
                Reviewer {i + 1}
              </div>
              
              <div className="flex-1 h-9 bg-white/5 rounded-md overflow-hidden relative flex items-center px-3 gap-2 group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/10">
                {/* 进度条背景 */}
                <div 
                  className={cn("absolute left-0 top-0 bottom-0 opacity-10 transition-all duration-500 group-hover:opacity-20", getRatingBgColor(r.rating))}
                  style={{ width: `${((r.rating - scale.min + 1) / (scale.max - scale.min + 1)) * 100}%` }}
                />
                
                {/* 分数 */}
                <span className={cn("relative z-10 font-bold text-sm tabular-nums", getRatingColor(r.rating))}>
                  {r.rating}
                </span>
                
                {/* 置信度 */}
                {r.confidence != null && (
                  <div className="ml-auto relative z-10 flex items-center gap-2" title={`Confidence: ${r.confidence}`}>
                    <span className="text-[9px] text-white/20 uppercase tracking-widest font-semibold hidden sm:inline-block">Conf.</span>
                    <div className="flex gap-0.5 items-end h-3">
                      {[...Array(5)].map((_, cI) => (
                        <div 
                          key={cI} 
                          className={cn(
                            "w-1 rounded-[1px] transition-all duration-300", 
                            cI < (r.confidence || 0) 
                              ? (r.confidence! >= 4 ? "bg-emerald-400/80 h-full" : "bg-white/40 h-[80%]") 
                              : "bg-white/5 h-[40%]"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* 统计摘要 */}
        {validRatings.length > 1 && (
          <div className="flex justify-between mt-6 pt-4 border-t border-white/10 text-[10px] text-white/30 font-mono uppercase tracking-wider">
            <div>
              MAX <span className="text-emerald-400 ml-1 font-bold">{Math.max(...validRatings.map(r => r.rating)).toFixed(0)}</span>
            </div>
            <div>
              MIN <span className="text-rose-400 ml-1 font-bold">{Math.min(...validRatings.map(r => r.rating)).toFixed(0)}</span>
            </div>
            <div>
              DIFF <span className="text-white/60 ml-1 font-bold">{(Math.max(...validRatings.map(r => r.rating)) - Math.min(...validRatings.map(r => r.rating))).toFixed(0)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
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

// 字段类型分类配置
const FIELD_CONFIG: Record<string, { label: string; color: string; bgColor: string; priority: number }> = {
  // 高优先级 - 核心评审内容
  decision: { label: "Decision", color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20", priority: 1 },
  metareview: { label: "Meta Review", color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", priority: 2 },
  summary: { label: "Summary", color: "text-white/70", bgColor: "bg-black/20", priority: 3 },
  
  // 优点类
  strengths: { label: "Strengths", color: "text-emerald-400", bgColor: "bg-emerald-500/5 border-emerald-500/10", priority: 10 },
  strengths_and_weaknesses: { label: "Strengths & Weaknesses", color: "text-cyan-400", bgColor: "bg-cyan-500/5 border-cyan-500/10", priority: 11 },
  contribution: { label: "Contribution", color: "text-emerald-400", bgColor: "bg-emerald-500/5 border-emerald-500/10", priority: 12 },
  originality: { label: "Originality", color: "text-emerald-400", bgColor: "bg-emerald-500/5 border-emerald-500/10", priority: 13 },
  significance: { label: "Significance", color: "text-emerald-400", bgColor: "bg-emerald-500/5 border-emerald-500/10", priority: 14 },
  
  // 缺点类
  weaknesses: { label: "Weaknesses", color: "text-rose-400", bgColor: "bg-rose-500/5 border-rose-500/10", priority: 20 },
  limitations: { label: "Limitations", color: "text-rose-400", bgColor: "bg-rose-500/5 border-rose-500/10", priority: 21 },
  
  // 问题类
  questions: { label: "Questions", color: "text-amber-400", bgColor: "bg-amber-500/5 border-amber-500/10", priority: 30 },
  questions_for_authors: { label: "Questions for Authors", color: "text-amber-400", bgColor: "bg-amber-500/5 border-amber-500/10", priority: 31 },
  
  // 评分类
  rating: { label: "Rating", color: "text-violet-400", bgColor: "bg-violet-500/10 border-violet-500/20", priority: 40 },
  overall_recommendation: { label: "Overall Recommendation", color: "text-violet-400", bgColor: "bg-violet-500/10 border-violet-500/20", priority: 41 },
  confidence: { label: "Confidence", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 42 },
  soundness: { label: "Soundness", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 43 },
  presentation: { label: "Presentation", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 44 },
  clarity: { label: "Clarity", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 45 },
  quality: { label: "Quality", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 46 },
  
  // 评论类
  comment: { label: "Comment", color: "text-white/70", bgColor: "bg-black/20", priority: 50 },
  rebuttal: { label: "Rebuttal", color: "text-emerald-400", bgColor: "bg-emerald-500/5 border-emerald-500/10", priority: 51 },
  author_final_remarks: { label: "Author Final Remarks", color: "text-emerald-400", bgColor: "bg-emerald-500/5 border-emerald-500/10", priority: 52 },
  final_justification: { label: "Final Justification", color: "text-blue-400", bgColor: "bg-blue-500/5 border-blue-500/10", priority: 53 },
  additional_comments_on_reviewer_discussion: { label: "Additional Comments", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 54 },
  other_comments_or_suggestions: { label: "Other Comments", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 55 },
  
  // 技术细节
  claims_and_evidence: { label: "Claims & Evidence", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 60 },
  theoretical_claims: { label: "Theoretical Claims", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 61 },
  experimental_designs_or_analyses: { label: "Experimental Designs", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 62 },
  methods_and_evaluation_criteria: { label: "Methods & Evaluation", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 63 },
  relation_to_broader_scientific_literature: { label: "Relation to Literature", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 64 },
  essential_references_not_discussed: { label: "Missing References", color: "text-orange-400", bgColor: "bg-orange-500/5 border-orange-500/10", priority: 65 },
  supplementary_material: { label: "Supplementary Material", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 66 },
  other_strengths_and_weaknesses: { label: "Other Points", color: "text-white/60", bgColor: "bg-white/5 border-white/10", priority: 67 },
  
  // 伦理相关
  ethical_concerns: { label: "Ethical Concerns", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", priority: 70 },
  ethical_review_concerns: { label: "Ethics Review Concerns", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", priority: 71 },
  details_of_ethics_concerns: { label: "Ethics Concerns Details", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", priority: 72 },
  flag_for_ethics_review: { label: "Ethics Review Flag", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", priority: 73 },
  ethical_review_flag: { label: "Ethical Review Flag", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", priority: 74 },
  paper_formatting_concerns: { label: "Formatting Concerns", color: "text-orange-400", bgColor: "bg-orange-500/5 border-orange-500/10", priority: 75 },
}

// 需要跳过的字段
const SKIP_FIELDS = new Set([
  'title', 'code_of_conduct', 'code_of_conduct_acknowledgement', 
  'mandatory_acknowledgement', 'responsible_reviewing_acknowledgement',
  'withdrawal_confirmation', 'revert_withdrawal_confirmation',
  'revert_desk_rejection_confirmation', 'desk_reject_comments',
  'retraction_confirmation', 'retraction_approval', 'ethics_expertise_needed'
])

// 检查评论是否有有效内容
function hasValidContent(review: ReviewThread): boolean {
  const content = review.content
  if (!content || Object.keys(content).length === 0) return false
  
  // 检查是否有至少一个有效字段
  for (const [key, data] of Object.entries(content)) {
    if (SKIP_FIELDS.has(key)) continue
    if (!data || data.value === undefined || data.value === null) continue
    const val = data.value
    if (typeof val === 'string' && val.trim() === '') continue
    // 找到一个有效字段
    return true
  }
  return false
}

// 递归检查评论树是否有有效内容（包括回复）
function hasValidContentTree(review: ReviewThread): boolean {
  if (hasValidContent(review)) return true
  // 检查是否有任何回复有有效内容
  return review.replies.some(r => hasValidContentTree(r))
}

// 将字段名转换为显示标签
function fieldToLabel(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// 获取字段的显示值
function getFieldValue(fieldData: { value: string | number | boolean } | undefined): string | null {
  if (!fieldData || fieldData.value === undefined || fieldData.value === null) return null
  const val = fieldData.value
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string' && val.trim() === '') return null
  return String(val)
}

// 动态内容渲染组件
function DynamicReviewContent({ content }: { content?: Record<string, { value: string | number | boolean } | undefined> }) {
  if (!content || Object.keys(content).length === 0) {
    return null
  }

  // 收集所有有效字段并排序
  const fields = Object.entries(content)
    .filter(([key]) => !SKIP_FIELDS.has(key))
    .map(([key, data]) => {
      const value = getFieldValue(data)
      if (!value) return null
      const config = FIELD_CONFIG[key] || { 
        label: fieldToLabel(key), 
        color: "text-white/60", 
        bgColor: "bg-white/5 border-white/10",
        priority: 100 
      }
      return { key, value, ...config }
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => a.priority - b.priority)

  if (fields.length === 0) return null

  return (
    <div className="space-y-4">
      {fields.map(({ key, value, label, color, bgColor }) => {
        // 对于短值（评分等），使用紧凑显示
        const isShortValue = value.length < 50 && !value.includes('\n')
        
        if (isShortValue) {
          return (
            <div key={key} className={cn("rounded-lg p-3 border", bgColor)}>
              <span className={cn("text-sm font-medium", color)}>{label}: </span>
              <span className="text-white/80">{value}</span>
            </div>
          )
        }

        return (
          <div key={key}>
            <div className={cn("text-sm font-medium mb-2", color)}>
              {label}
            </div>
            <div className={cn("rounded-lg p-3 border", bgColor)}>
              <Markdown content={value} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 单个评论/回复组件
function ReviewItem({ 
  review, 
  isExpanded, 
  onToggle,
  expandAll
}: { 
  review: ReviewThread
  isExpanded: boolean
  onToggle: () => void
  expandAll?: boolean
}) {
  const typeInfo = getReviewTypeInfo(review.review_type || "comment")
  const TypeIcon = typeInfo.icon
  const indentClass = review.depth > 0 ? `ml-${Math.min(review.depth * 4, 12)}` : ""
  
  // 检查是否有有效的动态content（使用与过滤相同的逻辑）
  const hasContent = hasValidContent(review)
  
  return (
    <div className={cn("border-l border-white/10 pl-6 relative", indentClass)}>
      {/* 连线指示器 */}
      <div className="absolute left-0 top-6 w-4 h-px bg-white/10" />
      
      <div className="py-2">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer group select-none"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className={cn(
              "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
              typeInfo.color.replace("text-", "bg-").replace("400", "500/10").replace("60", "white/5"),
              typeInfo.color.replace("text-", "border-").replace("400", "500/20").replace("60", "white/10"),
              "group-hover:border-white/20"
            )}>
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{typeInfo.label}</span>
            </div>
            
            {review.rating && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-white/70">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="font-mono font-bold">{review.rating}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span>{formatDate(review.cdate)}</span>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
              isExpanded ? "bg-white/10 text-white" : "text-white/20 group-hover:text-white/60"
            )}>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
        
        {/* Content */}
        {isExpanded && hasContent && (
          <div className="mt-4 mb-6 pl-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <DynamicReviewContent content={review.content} />
            </div>
          </div>
        )}
      </div>
      
      {/* Replies */}
      {review.replies.filter(r => hasValidContentTree(r)).length > 0 && (
        <div className="mt-2 space-y-1">
          {review.replies
            .filter(r => hasValidContentTree(r))
            .map((reply) => (
              <ReviewItemWrapper key={reply.id} review={reply} expandAll={expandAll} />
          ))}
        </div>
      )}
    </div>
  )
}

// Wrapper to manage individual expand state
function ReviewItemWrapper({ review, expandAll }: { review: ReviewThread; expandAll?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 响应全局展开/收起状态变化
  useEffect(() => {
    if (expandAll !== undefined) {
      setIsExpanded(expandAll)
    }
  }, [expandAll])
  
  // 如果评论本身没有内容，也没有有效回复，不渲染
  if (!hasValidContentTree(review)) {
    return null
  }
  
  return (
    <ReviewItem 
      review={review} 
      isExpanded={isExpanded} 
      onToggle={() => setIsExpanded(!isExpanded)} 
      expandAll={expandAll}
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
  
  // 分类评论（过滤掉没有有效内容的讨论）
  const { officialReviews, discussions } = useMemo(() => {
    const official = reviewTree.filter(r => r.review_type === "official_review")
    // 只保留有有效内容的讨论（包括其回复链中有内容的）
    const others = reviewTree
      .filter(r => r.review_type !== "official_review")
      .filter(r => hasValidContentTree(r))
    return { officialReviews: official, discussions: others }
  }, [reviewTree])
  
  // 提取所有审稿人评分和置信度
  const reviewerRatings = useMemo(() => {
    if (!paper?.reviews) return []
    return paper.reviews
      .filter(r => r.review_type === "official_review" && r.rating != null)
      .map(r => ({
        rating: r.rating as number,
        confidence: r.content?.confidence?.value as number | undefined
      }))
  }, [paper?.reviews])
  
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
        
        {/* Two Column Layout: Info + Rating */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Paper Info */}
          <div className="lg:col-span-2">
            {/* Badges */}
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
            
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight tracking-tight text-white/90">
              {paper.title}
            </h1>
            
            {/* Authors */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {paper.authors.map((author, i) => (
                <Link 
                  key={i}
                  href={`/authors/${encodeURIComponent(paper.authorids?.[i] || author)}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm text-white/70 hover:text-white transition-all group"
                >
                  <User className="w-3.5 h-3.5 mr-2 text-white/30 group-hover:text-violet-400 transition-colors" />
                  {author}
                </Link>
              ))}
            </div>
            
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/40 border-t border-white/5 pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(paper.creation_date)}
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {paper.review_count} 评审
              </div>
              {paper.venue && (
                <>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wider text-xs">Venue</span>
                    <span className="text-white/60">{paper.venue}</span>
                  </div>
                </>
              )}
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
          
          {/* Right: Rating Card */}
          <div className="lg:col-span-1">
            <RatingCard 
              avgRating={paper.avg_rating}
              reviewerRatings={reviewerRatings}
              conference={paper.conference}
            />
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
                <ReviewItemWrapper key={review.id} review={review} expandAll={expandAllReviews} />
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Discussion Thread */}
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
                <ReviewItemWrapper key={review.id} review={review} expandAll={expandAllReviews} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
