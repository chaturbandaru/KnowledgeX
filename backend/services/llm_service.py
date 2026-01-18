"""
LLM service for intelligent match analysis and re-ranking.
Uses OpenRouter with Gemini for structured match evaluation.
"""

from typing import Dict, Any, List, Optional
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMService:
    """
    LLM service for match analysis using OpenRouter.
    Provides structured match evaluation and explanation generation.
    """
    
    def __init__(
        self,
        api_key: str,
        model: str = "google/gemini-2.0-flash-exp:free",
        temperature: float = 0.3,
        max_tokens: int = 1000
    ):
        try:
            import httpx
        except ImportError:
            raise ImportError("httpx package required. Install with: pip install httpx")
        
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.base_url = "https://openrouter.ai/api/v1"
        
        logger.info(f"LLMService initialized with model: {model}")
    
    async def analyze_match(
        self,
        seeker_need: str,
        helper_skills: List[str],
        seeker_context: Optional[Dict[str, Any]] = None,
        helper_context: Optional[Dict[str, Any]] = None,
        embedding_score: float = 0.0
    ) -> Dict[str, Any]:
        """
        Analyze if a helper can assist with a seeker's need.
        
        Args:
            seeker_need: What the seeker needs help with
            helper_skills: List of helper's skills
            seeker_context: Additional context about seeker (level, etc.)
            helper_context: Additional context about helper
            embedding_score: Initial embedding similarity score
            
        Returns:
            Dict with: adjusted_score, can_help, confidence, reasoning, explanation
        """
        import httpx
        
        # Build prompt
        prompt = self._build_match_analysis_prompt(
            seeker_need=seeker_need,
            helper_skills=helper_skills,
            seeker_context=seeker_context or {},
            helper_context=helper_context or {},
            embedding_score=embedding_score
        )
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/knowledge-debt-exchange",
                        "X-Title": "Knowledge Debt Exchange"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a helpful assistant that evaluates skill matches for peer learning. Always respond with valid JSON only."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Extract content
                content = data["choices"][0]["message"]["content"]
                
                # Parse JSON response
                result = self._parse_llm_response(content)
                
                # Add metadata
                result["llm_model"] = self.model
                result["timestamp"] = datetime.utcnow().isoformat()
                
                return result
                
        except Exception as e:
            logger.error(f"LLM analysis error: {e}")
            
            # Fallback: Use embedding score only
            return self._fallback_analysis(embedding_score)
    
    def _build_match_analysis_prompt(
        self,
        seeker_need: str,
        helper_skills: List[str],
        seeker_context: Dict[str, Any],
        helper_context: Dict[str, Any],
        embedding_score: float
    ) -> str:
        """Build prompt for LLM match analysis."""
        
        skills_text = "\n".join([f"  - {skill}" for skill in helper_skills])
        
        prompt = f"""Analyze if this helper can assist with the seeker's learning need.

SEEKER'S NEED:
{seeker_need}

HELPER'S SKILLS:
{skills_text}

EMBEDDING SIMILARITY: {embedding_score:.3f}

SEEKER CONTEXT:
{json.dumps(seeker_context, indent=2) if seeker_context else "No additional context"}

HELPER CONTEXT:
{json.dumps(helper_context, indent=2) if helper_context else "No additional context"}

Evaluate this match and respond with ONLY a JSON object (no markdown, no extra text):

{{
  "adjusted_score": <float 0.0-1.0>,
  "can_help": <boolean>,
  "confidence": <float 0.0-1.0>,
  "reasoning": "<brief explanation of your evaluation>",
  "explanation": "<2-3 sentence explanation for the user about why this is a good/bad match>",
  "prerequisites_met": <boolean>,
  "skill_level_match": <boolean>
}}

Consider:
- Skill relevance and overlap
- Proficiency levels (helper should be equal or higher)
- Prerequisites and dependencies
- Specificity of need vs breadth of skills
- Practical applicability

Adjusted score should:
- Start with embedding_score as baseline
- Increase (+0.1 to +0.3) if strong contextual match
- Decrease (-0.1 to -0.3) if prerequisites missing or skill level mismatch
- Stay between 0.0 and 1.0
"""
        
        return prompt
    
    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse LLM response, handling potential formatting issues."""
        
        # Remove markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        try:
            result = json.loads(content)
            
            # Validate required fields
            required_fields = [
                "adjusted_score", "can_help", "confidence",
                "reasoning", "explanation"
            ]
            
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")
            
            # Clamp scores to valid range
            result["adjusted_score"] = max(0.0, min(1.0, float(result["adjusted_score"])))
            result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
            
            # Ensure booleans
            result["can_help"] = bool(result["can_help"])
            result["prerequisites_met"] = bool(result.get("prerequisites_met", True))
            result["skill_level_match"] = bool(result.get("skill_level_match", True))
            
            return result
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.error(f"Content: {content}")
            raise
    
    def _fallback_analysis(self, embedding_score: float) -> Dict[str, Any]:
        """Fallback analysis when LLM fails."""
        return {
            "adjusted_score": embedding_score,
            "can_help": embedding_score > 0.4,
            "confidence": 0.5,
            "reasoning": "LLM analysis failed, using embedding score only",
            "explanation": "This match is based on semantic similarity. The helper's skills appear relevant to your need.",
            "prerequisites_met": True,
            "skill_level_match": True,
            "llm_model": "fallback",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def generate_explanation(
        self,
        seeker_need: str,
        helper_skill: str,
        match_score: float,
        is_reciprocal: bool = False
    ) -> str:
        """
        Generate a user-friendly explanation for a match.
        
        Args:
            seeker_need: What the seeker needs
            helper_skill: What the helper offers
            match_score: Match score
            is_reciprocal: Whether this is a mutual exchange
            
        Returns:
            User-friendly explanation string
        """
        import httpx
        
        reciprocal_text = " This is a reciprocal match - you can help each other!" if is_reciprocal else ""
        
        prompt = f"""Generate a friendly, concise explanation (2-3 sentences) for why this skill match is relevant.

LEARNER NEEDS: {seeker_need}
HELPER OFFERS: {helper_skill}
MATCH SCORE: {match_score:.2f}
{reciprocal_text}

Write a clear, encouraging explanation for the learner. Focus on practical value.
Respond with ONLY the explanation text, no JSON, no extra formatting.
"""
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are a helpful assistant."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 200
                    },
                    timeout=20.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                explanation = data["choices"][0]["message"]["content"].strip()
                return explanation
                
        except Exception as e:
            logger.error(f"Explanation generation error: {e}")
            
            # Fallback explanation
            if is_reciprocal:
                return f"You both can help each other! They can assist with '{seeker_need}', and you can help them with their needs. This is a great mutual learning opportunity."
            else:
                return f"This person has skills in '{helper_skill}' which aligns well with your need for '{seeker_need}'. They could provide valuable guidance."


# Factory function
def create_llm_service(
    api_key: str,
    model: str = "google/gemini-2.0-flash-exp:free",
    temperature: float = 0.3,
    max_tokens: int = 1000
) -> LLMService:
    """
    Create LLM service instance.
    
    Args:
        api_key: OpenRouter API key
        model: Model to use
        temperature: Sampling temperature
        max_tokens: Max tokens in response
        
    Returns:
        Configured LLMService
    """
    return LLMService(
        api_key=api_key,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )