"use client"

import { useEffect, useState, useRef } from "react"
import { getCollaborationNetwork, type CollaborationNetwork } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Network, Users, GitBranch, Loader2, Maximize2, Minimize2, Box, Grid2x2 } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic imports for Force Graph (client-side only)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false })

export default function NetworkPage() {
  const [network, setNetwork] = useState<CollaborationNetwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [conference, setConference] = useState("")
  const [minCollaborations, setMinCollaborations] = useState(3)
  const [is3D, setIs3D] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    setLoading(true)
    getCollaborationNetwork({
      conference: conference || undefined,
      min_collaborations: minCollaborations,
      limit: 500
    })
      .then(setNetwork)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conference, minCollaborations])
  
  // 监听全屏状态变化（包括ESC键退出）
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
  
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }
  
  const conferences = [
    { value: "", label: "全部会议" },
    { value: "ICLR", label: "ICLR" },
    { value: "ICML", label: "ICML" },
    { value: "NeurIPS", label: "NeurIPS" }
  ]
  
  const minCollabOptions = [
    { value: 2, label: "≥2次" },
    { value: 3, label: "≥3次" },
    { value: 5, label: "≥5次" },
    { value: 10, label: "≥10次" }
  ]
  
  const graphData = network ? {
    nodes: network.nodes.map(n => ({
      id: n.id,
      name: n.label,
      val: n.size || 5,
      color: n.color || "#8b5cf6"
    })),
    links: network.links.map(l => ({
      source: l.source,
      target: l.target,
      value: l.weight
    }))
  } : { nodes: [], links: [] }
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Network className="w-8 h-8 text-violet-400" />
            作者协作网络
          </h1>
          <p className="text-white/50">
            探索 AI 顶会作者之间的协作关系，发现学术圈的社交图谱
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Conference Filter */}
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
          
          {/* Min Collaborations */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            {minCollabOptions.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                onClick={() => setMinCollaborations(opt.value)}
                className={cn(
                  "px-3 h-8",
                  minCollaborations === opt.value && "bg-white/10 text-white"
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIs3D(false)}
              className={cn("px-3 h-8", !is3D && "bg-white/10 text-white")}
            >
              <Grid2x2 className="w-4 h-4 mr-1" />
              2D
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIs3D(true)}
              className={cn("px-3 h-8", is3D && "bg-white/10 text-white")}
            >
              <Box className="w-4 h-4 mr-1" />
              3D
            </Button>
          </div>
          
          {/* Fullscreen */}
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Stats */}
        {network && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-violet-400" />
                <div>
                  <div className="text-2xl font-bold">{network.total_authors}</div>
                  <div className="text-sm text-white/50">作者节点</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <GitBranch className="w-8 h-8 text-fuchsia-400" />
                <div>
                  <div className="text-2xl font-bold">{network.total_collaborations}</div>
                  <div className="text-sm text-white/50">协作关系</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Network className="w-8 h-8 text-emerald-400" />
                <div>
                  <div className="text-2xl font-bold">{network.avg_collaborations.toFixed(1)}</div>
                  <div className="text-sm text-white/50">平均合作次数</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Graph */}
        <div 
          ref={containerRef}
          className={cn(
            "rounded-xl border border-white/10 bg-black/50 overflow-hidden relative",
            isFullscreen ? "fixed inset-0 z-50" : "h-[600px]"
          )}
        >
          {/* 全屏模式下显示退出按钮 */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span className="text-white/50 text-sm">按 ESC 或点击退出全屏</span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={exitFullscreen}
                className="bg-black/50 hover:bg-black/70"
              >
                <Minimize2 className="w-4 h-4 mr-1" />
                退出全屏
              </Button>
            </div>
          )}
          
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            </div>
          ) : network && network.nodes.length > 0 ? (
            is3D ? (
              <ForceGraph3D
                graphData={graphData}
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={4}
                linkWidth={(link) => Math.sqrt((link as { value?: number }).value || 1)}
                linkColor={() => "rgba(255,255,255,0.15)"}
                backgroundColor="#000000"
                showNavInfo={false}
              />
            ) : (
              <ForceGraph2D
                graphData={graphData}
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={4}
                linkWidth={(link) => Math.sqrt((link as { value?: number }).value || 1)}
                linkColor={() => "rgba(255,255,255,0.2)"}
                backgroundColor="transparent"
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-white/50">
              没有足够的数据来显示协作网络
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-4 text-sm text-white/60">
              <div className="flex-1">
                <div className="font-medium text-white/80 mb-1">交互说明</div>
                <ul className="space-y-1">
                  <li>• 拖拽节点可移动位置</li>
                  <li>• 滚轮缩放视图</li>
                  <li>• 点击节点查看作者名称</li>
                  <li>• 3D模式下可旋转视角</li>
                </ul>
              </div>
              <div className="flex-1">
                <div className="font-medium text-white/80 mb-1">视觉编码</div>
                <ul className="space-y-1">
                  <li>• 节点大小 = 协作关系数量</li>
                  <li>• 连线粗细 = 合作论文数</li>
                  <li>• 越靠近中心 = 协作越频繁</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

