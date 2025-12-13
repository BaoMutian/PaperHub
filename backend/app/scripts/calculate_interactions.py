"""
Calculate Interaction Statistics for Papers

This script analyzes review discussions and calculates:
- author_word_count: Total words from author rebuttals
- reviewer_word_count: Total words from reviewer responses
- interaction_rounds: Maximum reply chain depth
- battle_intensity: Normalized intensity score (0.0 - 1.0)
"""

import asyncio
import json
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
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


def count_words(text: str) -> int:
    """Count words in text, handling both English and Chinese"""
    if not text:
        return 0
    # Remove markdown formatting
    text = re.sub(r'[#*_`~\[\]()>]', ' ', text)
    # Count English words
    english_words = len(re.findall(r'[a-zA-Z]+', text))
    # Count Chinese characters (each character is roughly a word)
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


def build_reply_tree(reviews: List[Dict]) -> Tuple[int, Dict[str, int]]:
    """
    Build reply tree and calculate max depth.
    Returns (max_depth, {review_id: depth})
    """
    # Build parent-child relationships
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
    
    # Calculate depths using BFS
    depths = {}
    queue = [(rid, 1) for rid in root_ids]
    
    while queue:
        review_id, depth = queue.pop(0)
        depths[review_id] = depth
        for child_id in children[review_id]:
            queue.append((child_id, depth + 1))
    
    max_depth = max(depths.values()) if depths else 0
    return max_depth, depths


def calculate_battle_intensity(
    author_words: int,
    reviewer_words: int,
    max_depth: int,
    num_reviews: int
) -> float:
    """
    Calculate normalized battle intensity (0.0 - 1.0)
    
    Factors:
    - Total word count (more words = more intense)
    - Reply depth (deeper = more back-and-forth)
    - Number of reviews (more reviews = more engagement)
    - Balance between author and reviewer (more balanced = more intense)
    """
    if author_words == 0 and reviewer_words == 0:
        return 0.0
    
    total_words = author_words + reviewer_words
    
    # Word count factor (log scale, cap at ~10000 words)
    word_factor = min(1.0, (total_words / 10000) ** 0.5)
    
    # Depth factor (normalize to max ~10 rounds)
    depth_factor = min(1.0, max_depth / 10)
    
    # Review count factor (normalize to ~20 reviews)
    review_factor = min(1.0, num_reviews / 20)
    
    # Balance factor (more balanced = higher)
    if total_words > 0:
        ratio = min(author_words, reviewer_words) / max(author_words, reviewer_words, 1)
        balance_factor = ratio  # 1.0 when perfectly balanced
    else:
        balance_factor = 0.0
    
    # Weighted combination
    intensity = (
        0.35 * word_factor +
        0.30 * depth_factor +
        0.20 * review_factor +
        0.15 * balance_factor
    )
    
    return round(min(1.0, intensity), 3)


