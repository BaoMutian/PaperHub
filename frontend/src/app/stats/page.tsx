"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { getPaperStats, type StatsResponse } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, TrendingUp, Award, FileText, 
  Users, CheckCircle, XCircle, Loader2, PieChart as PieChartIcon,
  Flame, Tag, Trophy, Crown
} from "lucide-react"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from "recharts"
import { cn } from "@/lib/utils"

// 会议颜色配置
const CONFERENCE_COLORS: Record<string, { primary: string; secondary: string; bg: string }> = {
  ICLR: { primary: "#3b82f6", secondary: "#60a5fa", bg: "from-blue-500/20" },
  ICML: { primary: "#8b5cf6", secondary: "#a78bfa", bg: "from-violet-500/20" },
  NeurIPS: { primary: "#d946ef", secondary: "#e879f9", bg: "from-fuchsia-500/20" }
}

// 状态颜色
const STATUS_COLORS = {
  oral: "#f59e0b",
  spotlight: "#8b5cf6", 
  poster: "#3b82f6"
}

// 评分区间颜色
const RATING_COLORS = ["#10b981", "#34d399", "#fbbf24", "#f59e0b", "#f97316", "#ef4444"]

// 关键词语义去重函数
function dedupeKeywords(keywords: { keyword: string; paper_count: number }[]): { keyword: string; paper_count: number }[] {
  const result: { keyword: string; paper_count: number }[] = []
  const seen = new Set<string>()
  
  // 标准化关键词用于比较
  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/s$/, '')  // 去掉复数 s
      .replace(/-/g, ' ')  // 连字符替换为空格
      .replace(/\s+/g, ' ')  // 多空格合一
      .trim()
  }
  
  // 计算两个字符串的相似度 (Jaccard index based on words)
  const similarity = (a: string, b: string) => {
    const wordsA = new Set(normalize(a).split(' '))
    const wordsB = new Set(normalize(b).split(' '))
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)))
    const union = new Set([...wordsA, ...wordsB])
    return intersection.size / union.size
  }
  
  for (const kw of keywords) {
    const normalizedKw = normalize(kw.keyword)
    
    // 检查是否与已有关键词过于相似
    let isDuplicate = false
    for (const existing of result) {
      const normalizedExisting = normalize(existing.keyword)
      
      // 完全匹配（忽略大小写和复数）
      if (normalizedKw === normalizedExisting) {
        isDuplicate = true
        break
      }
      
      // 高相似度（>0.8）也视为重复
      if (similarity(kw.keyword, existing.keyword) > 0.8) {
        isDuplicate = true
        break
      }
      
      // 一个是另一个的子串
      if (normalizedKw.includes(normalizedExisting) || normalizedExisting.includes(normalizedKw)) {
        isDuplicate = true
        break
      }
    }
    
    if (!isDuplicate && !seen.has(normalizedKw)) {
      result.push(kw)
      seen.add(normalizedKw)
    }
  }
  
  return result
}

// 自定义 Tooltip 样式
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
        <p className="text-white/70 text-xs mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// 数字动画 Hook
function useCountUp(end: number, duration = 1500) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (end === 0) return
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1)
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      countRef.current = Math.floor(easeOut * end)
      setCount(countRef.current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
    
    return () => {
      startTimeRef.current = null
    }
  }, [end, duration])

  return count
}

