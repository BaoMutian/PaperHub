"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getPaperStats, searchPapers, type Paper } from "@/lib/api"
import { PaperCard } from "@/components/papers/paper-card"
import { Search, ArrowRight, Sparkles, Network, BarChart3, BookOpen, TrendingUp, Loader2, ChevronDown, User, FileText, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const [stats, setStats] = useState<{
    overall: Record<string, number>
    by_conference: Record<string, { total: number; accepted: number; rejected: number; acceptance_rate: number }>
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Paper[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [displayCount, setDisplayCount] = useState(6)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  useEffect(() => {
    getPaperStats()
      .then(setStats)
      .catch(console.error)
  }, [])
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    setDisplayCount(6)
    try {
      const result = await searchPapers(searchQuery, true, 50)
      setSearchResults(result.results)
      setTotalResults(result.count)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleLoadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + 6, searchResults.length))
      setIsLoadingMore(false)
    }, 300)
  }
  
  return (
    <div className="min-h-screen relative selection:bg-violet-500/30">
      {/* 全局背景光效 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-white/60 mb-8 backdrop-blur-sm animate-fade-in hover:bg-white/[0.05] transition-colors cursor-default">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>AI 顶会论文知识图谱 · 2025</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold mb-8 tracking-tight leading-[1.1]">
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              探索 AI 前沿
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent bg-[200%_auto] animate-gradient">
              研究论文
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            汇聚 ICLR、ICML、NeurIPS 三大顶会最新论文，<br className="hidden sm:block" />
            基于知识图谱的智能检索与分析，像逛豆瓣一样探索学术前沿。
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
              <div className="relative flex items-center p-2 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl">
                <div className="pl-4 pr-3 text-white/40">
                  <Search className="w-5 h-5" />
                </div>
                <Input
                  placeholder="搜索标题、作者、关键词、摘要..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-12 bg-transparent border-0 text-lg placeholder:text-white/20 focus-visible:ring-0 px-0"
                />
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={isSearching}
                  className="h-11 px-8 bg-white text-black hover:bg-white/90 font-medium rounded-lg transition-all"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "搜索"
                  )}
                </Button>
              </div>
            </div>
            {/* 热门搜索提示 */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/40">
              <span>热门搜索:</span>
              <button type="button" onClick={() => setSearchQuery("Large Language Models")} className="hover:text-violet-400 transition-colors">Large Language Models</button>
              <button type="button" onClick={() => setSearchQuery("Reinforcement Learning")} className="hover:text-violet-400 transition-colors">Reinforcement Learning</button>
              <button type="button" onClick={() => setSearchQuery("Diffusion Models")} className="hover:text-violet-400 transition-colors">Diffusion Models</button>
            </div>
          </form>

          {/* Conference Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: "ICLR 2025", color: "text-blue-400" },
              { name: "ICML 2025", color: "text-violet-400" },
              { name: "NeurIPS 2025", color: "text-fuchsia-400" },
            ].map((conf) => (
              <Link key={conf.name} href={`/papers?conference=${conf.name.split(' ')[0]}`}>
                <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:border-white/20 backdrop-blur-sm">
                  <span className={cn("w-2 h-2 rounded-full mr-2", conf.color.replace('text-', 'bg-'))} />
                  {conf.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <section className="py-12 px-4 border-t border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-baseline gap-3">
                <h2 className="text-2xl font-bold">搜索结果</h2>
                <span className="text-white/40">
                  找到 {totalResults} 篇相关论文
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSearchResults([]); setDisplayCount(6) }}
                className="text-white/40 hover:text-white"
              >
                清除结果
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.slice(0, displayCount).map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
            
            {displayCount < searchResults.length && (
              <div className="flex justify-center mt-12">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="min-w-[200px] border-white/10 bg-white/5 hover:bg-white/10"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      加载更多 ({searchResults.length - displayCount})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
      
      {/* Dashboard Stats */}
      <section className="py-24 px-4 border-t border-white/5 relative bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">全景数据概览</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              实时追踪顶会动态，通过数据洞察学术趋势
            </p>
          </div>
          
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {[
                { label: "论文总数", value: stats.overall.total_papers, icon: FileText, color: "text-blue-400" },
                { label: "研究学者", value: stats.overall.total_authors, icon: User, color: "text-violet-400" },
                { label: "评审记录", value: stats.overall.total_reviews, icon: MessageSquare, color: "text-emerald-400" },
                { label: "关键词", value: stats.overall.total_keywords, icon: TrendingUp, color: "text-amber-400" },
              ].map((item, i) => (
                <Card key={i} className="bg-white/[0.02] border-white/5 backdrop-blur-sm hover:bg-white/[0.04] transition-colors">
                  <CardContent className="p-6">
                    <item.icon className={cn("w-6 h-6 mb-4", item.color)} />
                    <div className="text-3xl font-bold text-white mb-1 tabular-nums tracking-tight">
                      {item.value?.toLocaleString() || "0"}
                    </div>
                    <div className="text-sm text-white/40">{item.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(stats.by_conference).map(([conf, data]) => (
                <Card key={conf} className="bg-white/[0.02] border-white/5 overflow-hidden group hover:border-white/10 transition-all">
                  <div className={cn(
                    "h-1 w-full transition-all duration-500", 
                    conf === "ICLR" ? "bg-blue-500 group-hover:bg-blue-400" : 
                    conf === "ICML" ? "bg-violet-500 group-hover:bg-violet-400" : "bg-fuchsia-500 group-hover:bg-fuchsia-400"
                  )} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">{conf} <span className="text-white/30 text-base font-normal">2025</span></h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white tabular-nums">
                          {data.acceptance_rate}%
                        </div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider">Acceptance Rate</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/40">Submitted</span>
                        <span className="font-mono text-white/70">{data.total.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
                        <div 
                          className="bg-emerald-500/50 h-full" 
                          style={{ width: `${data.acceptance_rate}%` }} 
                        />
                        <div className="bg-white/5 h-full flex-1" />
                      </div>
                      <div className="flex justify-between text-xs text-white/30 pt-1">
                        <span className="text-emerald-400/70">{data.accepted} Accepted</span>
                        <span className="text-rose-400/70">{data.rejected} Rejected</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">核心功能引擎</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: Search, 
                title: "混合检索", 
                desc: "融合关键词与向量语义，精准定位目标论文", 
                href: "/papers",
                color: "text-blue-400",
                gradient: "from-blue-500/20"
              },
              { 
                icon: Network, 
                title: "知识图谱", 
                desc: "可视化作者协作网络，发现学术圈层", 
                href: "/authors",
                color: "text-violet-400",
                gradient: "from-violet-500/20"
              },
              { 
                icon: Sparkles, 
                title: "智能问答", 
                desc: "基于图谱的自然语言问答，支持复杂推理", 
                href: "/qa",
                color: "text-fuchsia-400",
                gradient: "from-fuchsia-500/20"
              },
              { 
                icon: BarChart3, 
                title: "深度统计", 
                desc: "多维度的会议数据分析与可视化报表", 
                href: "/stats", // Note: stats page might not exist yet, but link is placeholder
                color: "text-emerald-400",
                gradient: "from-emerald-500/20"
              },
            ].map((feature, i) => (
              <Link key={i} href={feature.href} className="block h-full">
                <Card className="h-full bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group overflow-hidden relative">
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-2xl rounded-bl-full pointer-events-none`} />
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="mb-6 p-3 bg-white/5 w-fit rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                      <feature.icon className={cn("w-6 h-6", feature.color)} />
                    </div>
                    <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      {feature.desc}
                    </p>
                    
                    <div className="mt-auto pt-6 flex items-center text-xs font-medium text-white/30 group-hover:text-white/60 transition-colors">
                      立即体验 <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-4 border-t border-white/5 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">准备好开始探索了吗？</h2>
          <p className="text-lg text-white/50 mb-10">
            用全新的方式阅读、理解和分析 AI 顶会论文
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/qa">
              <Button size="lg" className="h-14 px-8 text-lg bg-white text-black hover:bg-white/90 rounded-full">
                <Sparkles className="w-5 h-5 mr-2" />
                尝试智能问答
              </Button>
            </Link>
            <Link href="/papers">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 hover:bg-white/5">
                浏览全部论文
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
