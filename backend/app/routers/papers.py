from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
import logging

from ..services.neo4j_service import Neo4jService, get_neo4j_service
from ..services.embedding_service import EmbeddingService, get_embedding_service
from ..services.llm_service import LLMService, get_llm_service
from ..models.paper import Paper, PaperList, PaperDetail
from ..models.review import ReviewSummary

router = APIRouter(prefix="/papers", tags=["papers"])
logger = logging.getLogger(__name__)


@router.get("", response_model=PaperList)
async def list_papers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    conference: Optional[str] = Query(
        None, description="Filter by conference: ICLR, ICML, NeurIPS"),
    status: Optional[str] = Query(
        None, description="Filter by status: poster, spotlight, oral, rejected, withdrawn"),
    keyword: Optional[str] = Query(None, description="Filter by keyword"),
    sort_by: Optional[str] = Query(
        None, description="Sort by: rating_desc, rating_asc, reviews_desc, reviews_asc, date_desc, date_asc"),
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get paginated list of papers with optional filters and sorting"""
    skip = (page - 1) * page_size
    papers, total = await neo4j.get_papers(
        skip=skip,
        limit=page_size,
        conference=conference,
        status=status,
        keyword=keyword,
        sort_by=sort_by
    )

    return PaperList(
        papers=[Paper(**p) for p in papers],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/search")
async def search_papers(
    q: str = Query(..., min_length=1, description="Search query"),
    mode: str = Query(
        "hybrid", description="Search mode: hybrid, semantic, keyword"),
    limit: int = Query(20, ge=1, le=100),
    neo4j: Neo4jService = Depends(get_neo4j_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """Search papers using hybrid (keyword + semantic), semantic only, or keyword only"""
    query_embedding = None

    # Generate embedding for semantic/hybrid modes
    if mode in ["hybrid", "semantic"]:
        try:
            query_embedding = embedding_service.embed_query(q)
        except Exception as e:
            logger.warning(f"Failed to generate embedding: {e}")
            if mode == "semantic":
                # Fall back to keyword search if semantic fails
                mode = "keyword"

    if mode == "hybrid":
        results = await neo4j.search_papers_hybrid(
            query_text=q,
            embedding=query_embedding,
            limit=limit
        )
    elif mode == "semantic" and query_embedding:
        results = await neo4j.search_papers_semantic(
            embedding=query_embedding,
            limit=limit
        )
    else:
        # Keyword mode or fallback
        results = await neo4j.search_papers_keyword(q, limit=limit)

    return {
        "query": q,
        "mode": mode,
        "results": results,
        "count": len(results)
    }


@router.get("/stats")
async def get_statistics(
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get overall statistics"""
    stats = await neo4j.get_statistics()
    conference_stats = await neo4j.get_conference_stats()

    # Aggregate conference stats
    conf_summary = {}
    for item in conference_stats:
        conf = item["conference"]
        if conf not in conf_summary:
            conf_summary[conf] = {"total": 0, "accepted": 0, "rejected": 0}

        count = item["count"]
        conf_summary[conf]["total"] += count

        if item["status"] in ["poster", "spotlight", "oral"]:
            conf_summary[conf]["accepted"] += count
        elif item["status"] == "rejected":
            conf_summary[conf]["rejected"] += count

    # Calculate acceptance rates
    for conf in conf_summary:
        total = conf_summary[conf]["total"]
        accepted = conf_summary[conf]["accepted"]
        conf_summary[conf]["acceptance_rate"] = round(
            accepted / total * 100, 2) if total > 0 else 0

    return {
        "overall": stats,
        "by_conference": conf_summary
    }


@router.get("/{paper_id}", response_model=PaperDetail)
async def get_paper(
    paper_id: str,
    neo4j: Neo4jService = Depends(get_neo4j_service)
):
    """Get paper details including reviews"""
    paper = await neo4j.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Process authors
    authors = paper.get("authors", [])
    author_names = [a["name"]
                    for a in sorted(authors, key=lambda x: x.get("order", 0))]
    author_ids = [a["authorid"]
                  for a in sorted(authors, key=lambda x: x.get("order", 0))]

    return PaperDetail(
        id=paper["id"],
        title=paper["title"],
        abstract=paper["abstract"],
        keywords=paper.get("keywords", []),
        status=paper["status"],
        conference=paper["conference"],
        authors=author_names,
        authorids=author_ids,
        forum_link=paper.get("forum_link"),
        pdf_link=paper.get("pdf_link"),
        creation_date=paper.get("creation_date"),
        modification_date=paper.get("modification_date"),
        primary_area=paper.get("primary_area"),
        tldr=paper.get("tldr"),
        venue=paper.get("venue"),
        review_count=len(paper.get("reviews", [])),
        reviews=paper.get("reviews", [])
    )


@router.get("/{paper_id}/review-summary")
async def get_review_summary(
    paper_id: str,
    neo4j: Neo4jService = Depends(get_neo4j_service),
    llm: LLMService = Depends(get_llm_service)
):
    """Get LLM-generated summary of reviews for a paper"""
    paper = await neo4j.get_paper_by_id(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    reviews = paper.get("reviews", [])
    # Filter to official reviews only
    official_reviews = [r for r in reviews if r.get(
        "review_type") == "official_review"]

    if not official_reviews:
        raise HTTPException(
            status_code=404, detail="No reviews found for this paper")

    summary = await llm.summarize_reviews(paper["title"], official_reviews)

    return ReviewSummary(
        paper_id=paper_id,
        overall_sentiment=summary.get("overall_sentiment", "unknown"),
        main_strengths=summary.get("main_strengths", []),
        main_weaknesses=summary.get("main_weaknesses", []),
        key_questions=summary.get("key_questions", []),
        recommendation=summary.get("recommendation", ""),
        summary_text=summary.get("summary_text", "")
    )
