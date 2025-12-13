"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { askQuestion, getExampleQuestions, type QAResponse } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { cn } from "@/lib/utils"
import { 
  Sparkles, Send, Loader2, Code, Database, 
  MessageSquare, Lightbulb, ChevronRight, RefreshCw, Table,
  Bot, User, Zap, ArrowUp
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  cypher?: string
  raw_results?: Record<string, unknown>[]
  confidence?: number
  query_type?: string
  timestamp: Date
}

function QAContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [examples, setExamples] = useState<{ category: string; questions: string[] }[]>([])
  const [showCypher, setShowCypher] = useState<string | null>(null)
  const [showResults, setShowResults] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  useEffect(() => {
    getExampleQuestions()
      .then((data) => setExamples(data.examples))
      .catch(console.error)
  }, [])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  
  // Auto-submit initial query
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSubmit(new Event("submit") as unknown as React.FormEvent, initialQuery)
    }
  }, [initialQuery])
  
  const handleSubmit = async (e: React.FormEvent, questionOverride?: string) => {
    e.preventDefault()
    const question = questionOverride || input.trim()
    if (!question || loading) return
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)
    
    try {
      const response = await askQuestion(question)
      
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        cypher: response.cypher_query || undefined,
        raw_results: response.raw_results || undefined,
        confidence: response.confidence,
        query_type: response.query_type,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，处理您的问题时出错了。请稍后重试。",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }
  
  const askExample = (question: string) => {
    setInput(question)
    handleSubmit(new Event("submit") as unknown as React.FormEvent, question)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px"
    }
  }, [input])
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center px-4 py-12">
              {/* Hero */}
              <div className="relative mb-8">
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 rounded-full blur-2xl" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/25">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                智能问答助手
              </h1>
              <p className="text-white/50 text-center max-w-md mb-10">
                基于知识图谱的 AI 顶会论文智能问答系统<br/>
                用自然语言提问，探索 ICLR、ICML、NeurIPS 论文数据
              </p>
              
              {/* Example Questions Grid */}
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3">
                {examples.slice(0, 4).map((category, idx) => (
                  <div key={category.category} className="space-y-2 py-6">
                    <div className="flex items-center gap-2 text-xs text-white/40 px-1">
                      <Zap className={cn(
                        "w-3 h-3",
                        idx === 0 ? "text-violet-400" :
                        idx === 1 ? "text-fuchsia-400" :
                        idx === 2 ? "text-emerald-400" : "text-amber-400"
                      )} />
                      {category.category}
                    </div>
                    {category.questions.slice(0, 2).map((q) => (
                      <button
                        key={q}
                        onClick={() => askExample(q)}
                        className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-sm text-white/70 hover:text-white transition-all duration-200 group"
                      >
                        <span className="line-clamp-2">{q}</span>
                        <ChevronRight className="w-4 h-4 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/40" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Capabilities */}
              <div className="flex flex-wrap justify-center gap-2 mt-10">
                {["论文统计", "作者查询", "关键词分析", "评分分布", "接收率对比"].map((cap) => (
                  <span key={cap} className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/40">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="px-4 py-6 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                    message.role === "user" 
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" 
                      : "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
                  )}>
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className={cn(
                    "flex-1 min-w-0",
                    message.role === "user" ? "max-w-[80%]" : "max-w-[90%]"
                  )}>
                    {/* Header */}
                    <div className={cn(
                      "flex items-center gap-2 mb-2 text-xs",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}>
                      <span className="text-white/40">
                        {message.role === "user" ? "你" : "AI 助手"}
                      </span>
                      {message.role === "assistant" && message.confidence !== undefined && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400/80">
                          {Math.round(message.confidence * 100)}%
                        </Badge>
                      )}
                      {message.role === "assistant" && message.query_type && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-white/5 text-white/50 hover:bg-white/5">
                          {message.query_type}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className={cn(
                      "rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20"
                        : "bg-white/[0.03] border border-white/[0.06]"
                    )}>
                      {message.role === "assistant" ? (
                        <Markdown content={message.content} className="text-sm text-white/80 prose-headings:text-white prose-strong:text-white" />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-white/90">
                          {message.content}
                        </p>
                      )}
                    </div>
                    
                    {/* Debug Panel */}
                    {message.role === "assistant" && (message.cypher || message.raw_results) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {message.cypher && (
                          <button
                            onClick={() => setShowCypher(showCypher === message.id ? null : message.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",
                              showCypher === message.id 
                                ? "bg-violet-500/20 text-violet-300" 
                                : "text-white/40 hover:text-violet-400 hover:bg-white/5"
                            )}
                          >
                            <Code className="w-3 h-3" />
                            Cypher
                          </button>
                        )}
                        {message.raw_results && message.raw_results.length > 0 && (
                          <button
                            onClick={() => setShowResults(showResults === message.id ? null : message.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",
                              showResults === message.id 
                                ? "bg-emerald-500/20 text-emerald-300" 
                                : "text-white/40 hover:text-emerald-400 hover:bg-white/5"
                            )}
                          >
                            <Table className="w-3 h-3" />
                            数据 ({message.raw_results.length})
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Expandable Panels */}
                    {showCypher === message.id && message.cypher && (
                      <div className="mt-2 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                          <Code className="w-3 h-3 text-violet-400" />
                          <span className="text-xs text-white/50">Cypher 查询</span>
                        </div>
                        <pre className="p-3 text-xs text-white/60 overflow-x-auto font-mono">
                          <code>{message.cypher}</code>
                        </pre>
                      </div>
                    )}
                    
                    {showResults === message.id && message.raw_results && (
                      <div className="mt-2 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
                          <Table className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-white/50">查询结果 ({message.raw_results.length} 条)</span>
                        </div>
                        <pre className="p-3 text-xs text-white/60 overflow-x-auto max-h-60 overflow-y-auto font-mono">
                          <code>{JSON.stringify(message.raw_results, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <div className={cn(
                      "text-[10px] text-white/30 mt-1.5",
                      message.role === "user" ? "text-right" : "text-left"
                    )}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading */}
              {loading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-white/40 mb-2">AI 助手</div>
                    <div className="rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.06] inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span className="text-sm text-white/50">正在查询知识图谱...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Input Area - Fixed at bottom */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-6 px-4">
          {/* Clear button */}
          {messages.length > 0 && (
            <div className="flex justify-center mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="text-white/30 hover:text-white/60 h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                新对话
              </Button>
            </div>
          )}
          
          {/* Input */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus-within:border-violet-500/30 focus-within:bg-white/[0.05] transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
                rows={1}
                className="flex-1 bg-transparent border-0 resize-none text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-0 px-2 py-2 max-h-[200px]"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="sm"
                disabled={loading || !input.trim()}
                className={cn(
                  "h-9 w-9 p-0 rounded-xl transition-all",
                  input.trim() 
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/25" 
                    : "bg-white/10"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
          
          {/* Footer hint */}
          <p className="text-center text-[10px] text-white/20 mt-3">
            AI 可能会犯错，请核实重要信息 · 基于 Neo4j 知识图谱
          </p>
        </div>
      </div>
    </div>
  )
}

export default function QAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-sm text-white/40">加载中...</p>
        </div>
      </div>
    }>
      <QAContent />
    </Suspense>
  )
}
