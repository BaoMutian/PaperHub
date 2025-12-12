"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getTopAuthors, searchAuthors, type Author } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Search, Users, TrendingUp, Award, Loader2 } from "lucide-react"

export default function AuthorsPage() {
  const [topAuthors, setTopAuthors] = useState<{
    authorid: string
    name: string
    paper_count: number
    accepted_count: number
    acceptance_rate: number
  }[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Author[]>([])
  const [conference, setConference] = useState("")
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  
  useEffect(() => {
    setLoading(true)
    getTopAuthors(conference || undefined, 50)
      .then(setTopAuthors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conference])
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    
    setSearching(true)
    try {
      const result = await searchAuthors(searchQuery)
      setSearchResults(result.results)
    } catch (error) {
      console.error(error)
    } finally {
      setSearching(false)
    }
  }
  
  const conferences = [
    { value: "", label: "全部" },
    { value: "ICLR", label: "ICLR" },
    { value: "ICML", label: "ICML" },
    { value: "NeurIPS", label: "NeurIPS" }
  ]
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">作者排行</h1>
          <p className="text-white/50">
            发现 AI 顶会高产作者，探索学术网络
          </p>
        </div>
        
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="搜索作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "搜索"}
            </Button>
          </form>
          
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {conferences.map((conf) => (
              <Button
                key={conf.value}
                variant="ghost"
                size="sm"
                onClick={() => setConference(conf.value)}
                className={cn(
                  "px-3 h-8",
                  conference === conf.value && "bg-white/10 text-white"
                )}
              >
                {conf.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">搜索结果</h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchResults([])}>
                清除
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((author) => (
                <Link key={author.authorid} href={`/authors/${encodeURIComponent(author.authorid)}`}>
                  <Card className="hover:border-white/20 hover:bg-white/[0.07] transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                          {author.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{author.name}</div>
                          <div className="text-sm text-white/50">
                            {author.paper_count} 篇论文
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Top Authors */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            高产作者 Top 50
            {conference && <Badge variant="outline">{conference}</Badge>}
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topAuthors.map((author, index) => (
                <Link key={author.authorid} href={`/authors/${encodeURIComponent(author.authorid)}`}>
                  <Card className="hover:border-white/20 hover:bg-white/[0.07] transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                          index < 3 ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white" :
                          index < 10 ? "bg-white/10 text-white" :
                          "bg-white/5 text-white/50"
                        )}>
                          {index + 1}
                        </div>
                        
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/50 to-fuchsia-500/50 flex items-center justify-center text-white font-medium">
                          {author.name.charAt(0)}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{author.name}</div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-white/50">
                              <Users className="w-3 h-3 inline mr-1" />
                              {author.paper_count} 篇
                            </span>
                            <span className="text-emerald-400">
                              <Award className="w-3 h-3 inline mr-1" />
                              {author.accepted_count} 中
                            </span>
                          </div>
                        </div>
                        
                        {/* Acceptance Rate */}
                        <div className="text-right">
                          <div className="text-lg font-bold text-white/80">
                            {author.acceptance_rate}%
                          </div>
                          <div className="text-xs text-white/40">接收率</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

