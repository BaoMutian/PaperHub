"""
Script to calculate and store ratings on Paper nodes

This script:
1. Queries all papers from Neo4j
2. For each paper, aggregates ratings from official reviews
3. Stores ratings array, avg_rating, min_rating, max_rating on Paper nodes

This enables direct queries on paper ratings without joining Review nodes.
"""

import asyncio
import logging
from typing import Dict, Any, List

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


class PaperRatingsUpdater:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.stats = {
            "papers_processed": 0,
            "papers_with_ratings": 0,
            "papers_without_ratings": 0
        }
    
    async def close(self):
        await self.driver.close()
    
    async def update_paper_ratings(self):
        """Update all papers with their aggregated ratings"""
        
        # Query to get all papers with their review ratings
        query = """
        MATCH (p:Paper)
        OPTIONAL MATCH (p)-[:HAS_REVIEW]->(r:Review)
        WHERE r.review_type = 'official_review' AND r.rating IS NOT NULL
        WITH p, collect(r.rating) as ratings
        RETURN p.id as paper_id, ratings
        """
        
        async with self.driver.session() as session:
            result = await session.run(query)
            papers = await result.data()
        
        logger.info(f"Found {len(papers)} papers to process")
        
        # Update each paper with its ratings
        update_query = """
        MATCH (p:Paper {id: $paper_id})
        SET p.ratings = $ratings,
            p.avg_rating = $avg_rating,
            p.min_rating = $min_rating,
            p.max_rating = $max_rating,
            p.rating_count = $rating_count
        """
        
        async with self.driver.session() as session:
            for paper in papers:
                paper_id = paper["paper_id"]
                ratings = [r for r in paper["ratings"] if r is not None]
                
                self.stats["papers_processed"] += 1
                
                if ratings:
                    avg_rating = sum(ratings) / len(ratings)
                    min_rating = min(ratings)
                    max_rating = max(ratings)
                    rating_count = len(ratings)
                    self.stats["papers_with_ratings"] += 1
                else:
                    avg_rating = None
                    min_rating = None
                    max_rating = None
                    rating_count = 0
                    self.stats["papers_without_ratings"] += 1
                
                await session.run(update_query, {
                    "paper_id": paper_id,
                    "ratings": ratings if ratings else [],
                    "avg_rating": avg_rating,
                    "min_rating": min_rating,
                    "max_rating": max_rating,
                    "rating_count": rating_count
                })
                
                if self.stats["papers_processed"] % 500 == 0:
                    logger.info(f"Processed {self.stats['papers_processed']} papers...")
        
        logger.info(f"\n{'='*50}")
        logger.info("Paper Ratings Update Complete!")
        logger.info(f"{'='*50}")
        logger.info(f"Total papers processed: {self.stats['papers_processed']}")
        logger.info(f"Papers with ratings: {self.stats['papers_with_ratings']}")
        logger.info(f"Papers without ratings: {self.stats['papers_without_ratings']}")
    
    async def create_rating_index(self):
        """Create index on Paper.avg_rating for efficient queries"""
        index_query = "CREATE INDEX paper_avg_rating IF NOT EXISTS FOR (p:Paper) ON (p.avg_rating)"
        
        async with self.driver.session() as session:
            try:
                await session.run(index_query)
                logger.info("Created index on Paper.avg_rating")
            except Exception as e:
                logger.warning(f"Index creation warning: {e}")
    
    async def run(self):
        """Main process"""
        logger.info("Starting paper ratings update...")
        
        await self.create_rating_index()
        await self.update_paper_ratings()


async def main():
    updater = PaperRatingsUpdater(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    try:
        await updater.run()
    finally:
        await updater.close()


if __name__ == "__main__":
    asyncio.run(main())

