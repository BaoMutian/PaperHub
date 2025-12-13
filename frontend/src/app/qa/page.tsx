"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { askQuestion, getExampleQuestions, type QAResponse } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/ui/markdown"
import { 
  Sparkles, Send, Loader2, Code, Database, 
  MessageSquare, Lightbulb, ChevronRight, RefreshCw, Table
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
  
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 mb-4">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-medium">AI 知识图谱问答</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">智能问答</h1>
          <p className="text-white/50">
            用自然语言提问，AI 自动查询知识图谱并回答
          </p>
        </div>
        
        {/* Chat Area */}
        <Card className="mb-6">
          <CardContent className="p-0">
            {/* Messages */}
            <div className="min-h-[400px] max-h-[500px] overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <p className="text-white/40 mb-6">开始提问，探索 AI 顶会论文知识图谱</p>
                  
                  {/* Example Questions */}
                  <div className="space-y-4 text-left max-w-md mx-auto">
                    {examples.slice(0, 2).map((category) => (
                      <div key={category.category}>
                        <div className="text-xs text-white/40 mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          {category.category}
                        </div>
                        <div className="space-y-2">
                          {category.questions.slice(0, 2).map((q) => (
                            <button
                              key={q}
                              onClick={() => askExample(q)}
                              className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/70 hover:text-white transition-all flex items-center justify-between group"
                            >
                              {q}
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        message.role === "user"
                          ? "bg-violet-500/20 border-violet-500/30"
                          : "bg-white/5 border-white/10"
                      } border rounded-2xl p-4`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-violet-400" />
                          <span className="text-xs text-white/50">AI 回答</span>
                          {message.confidence !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              置信度 {Math.round(message.confidence * 100)}%
                            </Badge>
                          )}
                          {message.query_type && (
                            <Badge variant="secondary" className="text-xs">
                              {message.query_type}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {message.role === "assistant" ? (
                        <Markdown content={message.content} className="text-sm" />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-white/80">
                          {message.content}
                        </p>
                      )}
                      
                      {/* Debug Panel: Cypher Query and Raw Results */}
                      {(message.cypher || message.raw_results) && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            {message.cypher && (
                              <button
                                onClick={() => setShowCypher(showCypher === message.id ? null : message.id)}
                                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                              >
                                <Code className="w-3 h-3" />
                                {showCypher === message.id ? "隐藏" : "查看"} Cypher
                              </button>
                            )}
                            {message.raw_results && message.raw_results.length > 0 && (
                              <button
                                onClick={() => setShowResults(showResults === message.id ? null : message.id)}
                                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <Table className="w-3 h-3" />
                                {showResults === message.id ? "隐藏" : "查看"} 查询结果 ({message.raw_results.length})
                              </button>
                            )}
                          </div>
                          
                          {showCypher === message.id && message.cypher && (
                            <div>
                              <div className="text-xs text-white/40 mb-1">Cypher 查询:</div>
                              <pre className="p-3 rounded-lg bg-black/50 text-xs text-white/60 overflow-x-auto">
                                <code>{message.cypher}</code>
                              </pre>
                            </div>
                          )}
                          
                          {showResults === message.id && message.raw_results && (
                            <div>
                              <div className="text-xs text-white/40 mb-1">
                                数据库返回结果 (共 {message.raw_results.length} 条):
                              </div>
                              <pre className="p-3 rounded-lg bg-black/50 text-xs text-white/60 overflow-x-auto max-h-80 overflow-y-auto">
                                <code>{JSON.stringify(message.raw_results, null, 2)}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-white/30 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      <span className="text-sm text-white/50">思考中...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="border-t border-white/10 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入你的问题..."
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
        
        {/* More Examples */}
        {messages.length > 0 && examples.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                更多问题示例
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examples.map((category) => (
                  <div key={category.category}>
                    <div className="text-xs text-white/40 mb-2">{category.category}</div>
                    <div className="space-y-1">
                      {category.questions.map((q) => (
                        <button
                          key={q}
                          onClick={() => askExample(q)}
                          className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-white/60 hover:text-white transition-all truncate"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Clear Chat */}
        {messages.length > 0 && (
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
              className="text-white/40 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              清空对话
            </Button>
          </div>
        )}
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

