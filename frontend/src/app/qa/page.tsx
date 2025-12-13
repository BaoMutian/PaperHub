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
  Bot, User, Zap, ArrowUp, Terminal, Cpu
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
  const [expandedDebug, setExpandedDebug] = useState<string | null>(null)
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
  
  // Track if initial query has been submitted
  const initialQuerySubmitted = useRef(false)
  
  // Auto-submit initial query
  useEffect(() => {
    if (initialQuery && messages.length === 0 && !initialQuerySubmitted.current) {
      initialQuerySubmitted.current = true
      handleSubmit(new Event("submit") as unknown as React.FormEvent, initialQuery)
    }
  }, [initialQuery])
  
  const handleSubmit = async (e: React.FormEvent, questionOverride?: string) => {
    e.preventDefault()
    const question = questionOverride || input.trim()
    if (!question || loading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)
    
    // 重置输入框高度
    if (inputRef.current) inputRef.current.style.height = "auto"
    
    try {
      const response = await askQuestion(question)
      
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
    <div className="min-h-screen flex flex-col relative bg-background selection:bg-violet-500/30">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] bg-fuchsia-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center py-20 animate-fade-in">
              {/* Hero Icon */}
              <div className="relative mb-10 group cursor-default">
                <div className="absolute -inset-8 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/20 transform group-hover:scale-105 transition-transform duration-500">
                  <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        
              <h1 className="text-4xl font-bold mb-4 text-center">
                <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                  有什么可以帮你的吗？
                </span>
              </h1>
              <p className="text-lg text-white/40 text-center max-w-lg mb-12">
                我是你的 AI 学术助手，基于知识图谱构建。<br/>
                你可以问我关于 ICLR、ICML、NeurIPS 论文的任何问题。
              </p>
                  
              {/* Example Categories */}
              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
                {examples.slice(0, 4).map((category, idx) => (
                  <div key={category.category} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-white/30 uppercase tracking-wider px-2">
                      {idx === 0 && <Terminal className="w-3 h-3" />}
                      {idx === 1 && <Cpu className="w-3 h-3" />}
                      {idx === 2 && <Zap className="w-3 h-3" />}
                      {idx === 3 && <BarChart3 className="w-3 h-3" />}
                          {category.category}
                        </div>
                    <div className="grid gap-2">
                          {category.questions.slice(0, 2).map((q) => (
                            <button
                              key={q}
                              onClick={() => askExample(q)}
                          className="w-full text-left p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-violet-500/30 transition-all duration-200 group relative overflow-hidden"
                        >
                          <div className="relative z-10 flex items-center justify-between">
                            <span className="text-sm text-white/70 group-hover:text-white transition-colors line-clamp-1">{q}</span>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                          </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
            /* Chat Messages */
            <div className="py-8 space-y-8">
              {messages.map((message) => (
                  <div
                    key={message.id}
                  className={cn(
                    "group flex gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                  >
                  {/* Avatar */}
                  <div className={cn(
                    "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg",
                        message.role === "user"
                      ? "bg-gradient-to-br from-white/10 to-white/5 border border-white/10" 
                      : "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-500/20"
                  )}>
                    {message.role === "user" ? (
                      <User className="w-5 h-5 text-white/70" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* Message Body */}
                  <div className={cn(
                    "flex-1 max-w-[85%]",
                    message.role === "user" && "flex flex-col items-end"
                  )}>
                    {/* Meta Info */}
                    <div className={cn(
                      "flex items-center gap-3 mb-2 text-xs text-white/30",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="font-medium">
                        {message.role === "user" ? "You" : "PaperHub AI"}
                      </span>
                      {message.role === "assistant" && (
                        <>
                          {message.confidence !== undefined && (
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-1.5 py-0 h-4 border-white/10",
                              message.confidence > 0.8 ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
                            )}>
                              {Math.round(message.confidence * 100)}% Conf.
                            </Badge>
                          )}
                          {message.query_type && (
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                              {message.query_type}
                            </span>
                          )}
                        </>
                          )}
                        </div>
                    
                    {/* Content Bubble */}
                    <div className={cn(
                      "relative rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "bg-white/[0.08] text-white/90 rounded-tr-none"
                        : "bg-transparent border border-white/5 bg-white/[0.02] text-white/80 rounded-tl-none w-full"
                    )}>
                      {message.role === "assistant" ? (
                        <Markdown content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      
                      {/* Debug Trigger */}
                      {message.role === "assistant" && (message.cypher || message.raw_results) && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                          <button
                            onClick={() => setExpandedDebug(expandedDebug === message.id ? null : message.id)}
                            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-violet-400 transition-colors"
                          >
                            <Terminal className="w-3 h-3" />
                            {expandedDebug === message.id ? "收起调试信息" : "查看查询详情"}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Debug Panel (Collapsible) */}
                    {message.role === "assistant" && expandedDebug === message.id && (
                      <div className="w-full mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {message.cypher && (
                          <div className="rounded-lg bg-[#0d1117] border border-white/10 overflow-hidden">
                            <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                              <span className="text-xs font-mono text-white/40 flex items-center gap-2">
                                <Code className="w-3 h-3" /> CYPHER QUERY
                              </span>
                            </div>
                            <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap">
                              <code>{message.cypher}</code>
                            </pre>
                        </div>
                      )}
                      
                        {message.raw_results && (
                          <div className="rounded-lg bg-[#0d1117] border border-white/10 overflow-hidden">
                            <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                              <span className="text-xs font-mono text-white/40 flex items-center gap-2">
                                <Database className="w-3 h-3" /> RAW RESULTS
                              </span>
                              <span className="text-[10px] text-white/20">{message.raw_results.length} records</span>
                            </div>
                            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[300px] overflow-y-auto">
                              <code>{JSON.stringify(message.raw_results, null, 2)}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
              ))}
              
              {/* Loading State */}
              {loading && (
                <div className="flex gap-5 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/50 to-fuchsia-600/50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white/50" />
                    </div>
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-white/5 rounded" />
                    <div className="h-10 w-48 bg-white/5 rounded-xl" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
            </div>
            
        {/* Input Area */}
        <div className="flex-shrink-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-10">
          <div className="max-w-3xl mx-auto relative">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="absolute -top-10 left-1/2 -translate-x-1/2 text-white/30 hover:text-white hover:bg-white/5 text-xs h-8 rounded-full"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                开启新对话
              </Button>
            )}
            
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl opacity-20 group-focus-within:opacity-50 transition-opacity duration-500 blur" />
              <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="问我任何关于论文的问题... (Shift+Enter 换行)"
                  rows={1}
                  className="flex-1 bg-transparent border-0 resize-none text-sm text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-0 px-3 py-3 max-h-[200px] scrollbar-thin scrollbar-thumb-white/10"
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={loading || !input.trim()}
                  className={cn(
                    "h-10 w-10 rounded-xl transition-all duration-300 mb-1 mr-1",
                    input.trim() 
                      ? "bg-white text-black hover:bg-white/90 hover:scale-105" 
                      : "bg-white/10 text-white/30 hover:bg-white/20"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </Button>
              </div>
              </form>
            <p className="text-center text-[10px] text-white/20 mt-3 font-medium tracking-wide">
              PaperHub AI Assistant · Power by LLM + Knowledge Graph
            </p>
                    </div>
                  </div>
              </div>
        
      {/* Import BarChart3 for use in examples */}
      <div className="hidden">
        <BarChart3 />
      </div>
    </div>
  )
}

export default function QAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    }>
      <QAContent />
    </Suspense>
  )
}

// Add missing icon import
import { BarChart3 } from "lucide-react"
