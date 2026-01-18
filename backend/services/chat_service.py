"""
Chat service for conversational skill extraction.
Uses LLM to understand user's learning needs through conversation.
"""

import json
from typing import List, Dict, Any
import httpx
import logging

logger = logging.getLogger(__name__)


class ChatService:
    """AI-powered chat for extracting learning needs."""
    
    def __init__(self, api_key: str, model: str, llm_service):
        self.api_key = api_key
        self.model = model
        self.llm_service = llm_service
        self.base_url = "https://openrouter.ai/api/v1"
    
    async def chat_response(
        self,
        user_message: str,
        chat_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Generate AI response and determine if we have enough info to extract needs.
        
        Returns:
            {
                "response": "AI response text",
                "needs_extraction_ready": bool,
                "extracted_needs": [...] if ready
            }
        """
        
        # Simple heuristic: After 2 user messages, extract needs
        user_message_count = sum(1 for msg in chat_history if msg.get("role") == "user")
        
        # If this is the 2nd or 3rd message, force extraction
        force_extraction = user_message_count >= 1
        
        # Build conversation with system prompt
        if force_extraction:
            system_prompt = """You are a helpful learning advisor. The user has told you what they want to learn.

Based on their messages, extract their learning needs in this EXACT format:

EXTRACTION:
{
  "ready": true,
  "needs": [
    {
      "name": "<skill name>",
      "description": "<what they said about it>",
      "proficiency_level": "<beginner/intermediate/advanced>"
    }
  ]
}

Then add a friendly message like "Great! Let me find matches for you."

IMPORTANT: You MUST include the EXTRACTION block."""
        else:
            system_prompt = """You are a helpful learning advisor. Ask the user what they want to learn.

If they haven't told you yet, ask: "What would you like to learn?"

Keep it short and friendly."""
        
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add history
        messages.extend(chat_history)
        
        # Add new user message
        messages.append({"role": "user", "content": user_message})
        
        # Call LLM
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30.0
            )
            
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
        
        # Check if response contains extraction
        needs_ready = False
        extracted_needs = []
        
        if "EXTRACTION:" in ai_response or force_extraction:
            try:
                # Try to find JSON in response
                json_start = ai_response.find("{")
                json_end = ai_response.rfind("}") + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = ai_response[json_start:json_end]
                    parsed = json.loads(json_str)
                    
                    if parsed.get("ready"):
                        needs_ready = True
                        extracted_needs = parsed.get("needs", [])
                        
                        # VALIDATION: Filter out hallucinated/invalid skills
                        extracted_needs = self._validate_skills(extracted_needs)
                        
                        # If no valid skills remain after validation, mark as not ready
                        if not extracted_needs:
                            needs_ready = False
                            logger.warning("No valid skills after validation - hallucination detected")
                        
                        # Clean up response (remove JSON)
                        ai_response = ai_response[:json_start].strip()
                        if "EXTRACTION:" in ai_response:
                            ai_response = ai_response.replace("EXTRACTION:", "").strip()
                        
                        if not ai_response or len(ai_response) < 10:
                            ai_response = "Great! I've understood your learning needs. Let me find matches for you."
            except Exception as e:
                logger.error(f"Failed to parse extraction: {e}")
                
                # Fallback: Create needs from the conversation
                if force_extraction:
                    needs_ready = True
                    extracted_needs = self._fallback_extraction(user_message, chat_history)
                    ai_response = "Got it! Let me find learning matches for you."
        
        return {
            "response": ai_response,
            "needs_extraction_ready": needs_ready,
            "extracted_needs": extracted_needs
        }
    
    def _fallback_extraction(self, user_message: str, chat_history: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Fallback: Extract needs from conversation without relying on LLM JSON.
        IMPORTANT: Only extracts recognizable skills from predefined keywords.
        This prevents AI hallucination by limiting to known technology/skill categories.
        """
        # Combine all user messages
        all_user_text = " ".join([
            msg["content"] for msg in chat_history if msg.get("role") == "user"
        ])
        all_user_text += " " + user_message
        
        # Simple extraction: Look for keywords in KNOWN topics only
        text_lower = all_user_text.lower()
        
        # PREDEFINED list of recognizable learning topics - ONLY these can be extracted
        # This prevents hallucination by limiting the skill extraction to known categories
        topics = {
            "react": ("React development", "beginner"),
            "python": ("Python programming", "beginner"),
            "javascript": ("JavaScript development", "beginner"),
            "java": ("Java programming", "beginner"),
            "machine learning": ("Machine Learning", "beginner"),
            "data science": ("Data Science", "beginner"),
            "web development": ("Web Development", "beginner"),
            "backend": ("Backend Development", "beginner"),
            "frontend": ("Frontend Development", "beginner"),
            "node": ("Node.js development", "beginner"),
            "css": ("CSS styling", "beginner"),
            "html": ("HTML markup", "beginner"),
            "typescript": ("TypeScript programming", "beginner"),
            "database": ("Database design", "beginner"),
            "sql": ("SQL databases", "beginner"),
            "rest api": ("REST API development", "beginner"),
            "docker": ("Docker containerization", "beginner"),
            "kubernetes": ("Kubernetes orchestration", "beginner"),
            "aws": ("AWS cloud services", "beginner"),
            "azure": ("Azure cloud services", "beginner"),
            "devops": ("DevOps practices", "beginner"),
            "testing": ("Software testing", "beginner"),
            "git": ("Git version control", "beginner"),
            "agile": ("Agile development", "beginner"),
            "golang": ("Go programming", "beginner"),
            "rust": ("Rust programming", "beginner"),
            "mobile": ("Mobile development", "beginner"),
            "android": ("Android development", "beginner"),
            "ios": ("iOS development", "beginner"),
            "ui/ux": ("UI/UX design", "beginner"),
            "design": ("Web design", "beginner"),
        }
        
        extracted = []
        found_topics = set()
        
        for keyword, (name, level) in topics.items():
            if keyword in text_lower and name not in found_topics:
                extracted.append({
                    "name": name,
                    "description": f"Wants to learn {name}",
                    "proficiency_level": level
                })
                found_topics.add(name)
        
        # If nothing found, DO NOT generate hallucinated skills
        # Instead, ask for clarification or return empty
        if not extracted:
            logger.warning(f"No recognizable skills found in: {user_message}")
            # Return empty instead of generating false skills
            return []
        
        return extracted
    
    def _validate_skills(self, skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate extracted skills to prevent hallucination.
        IMPORTANT: Only keep skills that are reasonable and actually in our knowledge base.
        This prevents the LLM from inventing fake tutors or tutees.
        
        Args:
            skills: List of skill dictionaries from LLM extraction
            
        Returns:
            Validated list of skills with suspicious ones removed
        """
        # Allowlist of valid skill names (from predefined keywords)
        valid_skill_keywords = {
            "react", "python", "javascript", "java", "machine learning",
            "data science", "web development", "backend", "frontend",
            "node", "css", "html", "typescript", "database", "sql",
            "rest api", "docker", "kubernetes", "aws", "azure", "devops",
            "testing", "git", "agile", "golang", "rust", "mobile",
            "android", "ios", "ui/ux", "design", "tutoring", "tutoring",
            "learning", "teaching", "development", "programming",
        }
        
        validated = []
        
        for skill in skills:
            if not isinstance(skill, dict):
                continue
            
            name = skill.get("name", "").lower().strip()
            
            # Check if skill name contains any of our valid keywords
            is_valid = False
            for keyword in valid_skill_keywords:
                if keyword in name:
                    is_valid = True
                    break
            
            # Additional check: skill name should be reasonable length
            # Very short or very long names are suspicious
            if is_valid and len(name) < 3:
                is_valid = False
            if is_valid and len(name) > 100:
                is_valid = False
            
            # Check for obvious hallucinations (e.g., "Frontend Tutoring" as a person)
            # These should be skills, not descriptions of people
            if is_valid and skill.get("description", "").lower().startswith("seeking") or \
               skill.get("description", "").lower().startswith("one-on-one tutor"):
                logger.warning(f"Potential hallucination detected: {skill}")
                is_valid = False
            
            if is_valid:
                validated.append(skill)
            else:
                logger.warning(f"Skill validation failed - discarding: {skill}")
        
        return validated


def create_chat_service(api_key: str, model: str, llm_service):
    """Create chat service instance."""
    return ChatService(api_key, model, llm_service)