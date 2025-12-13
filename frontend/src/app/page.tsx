"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getPaperStats, searchPapers, type Paper } from "@/lib/api"
import { PaperCard } from "@/components/papers/paper-card"
import { Search, ArrowRight, Sparkles, Network, BarChart3, BookOpen, TrendingUp, Loader2, ChevronDown, GraduationCap, Quote } from "lucide-react"
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
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-600/5 rounded-full blur-[100px]" />
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-8 backdrop-blur-sm animate-fade-in">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              2025 AI Top Conference Knowledge Graph
            </div>
            
            {/* Title */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6 tracking-tighter animate-fade-in animation-delay-100">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                PaperHub
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-white/60 mb-12 max-w-2xl mx-auto font-light tracking-wide animate-fade-in animation-delay-200">
              Your Academic AI Douban
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-16 animate-fade-in animation-delay-300">
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-emerald-500/50 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                <div className="relative flex items-center bg-black/80 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                  <Search className="ml-4 w-5 h-5 text-white/40" />
                  <Input
                    placeholder="Search papers, authors, keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-12 bg-transparent border-0 text-lg placeholder:text-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={isSearching}
                    className="h-12 px-8 rounded-xl bg-white text-black hover:bg-white/90 font-medium transition-all"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
                  </Button>
                </div>
              </form>
              
              {/* Quick Tags */}
              <div className="flex flex-wrap justify-center gap-2 mt-6 text-sm">
                <span className="text-white/30 mr-2">Trending:</span>
                <Link href="/papers?conference=ICLR" className="text-white/50 hover:text-violet-400 transition-colors">ICLR 2025</Link>
                <span className="text-white/10">•</span>
                <Link href="/papers?conference=NeurIPS" className="text-white/50 hover:text-fuchsia-400 transition-colors">NeurIPS 2025</Link>
                <span className="text-white/10">•</span>
                <Link href="/qa" className="text-white/50 hover:text-emerald-400 transition-colors">LLM QA</Link>
              </div>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-white/5 pt-12 animate-fade-in animation-delay-300">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.overall.total_papers?.toLocaleString()}</div>
                  <div className="text-xs text-white/40 uppercase tracking-widest">Papers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.overall.total_authors?.toLocaleString()}</div>
                  <div className="text-xs text-white/40 uppercase tracking-widest">Authors</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.overall.total_reviews?.toLocaleString()}</div>
                  <div className="text-xs text-white/40 uppercase tracking-widest">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.overall.total_keywords?.toLocaleString()}</div>
                  <div className="text-xs text-white/40 uppercase tracking-widest">Concepts</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <section className="py-12 px-4 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-medium flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/60">
                  {totalResults}
                </span>
                Results Found
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setSearchResults([]); setDisplayCount(6) }} className="text-white/40 hover:text-white">
                Clear
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
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="min-w-[200px] border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More ({searchResults.length - displayCount})
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Features Grid */}
        <section className="py-24 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Link href="/qa" className="group md:col-span-2">
              <Card className="h-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border-white/10 overflow-hidden hover:border-violet-500/30 transition-all duration-500">
                <CardContent className="p-8 h-full flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/30 transition-all" />
                  
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-6 text-violet-300">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-violet-300 transition-colors">Intelligent Q&A</h3>
                    <p className="text-white/60 text-lg leading-relaxed max-w-md">
                      Ask complex questions about research trends, specific papers, or authors using natural language. Powered by LLM and Knowledge Graph.
                    </p>
                  </div>
                  
                  <div className="mt-8 flex items-center text-violet-400 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    Try it now <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Feature 2 */}
            <Link href="/network" className="group">
              <Card className="h-full bg-white/[0.02] border-white/10 overflow-hidden hover:bg-white/[0.04] transition-all duration-500">
                <CardContent className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-300">
                      <Network className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-emerald-300 transition-colors">Collaboration Graph</h3>
                    <p className="text-white/60">
                      Explore academic connections and co-author networks in an interactive 3D space.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Feature 3 */}
            <Link href="/papers" className="group">
              <Card className="h-full bg-white/[0.02] border-white/10 overflow-hidden hover:bg-white/[0.04] transition-all duration-500">
                <CardContent className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 text-amber-300">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-amber-300 transition-colors">Paper Library</h3>
                    <p className="text-white/60">
                      Browse and filter papers by conference, rating, and review count with advanced sorting.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Feature 4 */}
            <Link href="/stats" className="group md:col-span-2">
              <Card className="h-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-white/10 overflow-hidden hover:border-blue-500/30 transition-all duration-500">
                <CardContent className="p-8 h-full flex flex-col justify-between relative">
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 group-hover:bg-blue-500/30 transition-all" />
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-300">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-300 transition-colors">Deep Analytics</h3>
                    <p className="text-white/60 text-lg leading-relaxed max-w-md">
                      Gain insights into acceptance rates, score distributions, and reviewer sentiments across different conferences.
                    </p>
                  </div>

                  <div className="mt-8 flex items-center text-blue-400 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    View stats <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Conference Stats Mini-Cards */}
        {stats && (
          <section className="pb-24 px-4 max-w-7xl mx-auto">
            <h2 className="text-sm font-mono text-white/30 uppercase tracking-widest mb-6 text-center">Conference Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(stats.by_conference).map(([conf, data]) => (
                <div key={conf} className="group relative">
                  <div className={cn(
                    "absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500",
                    conf === "ICLR" ? "bg-blue-500" : 
                    conf === "ICML" ? "bg-violet-500" : "bg-teal-500"
                  )} />
                  <Card className="relative bg-black border-white/10 overflow-hidden">
                    <div className={cn(
                      "absolute top-0 left-0 w-1 h-full",
                      conf === "ICLR" ? "bg-blue-500" : 
                      conf === "ICML" ? "bg-violet-500" : "bg-teal-500"
                    )} />
                    <CardContent className="p-6 pl-8">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{conf} 2025</h3>
                          <div className="text-xs text-white/40">Conference</div>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          conf === "ICLR" ? "bg-blue-500/20 text-blue-300" : 
                          conf === "ICML" ? "bg-violet-500/20 text-violet-300" : "bg-teal-500/20 text-teal-300"
                        )}>
                          {data.acceptance_rate}% Rate
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-white/5">
                          <div className="text-white/40 text-[10px] uppercase">Total</div>
                          <div className="font-mono text-sm">{data.total}</div>
                        </div>
                        <div className="p-2 rounded bg-emerald-500/10">
                          <div className="text-emerald-500/40 text-[10px] uppercase">Accept</div>
                          <div className="font-mono text-sm text-emerald-400">{data.accepted}</div>
                        </div>
                        <div className="p-2 rounded bg-rose-500/10">
                          <div className="text-rose-500/40 text-[10px] uppercase">Reject</div>
                          <div className="font-mono text-sm text-rose-400">{data.rejected}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}