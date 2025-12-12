"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // 标题
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white mt-2 mb-1">{children}</h3>
          ),
          // 段落
          p: ({ children }) => (
            <p className="text-white/70 leading-relaxed mb-3">{children}</p>
          ),
          // 列表
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-white/70 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-white/70 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-white/70">{children}</li>
          ),
          // 引用
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-violet-500/50 pl-4 my-3 text-white/60 italic">
              {children}
            </blockquote>
          ),
          // 代码
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-violet-300" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={`${className} block bg-black/50 p-4 rounded-lg text-sm font-mono overflow-x-auto`} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-black/50 rounded-lg overflow-x-auto mb-3">
              {children}
            </pre>
          ),
          // 表格
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-white/10">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/5">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-white/10 px-3 py-2 text-left text-white/80 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-2 text-white/60">
              {children}
            </td>
          ),
          // 链接
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline"
            >
              {children}
            </a>
          ),
          // 强调
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/80">{children}</em>
          ),
          // 分割线
          hr: () => (
            <hr className="border-white/10 my-4" />
          ),
          // 图片
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full rounded-lg my-3" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

