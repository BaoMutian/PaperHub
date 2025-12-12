const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface Paper {
  id: string
  title: string
  abstract: string
  authors: string[]
  authorids?: string[]
  keywords: string[]
  status: string
  conference: string
  forum_link?: string
  pdf_link?: string
  creation_date?: string
  avg_rating?: number
}

export interface PaperDetail extends Paper {
  primary_area?: string
  tldr?: string
  venue?: string
  modification_date?: string
  review_count: number
  reviews: Review[]
}

export interface Review {
  id: string
  replyto?: string
  number?: number
  cdate?: string
  mdate?: string
  review_type: string
  rating?: number
  confidence?: number
  summary?: string
  strengths?: string
  weaknesses?: string
  questions?: string
  decision?: string
  comment?: string
}

export interface Author {
  authorid: string
  name: string
  paper_count: number
}

export interface AuthorDetail {
  authorid: string
  name: string
  paper_count: number
  papers: { id: string; title: string; status: string; conference: string }[]
  collaborators: { authorid: string; name: string; count: number }[]
  conferences: Record<string, number>
  accept_rate: number
}

export interface GraphNode {
  id: string
  label: string
  type: string
  size?: number
  color?: string
  properties?: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  type?: string
  papers?: string[]
}

export interface CollaborationNetwork {
  nodes: GraphNode[]
  links: GraphEdge[]
  total_authors: number
  total_collaborations: number
  avg_collaborations: number
}

export interface QAResponse {
  answer: string
  cypher_query?: string
  raw_results?: Record<string, unknown>[]
  sources: unknown[]
  confidence: number
  query_type: string
}

export interface ReviewSummary {
  paper_id: string
  overall_sentiment: string
  main_strengths: string[]
  main_weaknesses: string[]
  key_questions: string[]
  recommendation: string
  summary_text: string
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  })
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
  
  return res.json()
}

// Paper APIs
export async function getPapers(params: {
  page?: number
  page_size?: number
  conference?: string
  status?: string
  keyword?: string
}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value))
    }
  })
  return fetchAPI<{ papers: Paper[]; total: number; page: number; page_size: number }>(
    `/papers?${searchParams.toString()}`
  )
}

export async function getPaper(id: string) {
  return fetchAPI<PaperDetail>(`/papers/${id}`)
}

export async function searchPapers(query: string, semantic = true, limit = 20) {
  return fetchAPI<{ query: string; results: Paper[]; count: number }>(
    `/papers/search?q=${encodeURIComponent(query)}&semantic=${semantic}&limit=${limit}`
  )
}

export interface ConferenceStats {
  total: number
  accepted: number
  rejected: number
  acceptance_rate: number
}

export async function getPaperStats() {
  return fetchAPI<{
    overall: Record<string, number>
    by_conference: Record<string, ConferenceStats>
  }>("/papers/stats")
}

export async function getReviewSummary(paperId: string) {
  return fetchAPI<ReviewSummary>(`/papers/${paperId}/review-summary`)
}

// Author APIs
export async function searchAuthors(query: string, limit = 20) {
  return fetchAPI<{ query: string; results: Author[]; count: number }>(
    `/authors/search?q=${encodeURIComponent(query)}&limit=${limit}`
  )
}

export async function getAuthor(authorid: string) {
  return fetchAPI<AuthorDetail>(`/authors/${encodeURIComponent(authorid)}`)
}

export async function getTopAuthors(conference?: string, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (conference) params.set("conference", conference)
  return fetchAPI<{ authorid: string; name: string; paper_count: number; accepted_count: number; acceptance_rate: number }[]>(
    `/authors/top?${params.toString()}`
  )
}

// Graph APIs
export async function getCollaborationNetwork(params: {
  conference?: string
  min_collaborations?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value))
    }
  })
  return fetchAPI<CollaborationNetwork>(`/graph/collaboration-network?${searchParams.toString()}`)
}

export async function getAuthorEgoNetwork(authorid: string, depth = 1) {
  return fetchAPI<{
    center: { id: string; name: string }
    nodes: GraphNode[]
    links: GraphEdge[]
    total_nodes: number
    total_links: number
  }>(`/graph/author-ego-network/${encodeURIComponent(authorid)}?depth=${depth}`)
}

// QA APIs
export async function askQuestion(question: string, includeSources = true) {
  return fetchAPI<QAResponse>("/qa/ask", {
    method: "POST",
    body: JSON.stringify({ question, include_sources: includeSources })
  })
}

export async function getExampleQuestions() {
  return fetchAPI<{
    examples: { category: string; questions: string[] }[]
  }>("/qa/examples")
}