class InteractionCalculator:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.stats = {
            "papers_processed": 0,
            "papers_with_interactions": 0,
            "total_author_words": 0,
            "total_reviewer_words": 0,
            "max_depth_found": 0
        }
    
    async def close(self):
        await self.driver.close()
    
    async def get_all_papers_with_reviews(self) -> List[Dict]:
        """Get all papers with their reviews"""
        query = """
        MATCH (p:Paper)
        OPTIONAL MATCH (p)-[:HAS_REVIEW]->(r:Review)
        WITH p, collect(r {.id, .replyto, .review_type, .content_json}) as reviews
        WHERE size(reviews) > 0
        RETURN p.id as paper_id, reviews
        """
        async with self.driver.session() as session:
            result = await session.run(query)
            records = await result.data()
            return records
    
    async def update_paper_interactions(
        self,
        paper_id: str,
        author_word_count: int,
        reviewer_word_count: int,
        interaction_rounds: int,
        battle_intensity: float
    ):
        """Update paper with interaction statistics"""
        query = """
        MATCH (p:Paper {id: $paper_id})
        SET p.author_word_count = $author_word_count,
            p.reviewer_word_count = $reviewer_word_count,
            p.interaction_rounds = $interaction_rounds,
            p.battle_intensity = $battle_intensity
        """
        async with self.driver.session() as session:
            await session.run(query, {
                "paper_id": paper_id,
                "author_word_count": author_word_count,
                "reviewer_word_count": reviewer_word_count,
                "interaction_rounds": interaction_rounds,
                "battle_intensity": battle_intensity
            })
    
    async def create_indexes(self):
        """Create indexes for new fields"""
        indexes = [
            "CREATE INDEX paper_interaction_rounds IF NOT EXISTS FOR (p:Paper) ON (p.interaction_rounds)",
            "CREATE INDEX paper_battle_intensity IF NOT EXISTS FOR (p:Paper) ON (p.battle_intensity)",
        ]
        async with self.driver.session() as session:
            for idx in indexes:
                try:
                    await session.run(idx)
                    logger.info(f"Index created: {idx[:60]}...")
                except Exception as e:
                    logger.warning(f"Index warning: {e}")
    
    def process_paper_reviews(self, reviews: List[Dict]) -> Dict[str, Any]:
        """Process reviews for a single paper and calculate statistics"""
        author_words = 0
        reviewer_words = 0
        
        # Parse content_json for each review
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
                    parsed['content'] = content
                except json.JSONDecodeError:
                    parsed['content'] = {}
            else:
                parsed['content'] = {}
            
            parsed_reviews.append(parsed)
        
        # Calculate word counts by type
        for review in parsed_reviews:
            text = extract_text_from_content(review['content'])
            word_count = count_words(text)
            review_type = review['review_type']
            
            # Author contributions: rebuttal, author responses
            if review_type in ['rebuttal']:
                author_words += word_count
            # Reviewer contributions: official_review, meta_review, decision
            elif review_type in ['official_review', 'meta_review', 'decision']:
                reviewer_words += word_count
            # Comments could be from either side, count as reviewer by default
            elif review_type in ['comment', 'other']:
                reviewer_words += word_count
        
        # Calculate reply depth
        max_depth, _ = build_reply_tree(parsed_reviews)
        
        # Calculate battle intensity
        intensity = calculate_battle_intensity(
            author_words,
            reviewer_words,
            max_depth,
            len(parsed_reviews)
        )
        
        return {
            'author_word_count': author_words,
            'reviewer_word_count': reviewer_words,
            'interaction_rounds': max_depth,
            'battle_intensity': intensity
        }
    
    async def run(self):
        """Main processing loop"""
        logger.info("Starting interaction calculation...")
        
        # Create indexes
        await self.create_indexes()
        
        # Get all papers with reviews
        papers = await self.get_all_papers_with_reviews()
        logger.info(f"Found {len(papers)} papers with reviews")
        
        for i, paper_data in enumerate(papers):
            paper_id = paper_data['paper_id']
            reviews = paper_data['reviews']
            
            # Process reviews
            stats = self.process_paper_reviews(reviews)
            
            # Update paper
            await self.update_paper_interactions(
                paper_id,
                stats['author_word_count'],
                stats['reviewer_word_count'],
                stats['interaction_rounds'],
                stats['battle_intensity']
            )
            
            # Update global stats
            self.stats['papers_processed'] += 1
            if stats['interaction_rounds'] > 1 or stats['author_word_count'] > 0:
                self.stats['papers_with_interactions'] += 1
            self.stats['total_author_words'] += stats['author_word_count']
            self.stats['total_reviewer_words'] += stats['reviewer_word_count']
            self.stats['max_depth_found'] = max(
                self.stats['max_depth_found'],
                stats['interaction_rounds']
            )
            
            if (i + 1) % 500 == 0:
                logger.info(f"Processed {i + 1}/{len(papers)} papers...")
        
        logger.info(f"\n{'='*50}")
        logger.info("Interaction Calculation Complete!")
        logger.info(f"{'='*50}")
        logger.info(f"Papers processed: {self.stats['papers_processed']}")
        logger.info(f"Papers with interactions: {self.stats['papers_with_interactions']}")
        logger.info(f"Total author words: {self.stats['total_author_words']:,}")
        logger.info(f"Total reviewer words: {self.stats['total_reviewer_words']:,}")
        logger.info(f"Max depth found: {self.stats['max_depth_found']}")


async def main():
    calculator = InteractionCalculator(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    try:
        await calculator.run()
    finally:
        await calculator.close()


if __name__ == "__main__":
    asyncio.run(main())

