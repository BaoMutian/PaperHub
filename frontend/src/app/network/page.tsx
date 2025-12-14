"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { getCollaborationNetwork, type CollaborationNetwork } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Network, Users, GitBranch, Loader2, Maximize2, Minimize2, Box, Grid2x2, Info } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamic imports for Force Graph (client-side only)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
})
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>
})

// Extended node type for force graph
interface ForceGraphNode {
  id: string
  name: string
  val: number
  color: string
  degree: number
  totalPapers: number
  maxCollab: number
  intensity: number
  x?: number
  y?: number
  z?: number
}

export default function NetworkPage() {
  const [network, setNetwork] = useState<CollaborationNetwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [conference, setConference] = useState("")
  const [minCollaborations, setMinCollaborations] = useState(3)
  const [is3D, setIs3D] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  
  // Use refs for tooltip to avoid re-renders
  const [hoveredNode, setHoveredNode] = useState<ForceGraphNode | null>(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  
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
  
  // Track mouse position using ref (no re-renders)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        mousePosRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
        // Update tooltip position directly via DOM
        if (tooltipRef.current) {
          const maxX = (containerRef.current?.clientWidth || 600) - 220
          const x = Math.min(mousePosRef.current.x + 16, maxX)
          const y = Math.max(mousePosRef.current.y - 100, 10)
          tooltipRef.current.style.left = `${x}px`
          tooltipRef.current.style.top = `${y}px`
        }
      }
    }
    
    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", handleMouseMove)
      return () => container.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])
  
  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
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
  
  // CRITICAL: Memoize graphData to prevent force simulation reset on re-renders
  const graphData = useMemo(() => {
    if (!network) return { nodes: [], links: [] }
    
    return {
      nodes: network.nodes.map(n => ({
        id: n.id,
        name: n.label,
        val: n.size || 5,
        color: n.color || "#8b5cf6",
        degree: n.properties?.degree as number || 0,
        totalPapers: n.properties?.total_papers as number || 0,
        maxCollab: n.properties?.max_collab as number || 0,
        intensity: n.properties?.intensity as number || 0
      })),
      links: network.links.map(l => ({
        source: l.source,
        target: l.target,
        value: l.weight
      }))
    }
  }, [network])
  
  // Custom node rendering for 2D - stable callback
  const nodeCanvasObject = useCallback((node: ForceGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = node.val || 5
    const x = node.x || 0
    const y = node.y || 0
    
    // Draw outer glow for high-intensity nodes
    if (node.intensity > 0.5) {
      const glowSize = size * 1.5
      const gradient = ctx.createRadialGradient(x, y, size * 0.5, x, y, glowSize)
      gradient.addColorStop(0, node.color + "40")
      gradient.addColorStop(1, "transparent")
      ctx.beginPath()
      ctx.arc(x, y, glowSize, 0, 2 * Math.PI)
      ctx.fillStyle = gradient
      ctx.fill()
    }
    
    // Draw main circle with gradient
    const mainGradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size)
    mainGradient.addColorStop(0, node.color + "ff")
    mainGradient.addColorStop(0.7, node.color + "cc")
    mainGradient.addColorStop(1, node.color + "88")
    
    ctx.beginPath()
    ctx.arc(x, y, size, 0, 2 * Math.PI)
    ctx.fillStyle = mainGradient
    ctx.fill()
    
    // Draw border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = Math.max(0.5, size * 0.1)
    ctx.stroke()
    
    // Draw label for larger nodes or when zoomed in
    const showLabel = globalScale > 1.5 || size > 12
    if (showLabel) {
      const fontSize = Math.max(3, Math.min(size * 0.5, 10 / globalScale))
      ctx.font = `${fontSize}px "Inter", sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      
      // Text shadow for readability
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillText(node.name, x + 0.5, y + size + 2.5)
      ctx.fillStyle = "#ffffff"
      ctx.fillText(node.name, x, y + size + 2)
    }
  }, [])
  
  // Handle node hover - pause simulation on hover to prevent jitter
  const handleNodeHover = useCallback((node: ForceGraphNode | null) => {
    setHoveredNode(node)
    // Pause/resume force simulation on hover
    if (fgRef.current) {
      if (node) {
        fgRef.current.pauseAnimation()
      } else {
        fgRef.current.resumeAnimation()
      }
    }
  }, [])
  
  // Link styling based on weight
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkColor = useCallback((link: any) => {
    const weight = link.value || 1
    const alpha = Math.min(0.15 + weight * 0.08, 0.6)
    return `rgba(255, 255, 255, ${alpha})`
  }, [])
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkWidth = useCallback((link: any) => {
    const weight = link.value || 1
    return Math.sqrt(weight) * 1.2
  }, [])
  
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
            <>
              {is3D ? (
                <ForceGraph3D
                  graphData={graphData}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  nodeLabel={(node: any) => `${node.name}\n合作者: ${node.degree} | 论文: ${node.totalPapers}`}
                  nodeColor="color"
                  nodeVal="val"
                  nodeRelSize={1}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  linkWidth={linkWidth as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  linkColor={linkColor as any}
                  linkOpacity={0.6}
                  backgroundColor="#000000"
                  showNavInfo={false}
                  nodeResolution={16}
                />
              ) : (
                <ForceGraph2D
                  ref={fgRef}
                  graphData={graphData}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  nodeCanvasObject={nodeCanvasObject as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    const size = (node.val || 5) * 1.5
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(node.x || 0, node.y || 0, size, 0, 2 * Math.PI)
                    ctx.fill()
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onNodeHover={handleNodeHover as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  linkWidth={linkWidth as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  linkColor={linkColor as any}
                  linkDirectionalParticles={0}
                  backgroundColor="transparent"
                  warmupTicks={100}
                  cooldownTicks={0}
                  d3AlphaDecay={0.05}
                  d3VelocityDecay={0.5}
                />
              )}
              
              {/* Tooltip for hovered node - positioned by mouse ref */}
              {hoveredNode && !is3D && (
                <div 
                  ref={tooltipRef}
                  className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 shadow-2xl"
                  style={{
                    left: Math.min(mousePosRef.current.x + 16, (containerRef.current?.clientWidth || 600) - 220),
                    top: Math.max(mousePosRef.current.y - 100, 10),
                  }}
                >
                  <div className="font-semibold text-white mb-2">{hoveredNode.name}</div>
                  <div className="text-sm space-y-1 text-white/70">
                    <div className="flex justify-between gap-4">
                      <span>合作者数量:</span>
                      <span className="text-violet-400 font-medium">{hoveredNode.degree}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>合作论文总数:</span>
                      <span className="text-fuchsia-400 font-medium">{hoveredNode.totalPapers}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>最强合作关系:</span>
                      <span className="text-emerald-400 font-medium">{hoveredNode.maxCollab} 篇</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">合作强度:</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{
                            width: `${hoveredNode.intensity * 100}%`,
                            background: `linear-gradient(90deg, #8b5cf6, ${hoveredNode.color})`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-white/50">
              没有足够的数据来显示协作网络
            </div>
          )}
        </div>
        
        {/* Instructions & Legend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-4 text-sm text-white/60">
                <div className="flex-1">
                  <div className="font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    交互说明
                  </div>
                  <ul className="space-y-1">
                    <li>• 拖拽节点可移动位置</li>
                    <li>• 滚轮缩放视图</li>
                    <li>• 悬停节点查看详细信息</li>
                    <li>• 3D模式下可旋转视角</li>
                  </ul>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white/80 mb-2">视觉编码</div>
                  <ul className="space-y-1">
                    <li>• <strong>节点大小</strong> = 合作强度（合作者数 + 论文数）</li>
                    <li>• <strong>连线粗细</strong> = 合作论文数量</li>
                    <li>• <strong>连线粒子</strong> = 数据流动，越快越频繁</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Color Legend */}
          <Card>
            <CardContent className="p-4">
              <div className="font-medium text-white/80 mb-3">合作强度图例</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{
                  background: "linear-gradient(90deg, #8b5cf6 0%, #a855f7 25%, #ec4899 50%, #f97316 75%, #eab308 100%)"
                }} />
              </div>
              <div className="flex justify-between text-xs text-white/50 mt-1">
                <span>较少合作</span>
                <span>中等合作</span>
                <span>频繁合作</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <span className="text-white/60">0-25%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-white/60">25-50%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <span className="text-white/60">50-70%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-white/60">70-85%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-white/60">85-100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
