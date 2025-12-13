"""
Data Ingestion Script for AI Conference Papers Knowledge Graph

This script reads the JSONL files and populates the Neo4j database with:
- Paper nodes (with aggregated ratings)
- Author nodes  
- Review nodes (with content_json for dynamic rendering)
- Keyword nodes
- Conference nodes
- All relationships between them
- Interaction statistics (author_word_count, reviewer_word_count, battle_intensity)
"""

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from collections import defaultdict

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


# ============== Interaction Calculation Functions ==============

def count_words(text: str) -> int:
    """Count words in text, handling both English and Chinese"""
    if not text:
        return 0
    text = re.sub(r'[#*_`~\[\]()>]', ' ', text)
    english_words = len(re.findall(r'[a-zA-Z]+', text))
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    return english_words + chinese_chars


def extract_text_from_content(content: Dict[str, Any]) -> str:
    """Extract all text from review content dict"""
    if not content:
        return ""
    texts = []
    for key, value in content.items():
        if isinstance(value, dict) and 'value' in value:
            val = value['value']
            if isinstance(val, str):
                texts.append(val)
            elif isinstance(val, list):
                texts.extend(str(v) for v in val if v)
    return ' '.join(texts)


def build_reply_tree(reviews: List[Dict]) -> int:
    """Build reply tree and return max depth"""
    children = defaultdict(list)
    review_ids = {r['id'] for r in reviews}
    root_ids = []
    
    for review in reviews:
        review_id = review['id']
        replyto = review.get('replyto')
        if replyto and replyto in review_ids:
            children[replyto].append(review_id)
        else:
            root_ids.append(review_id)
    
    depths = {}
    queue = [(rid, 1) for rid in root_ids]
    while queue:
        review_id, depth = queue.pop(0)
        depths[review_id] = depth
        for child_id in children[review_id]:
            queue.append((child_id, depth + 1))
    
    return max(depths.values()) if depths else 0


def calculate_battle_intensity(author_words: int, reviewer_words: int, max_depth: int, num_reviews: int) -> float:
    """Calculate normalized battle intensity (0.0 - 1.0)"""
    if author_words == 0 and reviewer_words == 0:
        return 0.0
    
    total_words = author_words + reviewer_words
    word_factor = min(1.0, (total_words / 10000) ** 0.5)
    depth_factor = min(1.0, max_depth / 10)
    review_factor = min(1.0, num_reviews / 20)
    
    if total_words > 0:
        ratio = min(author_words, reviewer_words) / max(author_words, reviewer_words, 1)
        balance_factor = ratio
    else:
        balance_factor = 0.0
    
    intensity = 0.35 * word_factor + 0.30 * depth_factor + 0.20 * review_factor + 0.15 * balance_factor
    return round(min(1.0, intensity), 3)


# ============== Review Type Detection ==============

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
    
    # Try the configured field first, then fallback fields
    for field in [rating_field, "rating", "overall_recommendation", "recommendation"]:
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


class DataIngester:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.stats = {
            "papers": 0,
            "authors": 0,
            "reviews": 0,
            "keywords": 0,
            "conferences": 0,
            "relationships": 0,
            "papers_with_interactions": 0
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
            "CREATE INDEX paper_avg_rating IF NOT EXISTS FOR (p:Paper) ON (p.avg_rating)",
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
    
    async def ingest_paper(self, paper: Dict[str, Any]) -> List[float]:
        """Ingest a single paper with all its relationships. Returns list of ratings."""
        paper_id = paper.get("id")
        if not paper_id:
            return []
        
        conference = paper.get("conference", "")
        paper_ratings: List[float] = []
        
        # Create paper node (ratings will be updated later)
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
            
            # Create reviews (simplified: only core fields + content_json)
            reviews = paper.get("review_details", [])
            for review in reviews:
                review_id = review.get("id")
                if not review_id:
                    continue
                
                content = review.get("content", {})
                review_type = determine_review_type(review)
                rating = extract_rating(content, conference)
                
                # Collect ratings for official reviews
                if review_type == "official_review" and rating is not None:
                    paper_ratings.append(rating)
                
                # Simplified Review node: only essential fields + content_json
                review_query = """
                MERGE (r:Review {id: $id})
                SET r.replyto = $replyto,
                    r.cdate = $cdate,
                    r.review_type = $review_type,
                    r.rating = $rating,
                    r.content_json = $content_json
                """
                
