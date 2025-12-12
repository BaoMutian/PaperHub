import httpx
from typing import Optional, Dict, Any, List
import logging
import json

from ..config import get_settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.openrouter_base_url
        self.api_key = self.settings.openrouter_api_key
        self.model = self.settings.llm_model
    
    async def _call_api(self, messages: List[Dict[str, str]]) -> str:
        """Call OpenRouter API (Gemini model)"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Conference Papers KG"
        }
        
        # Gemini 模型不需要 temperature，max_tokens=0 表示不限制输出长度
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 0
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
    
    async def generate_cypher(self, question: str, schema_info: str) -> Dict[str, Any]:
        """Generate Cypher query from natural language question"""
        system_prompt = f"""You are an expert at converting natural language questions into Neo4j Cypher queries.

Here is the graph schema:
{schema_info}

Rules:
1. Always return valid Cypher syntax
2. Use parameter placeholders ($param) when appropriate
3. Include LIMIT clauses for queries that could return many results
4. For rating queries, note: ICLR max=10, ICML max=5 (overall_recommendation), NeurIPS max=6
5. Return JSON format with keys: "cypher", "parameters", "explanation"

Example questions and queries:
Q: "How many papers were accepted to ICLR 2025?"
A: {{"cypher": "MATCH (p:Paper) WHERE p.conference = 'ICLR' AND p.status IN ['poster', 'spotlight', 'oral'] RETURN count(p) as accepted_count", "parameters": {{}}, "explanation": "Counting papers with accepted status"}}

Q: "Which keywords are most common in ICML accepted papers?"
A: {{"cypher": "MATCH (p:Paper)-[:HAS_KEYWORD]->(k:Keyword) WHERE p.conference = 'ICML' AND p.status IN ['poster', 'spotlight', 'oral'] RETURN k.name as keyword, count(*) as count ORDER BY count DESC LIMIT 20", "parameters": {{}}, "explanation": "Aggregating keywords for accepted ICML papers"}}
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Convert this question to Cypher: {question}"}
        ]
        
        try:
            response = await self._call_api(messages)
            # Parse JSON from response
            # Handle markdown code blocks
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {response}")
            return {
                "cypher": None,
                "parameters": {},
                "explanation": f"Failed to generate query: {str(e)}",
                "raw_response": response
            }
        except Exception as e:
            logger.error(f"LLM API error: {e}")
            return {
                "cypher": None,
                "parameters": {},
                "explanation": f"API error: {str(e)}"
            }
    
    async def summarize_reviews(self, paper_title: str, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize reviews for a paper"""
        system_prompt = """You are an expert at analyzing academic paper reviews. 
Summarize the reviews concisely, highlighting:
1. Main strengths mentioned
2. Main weaknesses/concerns
3. Key questions raised
4. Overall sentiment (positive/negative/mixed)

Return JSON format with keys: "overall_sentiment", "main_strengths" (list), "main_weaknesses" (list), "key_questions" (list), "summary_text" (string)
"""
        
        # Format reviews for the prompt
        reviews_text = ""
        for i, review in enumerate(reviews, 1):
            reviews_text += f"\n--- Review {i} ---\n"
            if review.get("rating"):
                reviews_text += f"Rating: {review['rating']}\n"
            if review.get("summary"):
                reviews_text += f"Summary: {review['summary']}\n"
            if review.get("strengths"):
                reviews_text += f"Strengths: {review['strengths']}\n"
            if review.get("weaknesses"):
                reviews_text += f"Weaknesses: {review['weaknesses']}\n"
            if review.get("questions"):
                reviews_text += f"Questions: {review['questions']}\n"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Paper: {paper_title}\n\nReviews:{reviews_text}\n\nPlease summarize these reviews."}
        ]
        
        try:
            response = await self._call_api(messages)
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            return json.loads(response.strip())
        except Exception as e:
            logger.error(f"Failed to summarize reviews: {e}")
            return {
                "overall_sentiment": "unknown",
                "main_strengths": [],
                "main_weaknesses": [],
                "key_questions": [],
                "summary_text": f"Failed to generate summary: {str(e)}"
            }
    
    async def answer_question(
        self, 
        question: str, 
        context: str,
        query_results: Optional[List[Dict]] = None
    ) -> str:
        """Answer a question using context and query results"""
        system_prompt = """You are a helpful assistant for an academic paper database.
Answer questions based on the provided context and query results.
Be concise and accurate. If you don't have enough information, say so.
Format your response in Markdown for readability."""
        
        user_content = f"Question: {question}\n\nContext: {context}"
        if query_results:
            user_content += f"\n\nQuery Results: {json.dumps(query_results, ensure_ascii=False, indent=2)}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
        
        return await self._call_api(messages)


# Singleton
_llm_service: Optional[LLMService] = None


async def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

