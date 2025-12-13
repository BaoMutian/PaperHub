"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getPaperStats, searchPapers, type Paper } from "@/lib/api"
import { PaperCard } from "@/components/papers/paper-card"
import { Search, ArrowRight, Sparkles, Network, BarChart3, BookOpen, TrendingUp, Loader2, ChevronDown } from "lucide-react"

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
      const result = await searchPapers(searchQuery, true, 50) // 获取更多结果
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-500/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[120px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-8">
            <Sparkles className="w-4 h-4 text-violet-400" />
            AI顶会论文知识图谱 · 2025
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              探索 AI 前沿
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              研究论文
            </span>
          </h1>
          
          <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto">
            汇聚 ICLR、ICML、NeurIPS 2025 三大顶会论文，
            基于知识图谱的智能检索与分析，
            像逛豆瓣一样探索学术前沿。
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
              <div className="relative flex gap-2 p-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    placeholder="搜索标题、作者、关键词、摘要..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-transparent border-0 text-base focus:ring-0"
                  />
                </div>
                <Button type="submit" className="h-12 px-6" disabled={isSearching}>
                  {isSearching ? "搜索中..." : "语义搜索"}
                </Button>
              </div>
            </div>
          </form>
          
          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/papers?conference=ICLR">
              <Button variant="secondary" size="sm">ICLR 2025</Button>
            </Link>
            <Link href="/papers?conference=ICML">
              <Button variant="secondary" size="sm">ICML 2025</Button>
            </Link>
            <Link href="/papers?conference=NeurIPS">
              <Button variant="secondary" size="sm">NeurIPS 2025</Button>
            </Link>
            <Link href="/qa">
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                智能问答
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <section className="py-12 px-4 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                搜索结果 
                <span className="text-white/50 text-base font-normal ml-2">
                  共 {totalResults} 篇，显示 {Math.min(displayCount, searchResults.length)} 篇
                </span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSearchResults([]); setDisplayCount(6) }}>
                清除结果
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.slice(0, displayCount).map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
            {/* Load More Button */}
            {displayCount < searchResults.length && (
              <div className="flex justify-center mt-8">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="min-w-[200px]"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      加载更多 ({searchResults.length - displayCount} 篇)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
      
      {/* Stats Section */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">数据概览</h2>
          
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 text-violet-400" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.overall.total_papers?.toLocaleString() || "0"}
                  </div>
                  <div className="text-sm text-white/50">论文总数</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Network className="w-8 h-8 mx-auto mb-3 text-fuchsia-400" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.overall.total_authors?.toLocaleString() || "0"}
                  </div>
                  <div className="text-sm text-white/50">作者数量</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.overall.total_reviews?.toLocaleString() || "0"}
                  </div>
                  <div className="text-sm text-white/50">评审记录</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.overall.total_keywords?.toLocaleString() || "0"}
                  </div>
                  <div className="text-sm text-white/50">关键词数</div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Conference Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(stats.by_conference).map(([conf, data]) => (
                <Card key={conf} className="overflow-hidden">
                  <div className={`h-1 ${
                    conf === "ICLR" ? "bg-blue-500" : 
                    conf === "ICML" ? "bg-violet-500" : "bg-teal-500"
                  }`} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{conf} 2025</h3>
                      <span className="text-2xl font-bold text-white/80">
                        {data.acceptance_rate}%
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-white/60">
                        <span>提交总数</span>
                        <span className="font-medium text-white">{data.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>接收论文</span>
                        <span className="font-medium text-emerald-400">{data.accepted.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>拒绝论文</span>
                        <span className="font-medium text-rose-400">{data.rejected.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">核心功能</h2>
          <p className="text-center text-white/50 mb-12 max-w-2xl mx-auto">
            基于知识图谱的智能论文分析平台，支持自然语言查询、可视化探索
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/papers">
              <Card className="group hover:border-violet-500/50 transition-all h-full">
                <CardContent className="p-6">
                  <Search className="w-10 h-10 mb-4 text-violet-400 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">智能搜索</h3>
                  <p className="text-sm text-white/50">
                    基于向量语义的论文搜索，理解你的意图而非关键词匹配
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/network">
              <Card className="group hover:border-fuchsia-500/50 transition-all h-full">
                <CardContent className="p-6">
                  <Network className="w-10 h-10 mb-4 text-fuchsia-400 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">协作网络</h3>
                  <p className="text-sm text-white/50">
                    2D/3D 可视化作者协作关系，探索学术圈的社交图谱
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/qa">
              <Card className="group hover:border-emerald-500/50 transition-all h-full">
                <CardContent className="p-6">
                  <Sparkles className="w-10 h-10 mb-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">智能问答</h3>
                  <p className="text-sm text-white/50">
                    用自然语言提问，AI 自动查询知识图谱并回答
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/stats">
              <Card className="group hover:border-amber-500/50 transition-all h-full">
                <CardContent className="p-6">
                  <BarChart3 className="w-10 h-10 mb-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold mb-2">数据统计</h3>
                  <p className="text-sm text-white/50">
                    会议接收率、热门关键词、评分分布等深度统计
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">开始探索</h2>
          <p className="text-white/50 mb-8">
            尝试智能问答，问一些有趣的问题
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/qa?q=ICLR+2025有多少篇论文被接收">
              <Button variant="secondary">ICLR 2025接收论文数量？</Button>
            </Link>
            <Link href="/qa?q=哪个关键词在接收论文中出现最多">
              <Button variant="secondary">最热门的研究方向？</Button>
            </Link>
            <Link href="/qa?q=发表论文最多的作者是谁">
              <Button variant="secondary">谁发表论文最多？</Button>
            </Link>
          </div>
          <div className="mt-6">
            <Link href="/qa">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                试试智能问答
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
