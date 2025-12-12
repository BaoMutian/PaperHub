"use client"

import { useEffect, useState } from "react"
import { getPaperStats } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, TrendingUp, Award, FileText, 
  Users, CheckCircle, XCircle, Loader2, PieChart
} from "lucide-react"

export default function StatsPage() {
  const [stats, setStats] = useState<{
    overall: Record<string, number>
    by_conference: Record<string, { 
      total: number
      accepted: number
      rejected: number
      acceptance_rate: number 
    }>
  } | null>(null)
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
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
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
  
  const totalPapers = stats.overall.total_papers || 0
  const totalAccepted = Object.values(stats.by_conference).reduce((sum, c) => sum + c.accepted, 0)
  const totalRejected = Object.values(stats.by_conference).reduce((sum, c) => sum + c.rejected, 0)
  const overallAcceptRate = totalPapers > 0 ? Math.round(totalAccepted / totalPapers * 100) : 0
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-violet-400" />
            数据统计
          </h1>
          <p className="text-white/50">
            AI 三大顶会 2025 年投稿与接收情况统计
          </p>
        </div>
        
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
            <CardContent className="p-6">
              <FileText className="w-8 h-8 mb-3 text-violet-400" />
              <div className="text-3xl font-bold text-white mb-1">
                {totalPapers.toLocaleString()}
              </div>
              <div className="text-sm text-white/50">论文总数</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <CardContent className="p-6">
              <CheckCircle className="w-8 h-8 mb-3 text-emerald-400" />
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {totalAccepted.toLocaleString()}
              </div>
              <div className="text-sm text-white/50">接收论文</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
            <CardContent className="p-6">
              <XCircle className="w-8 h-8 mb-3 text-rose-400" />
              <div className="text-3xl font-bold text-rose-400 mb-1">
                {totalRejected.toLocaleString()}
              </div>
              <div className="text-sm text-white/50">拒绝论文</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 mb-3 text-amber-400" />
              <div className="text-3xl font-bold text-amber-400 mb-1">
                {overallAcceptRate}%
              </div>
              <div className="text-sm text-white/50">总体接收率</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Other Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-fuchsia-400" />
              <div>
                <div className="text-xl font-bold">
                  {(stats.overall.total_authors || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/50">作者数量</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Award className="w-6 h-6 text-teal-400" />
              <div>
                <div className="text-xl font-bold">
                  {(stats.overall.total_reviews || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/50">评审记录</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <PieChart className="w-6 h-6 text-orange-400" />
              <div>
                <div className="text-xl font-bold">
                  {(stats.overall.total_keywords || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/50">关键词数</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              <div>
                <div className="text-xl font-bold">3</div>
                <div className="text-xs text-white/50">顶级会议</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Conference Details */}
        <h2 className="text-xl font-bold mb-4">各会议详情</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(stats.by_conference).map(([conf, data]) => {
            const confColor = conf === "ICLR" ? "blue" : conf === "ICML" ? "violet" : "teal"
            const acceptedPercent = data.total > 0 ? Math.round(data.accepted / data.total * 100) : 0
            const rejectedPercent = data.total > 0 ? Math.round(data.rejected / data.total * 100) : 0
            
            return (
              <Card key={conf} className="overflow-hidden">
                <div className={`h-2 bg-${confColor}-500`} />
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{conf} 2025</span>
                    <Badge className={`bg-${confColor}-500/20 text-${confColor}-300 border-${confColor}-500/30`}>
                      接收率 {data.acceptance_rate}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-2xl font-bold">{data.total.toLocaleString()}</div>
                      <div className="text-xs text-white/50">投稿</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">{data.accepted.toLocaleString()}</div>
                      <div className="text-xs text-white/50">接收</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-rose-400">{data.rejected.toLocaleString()}</div>
                      <div className="text-xs text-white/50">拒绝</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${acceptedPercent}%` }}
                      />
                      <div 
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${rejectedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/40">
                      <span>接收 {acceptedPercent}%</span>
                      <span>拒绝 {rejectedPercent}%</span>
                    </div>
                  </div>
                  
                  {/* Conference Info */}
                  <div className="pt-4 border-t border-white/10 text-sm text-white/50">
                    <div className="flex justify-between mb-1">
                      <span>评分满分</span>
                      <span className="text-white/80">
                        {conf === "ICLR" ? "10" : conf === "ICML" ? "5" : "6"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>评分字段</span>
                      <span className="text-white/80">
                        {conf === "ICML" ? "overall_recommendation" : "rating"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Comparison Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>会议对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.by_conference)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([conf, data]) => {
                  const maxTotal = Math.max(...Object.values(stats.by_conference).map(c => c.total))
                  const barWidth = (data.total / maxTotal) * 100
                  
                  return (
                    <div key={conf} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{conf}</span>
                        <span className="text-white/50">
                          {data.total.toLocaleString()} 篇 
                          <span className="text-emerald-400 ml-2">
                            ({data.acceptance_rate}% 接收)
                          </span>
                        </span>
                      </div>
                      <div className="h-8 rounded-lg bg-white/5 overflow-hidden relative">
                        <div 
                          className={`h-full transition-all duration-700 ${
                            conf === "ICLR" ? "bg-blue-500/50" :
                            conf === "ICML" ? "bg-violet-500/50" :
                            "bg-teal-500/50"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-700 ${
                            conf === "ICLR" ? "bg-blue-500" :
                            conf === "ICML" ? "bg-violet-500" :
                            "bg-teal-500"
                          }`}
                          style={{ width: `${(data.accepted / maxTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
            
            <div className="flex items-center gap-6 mt-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500" />
                <span>接收论文</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-violet-500/50" />
                <span>总投稿</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