                review_params = {
                    "id": review_id,
                    "replyto": review.get("replyto"),
                    "cdate": review.get("cdate"),
                    "review_type": review_type,
                    "rating": rating,
                    "content_json": json.dumps(content, ensure_ascii=False) if content else None
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
            
            # Update paper with aggregated ratings
            if paper_ratings:
                rating_query = """
                MATCH (p:Paper {id: $paper_id})
                SET p.ratings = $ratings,
                    p.avg_rating = $avg_rating,
                    p.min_rating = $min_rating,
                    p.max_rating = $max_rating,
                    p.rating_count = $rating_count
                """
                await session.run(rating_query, {
                    "paper_id": paper_id,
                    "ratings": paper_ratings,
                    "avg_rating": sum(paper_ratings) / len(paper_ratings),
                    "min_rating": min(paper_ratings),
                    "max_rating": max(paper_ratings),
                    "rating_count": len(paper_ratings)
                })
        
        return paper_ratings
    
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
    
    async def calculate_all_interactions(self):
        """Calculate interaction statistics for all papers"""
        logger.info("Calculating interaction statistics...")
        
        # Create indexes for interaction fields
        index_queries = [
            "CREATE INDEX paper_interaction_rounds IF NOT EXISTS FOR (p:Paper) ON (p.interaction_rounds)",
            "CREATE INDEX paper_battle_intensity IF NOT EXISTS FOR (p:Paper) ON (p.battle_intensity)",
        ]
        async with self.driver.session() as session:
            for idx in index_queries:
                try:
                    await session.run(idx)
                except Exception:
                    pass
        
        # Get all papers with reviews
        query = """
        MATCH (p:Paper)
        OPTIONAL MATCH (p)-[:HAS_REVIEW]->(r:Review)
        WITH p, collect(r {.id, .replyto, .review_type, .content_json}) as reviews
        WHERE size(reviews) > 0
        RETURN p.id as paper_id, reviews
        """
        
        async with self.driver.session() as session:
            result = await session.run(query)
            papers = await result.data()
        
        logger.info(f"Processing interactions for {len(papers)} papers...")
        
        for i, paper_data in enumerate(papers):
            paper_id = paper_data['paper_id']
            reviews = paper_data['reviews']
            
            author_words = 0
            reviewer_words = 0
            parsed_reviews = []
            
            for review in reviews:
                parsed = {
                    'id': review['id'],
                    'replyto': review.get('replyto'),
                    'review_type': review.get('review_type', 'other')
                }
                
                content_json = review.get('content_json')
                if content_json:
                    try:
                        content = json.loads(content_json)
                        text = extract_text_from_content(content)
                        word_count = count_words(text)
                        
                        if parsed['review_type'] == 'rebuttal':
                            author_words += word_count
                        else:
                            reviewer_words += word_count
                    except json.JSONDecodeError:
                        pass
                
                parsed_reviews.append(parsed)
            
            max_depth = build_reply_tree(parsed_reviews)
            intensity = calculate_battle_intensity(author_words, reviewer_words, max_depth, len(parsed_reviews))
            
            # Update paper
            update_query = """
            MATCH (p:Paper {id: $paper_id})
            SET p.author_word_count = $author_word_count,
                p.reviewer_word_count = $reviewer_word_count,
                p.interaction_rounds = $interaction_rounds,
                p.battle_intensity = $battle_intensity
            """
            async with self.driver.session() as session:
                await session.run(update_query, {
                    "paper_id": paper_id,
                    "author_word_count": author_words,
                    "reviewer_word_count": reviewer_words,
                    "interaction_rounds": max_depth,
                    "battle_intensity": intensity
                })
            
            if max_depth > 1 or author_words > 0:
                self.stats['papers_with_interactions'] += 1
            
            if (i + 1) % 500 == 0:
                logger.info(f"  Processed {i + 1}/{len(papers)} papers...")
        
        logger.info(f"Interaction calculation complete: {self.stats['papers_with_interactions']} papers with interactions")
    
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
        
        # Calculate interaction statistics
        await self.calculate_all_interactions()
        
        logger.info(f"\n{'='*50}")
        logger.info("Ingestion Complete!")
        logger.info(f"{'='*50}")
        logger.info(f"Total papers: {self.stats['papers']}")
        logger.info(f"Total authors: {self.stats['authors']}")
        logger.info(f"Total reviews: {self.stats['reviews']}")
        logger.info(f"Total keywords: {self.stats['keywords']}")
        logger.info(f"Total conferences: {self.stats['conferences']}")
        logger.info(f"Total relationships: {self.stats['relationships']}")
        logger.info(f"Papers with interactions: {self.stats['papers_with_interactions']}")


async def main():
    ingester = DataIngester(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    try:
        await ingester.run()
    finally:
        await ingester.close()


if __name__ == "__main__":
    asyncio.run(main())
