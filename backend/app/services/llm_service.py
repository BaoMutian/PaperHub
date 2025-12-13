import httpx
from typing import Optional, Dict, Any, List
import logging
import json

from ..config import get_settings
from ..prompts import get_nl2cypher_prompt, get_review_summary_prompt, get_qa_prompt

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.openrouter_base_url
        self.api_key = self.settings.openrouter_api_key
        self.model = self.settings.llm_model

    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """Call OpenRouter API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Conference Papers KG"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
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

    async def generate_cypher(self, question: str) -> Dict[str, Any]:
        """Generate Cypher query from natural language question"""
        system_prompt, user_prompt = get_nl2cypher_prompt(question)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            response = await self._call_api(messages, temperature=0.1)
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

    def _get_content_value(self, content: Dict, field: str) -> Optional[str]:
        """Extract value from content field (handles {field: {value: ...}} structure)"""
        if not content or field not in content:
            return None
        field_data = content.get(field)
        if isinstance(field_data, dict):
            return field_data.get("value")
        return field_data

    async def summarize_reviews(self, paper_title: str, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize reviews for a paper"""
        # Format reviews for the prompt - extract from content dict
        reviews_text = ""
        for i, review in enumerate(reviews, 1):
            reviews_text += f"\n--- Review {i} ---\n"
            content = review.get("content", {})

            if review.get("rating"):
                reviews_text += f"Rating: {review['rating']}\n"

            # Try common field names from different conferences
            summary = self._get_content_value(content, "summary")
            if summary:
                reviews_text += f"Summary: {summary}\n"

            strengths = self._get_content_value(content, "strengths") or self._get_content_value(
                content, "strengths_and_weaknesses")
            if strengths:
                reviews_text += f"Strengths: {strengths}\n"

            weaknesses = self._get_content_value(content, "weaknesses")
            if weaknesses:
                reviews_text += f"Weaknesses: {weaknesses}\n"

            questions = self._get_content_value(
                content, "questions") or self._get_content_value(content, "questions_for_authors")
            if questions:
                reviews_text += f"Questions: {questions}\n"

        system_prompt, user_prompt = get_review_summary_prompt(
            paper_title, reviews_text)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            response = await self._call_api(messages, temperature=0.3)
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
        results_str = json.dumps(
            query_results, ensure_ascii=False, indent=2) if query_results else "No results"
        system_prompt, user_prompt = get_qa_prompt(
            question, context, results_str)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return await self._call_api(messages, temperature=0.5)


# Singleton
_llm_service: Optional[LLMService] = None


async def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
