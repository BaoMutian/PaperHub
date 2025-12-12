from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import logging

from ..services.neo4j_service import Neo4jService, get_neo4j_service
from ..services.llm_service import LLMService, get_llm_service
from ..services.embedding_service import EmbeddingService, get_embedding_service
from ..models.qa import QARequest, QAResponse, SearchRequest

router = APIRouter(prefix="/qa", tags=["qa"])
logger = logging.getLogger(__name__)

# Graph schema for LLM context
GRAPH_SCHEMA = """
Nodes:
- Paper: id, title, abstract, status (rejected/poster/spotlight/oral/withdrawn), conference (ICLR/ICML/NeurIPS), keywords, creation_date, forum_link, pdf_link
- Author: authorid, name
- Review: id, review_type (official_review/rebuttal/decision/comment), rating, summary, strengths, weaknesses, questions, cdate
- Keyword: name
- Conference: name, year, max_rating

Relationships:
- (Author)-[:AUTHORED]->(Paper) with property: order
- (Paper)-[:HAS_REVIEW]->(Review)
- (Paper)-[:HAS_KEYWORD]->(Keyword)
- (Paper)-[:SUBMITTED_TO]->(Conference)
- (Review)-[:REPLIES_TO]->(Review)

Notes:
- Accepted papers have status IN ['poster', 'spotlight', 'oral']
- ICLR ratings: 1-10, ICML ratings: 1-5 (field: overall_recommendation), NeurIPS ratings: 1-6
- Use avg() for average ratings
- Keywords are lowercase
"""


@router.post("/ask", response_model=QAResponse)
async def ask_question(
    request: QARequest,
    neo4j: Neo4jService = Depends(get_neo4j_service),
    llm: LLMService = Depends(get_llm_service)
):
    """Ask a natural language question about the paper database"""
    question = request.question.strip()
    
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Generate Cypher query
    cypher_result = await llm.generate_cypher(question, GRAPH_SCHEMA)
    
    cypher_query = cypher_result.get("cypher")
    parameters = cypher_result.get("parameters", {})
    explanation = cypher_result.get("explanation", "")
    
    if not cypher_query:
        # If cypher generation failed, try to answer directly
        answer = await llm.answer_question(
            question,
            f"This is a database of AI conference papers (ICLR, ICML, NeurIPS 2025). {explanation}",
            None
        )
        return QAResponse(
            answer=answer,
            cypher_query=None,
            raw_results=None,
            sources=[],
            confidence=0.3,
            query_type="fallback"
        )
    
    # Execute query
    try:
        results = await neo4j.execute_query(cypher_query, parameters)
        
        # Generate natural language answer
        answer = await llm.answer_question(
            question,
            f"Query explanation: {explanation}",
            results[:50] if results else []  # Limit results sent to LLM
        )
        
        # Determine query type
        query_type = "unknown"
        q_lower = question.lower()
        if any(word in q_lower for word in ["how many", "count", "统计", "多少"]):
            query_type = "stats"
        elif any(word in q_lower for word in ["which", "what", "哪", "什么"]):
            query_type = "search"
        elif any(word in q_lower for word in ["compare", "比较", "vs"]):
            query_type = "comparison"
        elif any(word in q_lower for word in ["summary", "总结", "缺点", "优点", "weakness", "strength"]):
            query_type = "summary"
        
        return QAResponse(
            answer=answer,
            cypher_query=cypher_query,
            raw_results=results[:100] if request.include_sources else None,
            sources=[{"type": "cypher_query", "content": cypher_query}],
            confidence=0.8 if results else 0.5,
            query_type=query_type
        )
        
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        
        # Try to provide helpful error message
        answer = await llm.answer_question(
            question,
            f"The generated query failed: {str(e)}. Query was: {cypher_query}",
            None
        )
        
        return QAResponse(
            answer=f"查询执行出错，但我尝试回答您的问题：\n\n{answer}",
            cypher_query=cypher_query,
            raw_results=None,
            sources=[],
            confidence=0.2,
            query_type="error"
        )


@router.post("/semantic-search")
async def semantic_search(
    request: SearchRequest,
    neo4j: Neo4jService = Depends(get_neo4j_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """Search papers using semantic similarity"""
    query_embedding = embedding_service.embed_text(request.query)
    
    results = await neo4j.search_papers_semantic(
        embedding=query_embedding,
        limit=request.limit,
        min_score=0.3
    )
    
    return {
        "query": request.query,
        "results": results,
        "count": len(results),
        "semantic": True
    }


@router.get("/examples")
async def get_example_questions():
    """Get example questions users can ask"""
    return {
        "examples": [
            {
                "category": "统计查询",
                "questions": [
                    "ICLR 2025有多少篇论文被接收？",
                    "三大会议的接收率分别是多少？",
                    "哪个关键词在被接收的论文中出现最多？",
                    "平均分超过8分的ICLR论文有哪些？"
                ]
            },
            {
                "category": "作者查询",
                "questions": [
                    "发表论文最多的作者是谁？",
                    "哪些作者在三个会议都有论文？",
                    "某作者的合作者有哪些？"
                ]
            },
            {
                "category": "论文分析",
                "questions": [
                    "关于transformer的论文有哪些？",
                    "接收率最高的研究领域是什么？",
                    "这篇论文的主要缺点是什么？"
                ]
            },
            {
                "category": "比较分析",
                "questions": [
                    "ICML和NeurIPS的接收率哪个更高？",
                    "spotlight论文和poster论文的平均分差多少？"
                ]
            }
        ]
    }

