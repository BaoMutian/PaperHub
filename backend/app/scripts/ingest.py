"""
Data Ingestion Script for AI Conference Papers Knowledge Graph

This script reads the JSONL files and populates the Neo4j database with:
- Paper nodes
- Author nodes  
- Review nodes
- Keyword nodes
- Conference nodes
- All relationships between them
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from neo4j import AsyncGraphDatabase

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password123"

# Conference configurations
CONFERENCE_CONFIG = {
    "ICLR": {"year": 2025, "max_rating": 10, "rating_field": "rating"},
    "ICML": {"year": 2025, "max_rating": 5, "rating_field": "overall_recommendation"},
    "NeurIPS": {"year": 2025, "max_rating": 6, "rating_field": "rating"}
}

# Data paths
DATA_DIR = Path(__file__).parent.parent.parent.parent / "papers"


def determine_review_type(review: Dict[str, Any]) -> str:
    """Determine the type of review based on invitations field"""
    invitations = review.get("invitations", [])
    inv_str = " ".join(invitations).lower()
    
    if "decision" in inv_str:
        return "decision"
    elif "official_review" in inv_str and "rebuttal" not in inv_str:
        return "official_review"
    elif "rebuttal" in inv_str:
        return "rebuttal"
    elif "meta" in inv_str:
        return "meta_review"
    elif "comment" in inv_str:
        return "comment"
    else:
        return "other"


def extract_rating(content: Dict[str, Any], conference: str) -> Optional[float]:
    """Extract rating from review content based on conference"""
    config = CONFERENCE_CONFIG.get(conference, {})
    rating_field = config.get("rating_field", "rating")
    
    # Try the configured field first
    if rating_field in content:
        value = content[rating_field].get("value")
        if isinstance(value, (int, float)):
            return float(value)
        elif isinstance(value, str):
            # Try to extract number from string like "8: Strong Accept"
            try:
                return float(value.split(":")[0].strip())
            except:
                pass
    
    # Fallback to common fields
    for field in ["rating", "overall_recommendation", "recommendation"]:
        if field in content:
            value = content[field].get("value")
            if isinstance(value, (int, float)):
                return float(value)
            elif isinstance(value, str):
                try:
                    return float(value.split(":")[0].strip())
                except:
                    pass
    
    return None


def extract_text_field(content: Dict[str, Any], field: str) -> Optional[str]:
    """Extract text value from content field"""
    if field in content:
        value = content[field].get("value")
        if isinstance(value, str):
            return value
    return None


class DataIngester:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.stats = {
            "papers": 0,
            "authors": 0,
            "reviews": 0,
            "keywords": 0,
            "conferences": 0,
            "relationships": 0
        }
    
    async def close(self):
        await self.driver.close()
    
    async def create_schema(self):
        """Create constraints and indexes"""
        schema_queries = [
            # Constraints
            "CREATE CONSTRAINT paper_id IF NOT EXISTS FOR (p:Paper) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT author_id IF NOT EXISTS FOR (a:Author) REQUIRE a.authorid IS UNIQUE",
            "CREATE CONSTRAINT review_id IF NOT EXISTS FOR (r:Review) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT keyword_name IF NOT EXISTS FOR (k:Keyword) REQUIRE k.name IS UNIQUE",
            
            # Indexes
            "CREATE INDEX paper_status IF NOT EXISTS FOR (p:Paper) ON (p.status)",
            "CREATE INDEX paper_conference IF NOT EXISTS FOR (p:Paper) ON (p.conference)",
            "CREATE INDEX review_type IF NOT EXISTS FOR (r:Review) ON (r.review_type)",
            "CREATE INDEX review_rating IF NOT EXISTS FOR (r:Review) ON (r.rating)",
            "CREATE INDEX author_name IF NOT EXISTS FOR (a:Author) ON (a.name)",
        ]
        
        async with self.driver.session() as session:
            for query in schema_queries:
                try:
                    await session.run(query)
                    logger.info(f"Schema: {query[:60]}...")
                except Exception as e:
                    logger.warning(f"Schema warning: {e}")
    
    async def create_conference(self, name: str, year: int, max_rating: int):
        """Create or merge a conference node"""
        query = """
        MERGE (c:Conference {name: $name, year: $year})
        SET c.max_rating = $max_rating
        """
        async with self.driver.session() as session:
            await session.run(query, {"name": name, "year": year, "max_rating": max_rating})
    
    async def ingest_paper(self, paper: Dict[str, Any]):
        """Ingest a single paper with all its relationships"""
        paper_id = paper.get("id")
        if not paper_id:
            return
        
        conference = paper.get("conference", "")
        
        # Create paper node
        paper_query = """
        MERGE (p:Paper {id: $id})
        SET p.title = $title,
            p.abstract = $abstract,
            p.status = $status,
            p.conference = $conference,
            p.creation_date = $creation_date,
            p.modification_date = $modification_date,
            p.forum_link = $forum_link,
            p.pdf_link = $pdf_link,
            p.venue = $venue,
            p.primary_area = $primary_area,
            p.tldr = $tldr,
            p.keywords = $keywords
        """
        
        paper_params = {
            "id": paper_id,
            "title": paper.get("title", ""),
            "abstract": paper.get("abstract", ""),
            "status": paper.get("status", ""),
            "conference": conference,
            "creation_date": paper.get("creation_date"),
            "modification_date": paper.get("modification_date"),
            "forum_link": paper.get("forum_link"),
            "pdf_link": paper.get("pdf_link"),
            "venue": paper.get("venue"),
            "primary_area": paper.get("primary_area"),
            "tldr": paper.get("TLDR"),
            "keywords": paper.get("keywords", [])
        }
        
        async with self.driver.session() as session:
            await session.run(paper_query, paper_params)
            self.stats["papers"] += 1
            
            # Link to conference
            if conference:
                conf_query = """
                MATCH (p:Paper {id: $paper_id})
                MERGE (c:Conference {name: $conference, year: 2025})
                MERGE (p)-[:SUBMITTED_TO]->(c)
                """
                await session.run(conf_query, {"paper_id": paper_id, "conference": conference})
                self.stats["relationships"] += 1
            
            # Create authors and relationships
            authors = paper.get("authors", [])
            authorids = paper.get("authorids", [])
            
            for i, (name, authorid) in enumerate(zip(authors, authorids)):
                author_query = """
                MERGE (a:Author {authorid: $authorid})
                SET a.name = $name
                WITH a
                MATCH (p:Paper {id: $paper_id})
                MERGE (a)-[r:AUTHORED]->(p)
                SET r.order = $order
                """
                await session.run(author_query, {
                    "authorid": authorid,
                    "name": name,
                    "paper_id": paper_id,
                    "order": i
                })
                self.stats["authors"] += 1
                self.stats["relationships"] += 1
            
            # Create keywords and relationships
            keywords = paper.get("keywords", [])
            for kw in keywords:
                if kw:
                    kw_normalized = kw.lower().strip()
                    kw_query = """
                    MERGE (k:Keyword {name: $name})
                    WITH k
                    MATCH (p:Paper {id: $paper_id})
                    MERGE (p)-[:HAS_KEYWORD]->(k)
                    """
                    await session.run(kw_query, {"name": kw_normalized, "paper_id": paper_id})
                    self.stats["keywords"] += 1
                    self.stats["relationships"] += 1
            
            # Create reviews
            reviews = paper.get("review_details", [])
            for review in reviews:
                review_id = review.get("id")
                if not review_id:
                    continue
                
                content = review.get("content", {})
                review_type = determine_review_type(review)
                rating = extract_rating(content, conference)
                
                review_query = """
                MERGE (r:Review {id: $id})
                SET r.replyto = $replyto,
                    r.number = $number,
                    r.cdate = $cdate,
                    r.mdate = $mdate,
                    r.review_type = $review_type,
                    r.rating = $rating,
                    r.confidence = $confidence,
                    r.summary = $summary,
                    r.strengths = $strengths,
                    r.weaknesses = $weaknesses,
                    r.questions = $questions,
                    r.decision = $decision,
                    r.comment = $comment
                """
                
                review_params = {
                    "id": review_id,
                    "replyto": review.get("replyto"),
                    "number": review.get("number"),
                    "cdate": review.get("cdate"),
                    "mdate": review.get("mdate"),
                    "review_type": review_type,
                    "rating": rating,
                    "confidence": extract_rating(content, "confidence") if "confidence" in content else None,
                    "summary": extract_text_field(content, "summary"),
                    "strengths": extract_text_field(content, "strengths") or extract_text_field(content, "strengths_and_weaknesses"),
                    "weaknesses": extract_text_field(content, "weaknesses"),
                    "questions": extract_text_field(content, "questions") or extract_text_field(content, "questions_for_authors"),
                    "decision": extract_text_field(content, "decision"),
                    "comment": extract_text_field(content, "comment")
                }
                
                await session.run(review_query, review_params)
                self.stats["reviews"] += 1
                
                # Link review to paper
                link_query = """
                MATCH (p:Paper {id: $paper_id})
                MATCH (r:Review {id: $review_id})
                MERGE (p)-[:HAS_REVIEW]->(r)
                """
                await session.run(link_query, {"paper_id": paper_id, "review_id": review_id})
                self.stats["relationships"] += 1
                
                # Link review to reply target
                replyto = review.get("replyto")
                if replyto and replyto != paper_id:
                    reply_query = """
                    MATCH (r:Review {id: $review_id})
                    MATCH (target:Review {id: $replyto})
                    MERGE (r)-[:REPLIES_TO]->(target)
                    """
                    try:
                        await session.run(reply_query, {"review_id": review_id, "replyto": replyto})
                        self.stats["relationships"] += 1
                    except:
                        pass  # Target review might not exist yet
    
    async def ingest_file(self, filepath: Path, conference: str):
        """Ingest all papers from a JSONL file"""
        logger.info(f"Ingesting {filepath}...")
        
        count = 0
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        paper = json.loads(line)
                        paper["conference"] = conference
                        await self.ingest_paper(paper)
                        count += 1
                        
                        if count % 100 == 0:
                            logger.info(f"  Processed {count} papers...")
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error: {e}")
                    except Exception as e:
                        logger.error(f"Error processing paper: {e}")
        
        logger.info(f"Completed {filepath}: {count} papers")
        return count
    
    async def run(self):
        """Main ingestion process"""
        logger.info("Starting data ingestion...")
        
        # Create schema
        await self.create_schema()
        
        # Create conferences
        for conf, config in CONFERENCE_CONFIG.items():
            await self.create_conference(conf, config["year"], config["max_rating"])
            self.stats["conferences"] += 1
        
        # Ingest each file
        files = [
            (DATA_DIR / "iclr2025.jsonl", "ICLR"),
            (DATA_DIR / "icml2025.jsonl", "ICML"),
            (DATA_DIR / "neurips2025.jsonl", "NeurIPS"),
        ]
        
        total_papers = 0
        for filepath, conference in files:
            if filepath.exists():
                count = await self.ingest_file(filepath, conference)
                total_papers += count
            else:
                logger.warning(f"File not found: {filepath}")
        
        logger.info(f"\n{'='*50}")
        logger.info("Ingestion Complete!")
        logger.info(f"{'='*50}")
        logger.info(f"Total papers: {self.stats['papers']}")
        logger.info(f"Total authors: {self.stats['authors']}")
        logger.info(f"Total reviews: {self.stats['reviews']}")
        logger.info(f"Total keywords: {self.stats['keywords']}")
        logger.info(f"Total conferences: {self.stats['conferences']}")
        logger.info(f"Total relationships: {self.stats['relationships']}")


async def main():
    ingester = DataIngester(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    try:
        await ingester.run()
    finally:
        await ingester.close()


if __name__ == "__main__":
    asyncio.run(main())