// 统计卡片组件
function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  color, 
  gradient 
}: { 
  icon: React.ElementType
  value: number
  label: string
  color: string
  gradient: string
}) {
  const animatedValue = useCountUp(value)
  
  return (
    <Card className={cn(
      "relative overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-sm",
      "hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 group"
    )}>
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-20 group-hover:opacity-30 transition-opacity",
        `bg-gradient-to-br ${gradient} to-transparent`
      )} />
      <CardContent className="p-6 relative">
        <Icon className={cn("w-8 h-8 mb-4", color)} />
        <div className="text-4xl font-bold text-white mb-1 tabular-nums tracking-tight">
          {animatedValue.toLocaleString()}
        </div>
        <div className="text-sm text-white/50">{label}</div>
      </CardContent>
    </Card>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    getPaperStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
          <p className="text-white/50 text-sm">加载统计数据...</p>
        </div>
      </div>
    )
  }
  
  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/50">
        无法加载统计数据
      </div>
    )
  }
  
  // 计算总数
  const totalPapers = stats.overall.total_papers || 0
  const totalAccepted = Object.values(stats.by_conference).reduce((sum, c) => sum + c.accepted, 0)
  const totalRejected = Object.values(stats.by_conference).reduce((sum, c) => sum + c.rejected, 0)
  const overallAcceptRate = totalPapers > 0 ? Math.round(totalAccepted / totalPapers * 100) : 0
  
  // 准备饼图数据 - 各会议论文数量占比
  const conferenceData = Object.entries(stats.by_conference).map(([name, data]) => ({
    name,
    value: data.total,
    color: CONFERENCE_COLORS[name]?.primary || "#666"
  }))
  
  // 准备状态分布数据
  const statusData = Object.entries(stats.status_distribution || {}).flatMap(([conf, statuses]) => 
    Object.entries(statuses).map(([status, count]) => ({
      conference: conf,
      status,
      count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS]
    }))
  )
  
  // 按会议分组的状态数据（用于堆叠柱状图）
  const stackedStatusData = Object.entries(stats.by_conference).map(([conf, data]) => {
    const statusDist = stats.status_distribution?.[conf] || { oral: 0, spotlight: 0, poster: 0 }
    return {
      name: conf,
      oral: statusDist.oral,
      spotlight: statusDist.spotlight,
      poster: statusDist.poster,
      total: data.accepted
    }
  })
  
  // 准备接收率对比数据
  const acceptanceData = Object.entries(stats.by_conference).map(([name, data]) => ({
    name,
    接收: data.accepted,
    拒绝: data.rejected,
    接收率: data.acceptance_rate
  }))
  
  // 热门关键词数据 - 先语义去重再取 top 10
  const dedupedKeywords = dedupeKeywords(stats.top_keywords || [])
  const keywordsData = dedupedKeywords.slice(0, 10).map(k => ({
    name: k.keyword,
    count: k.paper_count
  }))
  
  return (
    <div className="min-h-screen relative selection:bg-violet-500/30">
      {/* 背景光效 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] bg-fuchsia-500/5 rounded-full blur-[120px]" />
      </div>
      
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              数据统计中心
            </h1>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              ICLR · ICML · NeurIPS 2025 三大 AI 顶会论文全景数据
            </p>
          </div>
          
          {/* Overall Stats - 4 Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <StatCard 
              icon={FileText} 
              value={totalPapers} 
              label="论文总数" 
              color="text-blue-400"
              gradient="from-blue-500/30"
            />
            <StatCard 
              icon={CheckCircle} 
              value={totalAccepted} 
              label="接收论文" 
              color="text-emerald-400"
              gradient="from-emerald-500/30"
            />
            <StatCard 
              icon={Users} 
              value={stats.overall.total_authors || 0} 
              label="研究学者" 
              color="text-violet-400"
              gradient="from-violet-500/30"
            />
            <StatCard 
              icon={Award} 
              value={stats.overall.total_reviews || 0} 
              label="评审记录" 
              color="text-amber-400"
              gradient="from-amber-500/30"
            />
          </div>
          
          {/* Charts Row 1 - 论文分布 & 接收率 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 论文分布饼图 */}
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChartIcon className="w-5 h-5 text-violet-400" />
                  各会议论文占比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conferenceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {conferenceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-white/70 text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* 接收率对比柱状图 */}
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  各会议接收率对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={acceptanceData} layout="vertical">
                      <XAxis type="number" stroke="#666" fontSize={12} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#666" 
                        fontSize={12}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="接收" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} animationDuration={800} />
                      <Bar dataKey="拒绝" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-white/60">接收</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    <span className="text-white/60">拒绝</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row 2 - 状态分布 & 总体接收率 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 接收状态分布 */}
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  接收状态细分
                  <span className="ml-auto text-xs text-white/40 font-normal">Oral / Spotlight / Poster</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedStatusData}>
                      <XAxis dataKey="name" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="oral" name="Oral" stackId="a" fill="#f59e0b" animationDuration={800} />
                      <Bar dataKey="spotlight" name="Spotlight" stackId="a" fill="#8b5cf6" animationDuration={800} />
                      <Bar dataKey="poster" name="Poster" stackId="a" fill="#3b82f6" animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span className="text-white/60">Oral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-violet-500" />
                    <span className="text-white/60">Spotlight</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-white/60">Poster</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 总体接收率环形图 */}
            <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-fuchsia-400" />
                  总体接收率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="60%" 
                      outerRadius="90%" 
                      data={[{ name: "接收率", value: overallAcceptRate, fill: "#8b5cf6" }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar
                        background={{ fill: "rgba(255,255,255,0.05)" }}
                        dataKey="value"
                        cornerRadius={10}
                        animationDuration={1200}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold text-white tabular-nums">
                      {overallAcceptRate}%
                    </div>
                    <div className="text-sm text-white/50 mt-1">总体接收率</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                  {Object.entries(stats.by_conference).map(([conf, data]) => (
                    <div key={conf} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="text-lg font-bold" style={{ color: CONFERENCE_COLORS[conf]?.primary }}>
                        {data.acceptance_rate}%
                      </div>
                      <div className="text-xs text-white/40">{conf}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 热门关键词 */}
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="w-5 h-5 text-cyan-400" />
                热门研究关键词 Top 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={keywordsData} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <XAxis type="number" stroke="#666" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#666" 
                      fontSize={11}
                      width={180}
                      tick={{ fill: "rgba(255,255,255,0.7)" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      name="论文数" 
                      fill="url(#keywordGradient)" 
                      radius={[0, 4, 4, 0]}
                      animationDuration={1000}
                    />
                    <defs>
                      <linearGradient id="keywordGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* 高产作者排行 */}
          <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-amber-400" />
                高产作者排行榜 Top 10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(stats.top_authors || []).slice(0, 10).map((author, index) => (
                  <Link 
                    key={author.authorid}
                    href={`/authors/${encodeURIComponent(author.authorid)}`}
                    className="group"
                  >
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all",
                      "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                    )}>
                      {/* 排名徽章 */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        index === 0 
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900" 
                          : index === 1 
                            ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700"
                            : index === 2 
                              ? "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900"
                              : "bg-white/10 text-white/60"
                      )}>
                        {index + 1}
                      </div>
                      
                      {/* 作者信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                          {author.name}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {author.accepted_count} 篇接收 · 接收率 {author.acceptance_rate}%
                        </div>
                      </div>
                      
                      {/* 论文数 */}
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-white tabular-nums">
                          {author.paper_count}
                        </div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider">Papers</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* 各会议详情卡片 */}
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Flame className="w-6 h-6 text-orange-400" />
            各会议详情
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(stats.by_conference).map(([conf, data]) => {
              const colors = CONFERENCE_COLORS[conf] || CONFERENCE_COLORS.ICLR
              const statusDist = stats.status_distribution?.[conf] || { oral: 0, spotlight: 0, poster: 0 }
              const maxRating = conf === "ICLR" ? 10 : conf === "ICML" ? 5 : 6
              
              return (
                <Card key={conf} className="overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-sm group hover:border-white/20 transition-all">
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})` }} />
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-xl">{conf} <span className="text-white/30 text-base font-normal">2025</span></span>
                      <Badge 
                        className="border"
                        style={{ 
                          backgroundColor: `${colors.primary}20`,
                          borderColor: `${colors.primary}40`,
                          color: colors.secondary
                        }}
                      >
                        接收率 {data.acceptance_rate}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* 主要统计 */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-lg bg-white/[0.03]">
                        <div className="text-2xl font-bold text-white tabular-nums">{data.total.toLocaleString()}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">投稿</div>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-500/10">
                        <div className="text-2xl font-bold text-emerald-400 tabular-nums">{data.accepted.toLocaleString()}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">接收</div>
                      </div>
                      <div className="p-3 rounded-lg bg-rose-500/10">
                        <div className="text-2xl font-bold text-rose-400 tabular-nums">{data.rejected.toLocaleString()}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">拒绝</div>
                      </div>
                    </div>
                    
                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${data.total > 0 ? (data.accepted / data.total) * 100 : 0}%` }}
                        />
                        <div 
                          className="h-full bg-rose-500 transition-all duration-700"
                          style={{ width: `${data.total > 0 ? (data.rejected / data.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* 接收状态细分 */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="text-lg font-bold text-amber-400 tabular-nums">{statusDist.oral}</div>
                        <div className="text-[10px] text-amber-300/60">Oral</div>
                      </div>
                      <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                        <div className="text-lg font-bold text-violet-400 tabular-nums">{statusDist.spotlight}</div>
                        <div className="text-[10px] text-violet-300/60">Spotlight</div>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="text-lg font-bold text-blue-400 tabular-nums">{statusDist.poster}</div>
                        <div className="text-[10px] text-blue-300/60">Poster</div>
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
