"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { getAuthor, getAuthorEgoNetwork, type AuthorDetail, type GraphNode, type GraphEdge } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, getStatusColor, getConferenceColor } from "@/lib/utils"
import { ArrowLeft, Users, FileText, Award, Network, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic import for Force Graph (client-side only)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

export default function AuthorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const authorId = decodeURIComponent(id)
  
  const [author, setAuthor] = useState<AuthorDetail | null>(null)
  const [network, setNetwork] = useState<{ nodes: GraphNode[]; links: GraphEdge[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNetwork, setShowNetwork] = useState(false)
  
  useEffect(() => {
    Promise.all([
      getAuthor(authorId),
      getAuthorEgoNetwork(authorId, 1)
    ])
      .then(([authorData, networkData]) => {
        setAuthor(authorData)
        setNetwork(networkData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [authorId])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }
  
  if (!author) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/50">作者不存在</p>
        <Link href="/authors">
          <Button variant="outline">返回作者列表</Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <Link href="/authors" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回作者列表
        </Link>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-violet-500/25">
              {author.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{author.name}</h1>
              <p className="text-white/50 text-sm mt-1">{author.authorid}</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 text-violet-400" />
                <div className="text-2xl font-bold">{author.paper_count}</div>
                <div className="text-xs text-white/50">论文总数</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                <div className="text-2xl font-bold text-emerald-400">{author.accept_rate}%</div>
                <div className="text-xs text-white/50">接收率</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-fuchsia-400" />
                <div className="text-2xl font-bold">{author.collaborators?.length || 0}</div>
                <div className="text-xs text-white/50">合作者</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Network className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                <div className="text-2xl font-bold">{Object.keys(author.conferences || {}).length}</div>
                <div className="text-xs text-white/50">参与会议</div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Conference Distribution */}
        {author.conferences && Object.keys(author.conferences).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>会议分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(author.conferences).map(([conf, count]) => (
                  <div 
                    key={conf}
                    className={cn(
                      "px-4 py-2 rounded-lg border",
                      getConferenceColor(conf)
                    )}
                  >
                    <span className="font-medium">{conf}</span>
                    <span className="ml-2 opacity-70">{count} 篇</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Ego Network Visualization */}
        {network && network.nodes.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-violet-400" />
                  协作网络
                </CardTitle>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setShowNetwork(!showNetwork)}
                >
                  {showNetwork ? "隐藏" : "显示"}图谱
                </Button>
              </div>
            </CardHeader>
            {showNetwork && (
              <CardContent>
                <div className="h-[400px] rounded-lg overflow-hidden bg-black/50 border border-white/10">
                  <ForceGraph2D
                    graphData={{
                      nodes: network.nodes.map(n => ({ ...n, name: n.label })),
                      links: network.links
                    }}
                    nodeLabel="name"
                    nodeColor={(node) => (node as { color?: string }).color || "#8b5cf6"}
                    nodeRelSize={6}
                    linkWidth={(link) => Math.sqrt((link as { weight?: number }).weight || 1)}
                    linkColor={() => "rgba(255,255,255,0.2)"}
                    backgroundColor="transparent"
                    width={800}
                    height={400}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Papers */}
          <Card>
            <CardHeader>
              <CardTitle>发表论文 ({author.papers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-3">
              {author.papers?.map((paper) => (
                <Link key={paper.id} href={`/papers/${paper.id}`}>
                  <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn("border text-xs", getConferenceColor(paper.conference))}>
                        {paper.conference}
                      </Badge>
                      <Badge className={cn("border text-xs", getStatusColor(paper.status))}>
                        {paper.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/80 line-clamp-2">{paper.title}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
          
          {/* Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle>合作者 ({author.collaborators?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
              {author.collaborators?.map((collab) => (
                <Link key={collab.authorid} href={`/authors/${encodeURIComponent(collab.authorid)}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/50 to-fuchsia-500/50 flex items-center justify-center text-white text-sm font-medium">
                      {collab.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{collab.name}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {collab.count} 篇合作
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

