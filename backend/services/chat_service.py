"""
Chat service for conversational skill extraction.
ENHANCED VERSION - Completely eliminates "json" artifact bug with stricter controls.
"""

import re
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
        Generate AI response and extract learning needs.
        
        Returns:
            {
                "response": "AI response text",
                "needs_extraction_ready": bool,
                "extracted_needs": [...] if ready
            }
        """
        
        # Count user messages
        user_message_count = sum(1 for msg in chat_history if msg.get("role") == "user")
        
        # Try extraction after 1+ messages
        should_extract = user_message_count >= 1
        
        # ENHANCED SYSTEM PROMPT - Very explicit about format
        if should_extract:
            system_prompt = """You are a helpful AI assistant for KnowledgeX, a skill-exchange platform.

The user has described what they want to learn. Extract their learning needs.

CRITICAL RULES FOR EXTRACTION:
1. Use ONLY this format - NO variations
2. NO JSON - use simple bullet list ONLY
3. NO code blocks (```) - just plain text
4. Each skill on its own line with a dash (-)

EXACT FORMAT TO USE:

[Your friendly message here]

SKILLS_TO_LEARN:
- Skill Name One
- Skill Name Two  
- Skill Name Three

REAL EXAMPLE:

"That's wonderful! You have valuable ML and Data Science expertise, and transitioning into Marketing and Design is an exciting career move. Let me find experts who can help you make this transition.

SKILLS_TO_LEARN:
- Marketing Strategy
- Digital Marketing
- Brand Design
- UI/UX Design
- Graphic Design"

WHAT NOT TO DO (WRONG):
❌ ```json
❌ {"skills": [...]}
❌ EXTRACTION: {json}
❌ Using "json" as a skill name

Extract NOW using the correct format."""

        else:
            system_prompt = """You are a helpful AI assistant for KnowledgeX.

Ask the user what they want to learn. Keep it short and friendly.

Example: "What would you like to learn today?"

DO NOT extract skills yet - just ask clarifying questions."""
        
        # Build messages
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(chat_history)
        messages.append({"role": "user", "content": user_message})
        
        # Call LLM with strict parameters
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://knowledgex.app",
                        "X-Title": "KnowledgeX"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.5,  # Lower temp for more consistent format
                        "max_tokens": 800,
                        "top_p": 0.9  # Slightly restrict randomness
                    },
                    timeout=60.0
                )
                
                response.raise_for_status()
                data = response.json()
                ai_response = data["choices"][0]["message"]["content"]
                
                logger.info(f"Raw AI response: {ai_response[:200]}...")
        
        except Exception as e:
            logger.error(f"LLM API error: {e}", exc_info=True)
            return {
                "response": "I apologize, but I'm having trouble right now. Could you try again?",
                "needs_extraction_ready": False,
                "extracted_needs": []
            }
        
        # POST-PROCESSING: Clean up AI response BEFORE extraction
        ai_response = self._remove_code_blocks(ai_response)
        
        # Extract skills
        extracted_needs = []
        needs_ready = False
        clean_response = ai_response
        
        if "SKILLS_TO_LEARN:" in ai_response:
            try:
                extracted_needs = self._extract_skills_from_bullets(ai_response)
                
                if extracted_needs:
                    needs_ready = True
                    clean_response = ai_response.split("SKILLS_TO_LEARN:")[0].strip()
                    
                    logger.info(f"✅ Extracted {len(extracted_needs)} skills: {[s['name'] for s in extracted_needs]}")
                else:
                    logger.warning("⚠️ SKILLS_TO_LEARN marker found but no valid skills extracted")
                    
            except Exception as e:
                logger.error(f"❌ Skill extraction error: {e}", exc_info=True)
        
        # Fallback: If should extract but AI didn't comply
        if should_extract and not needs_ready and user_message_count >= 2:
            logger.info("🔄 Using fallback keyword extraction")
            extracted_needs = self._fallback_keyword_extraction(user_message, chat_history)
            if extracted_needs:
                needs_ready = True
                clean_response += "\n\nGreat! Let me find experts who can help you with these skills."
        
        return {
            "response": clean_response,
            "needs_extraction_ready": needs_ready,
            "extracted_needs": extracted_needs
        }
    
    def _remove_code_blocks(self, text: str) -> str:
        """
        Remove markdown code blocks from AI response.
        This prevents ```json from interfering with extraction.
        
        Args:
            text: AI response
            
        Returns:
            Text with code blocks removed
        """
        # Remove code blocks: ```json ... ``` or ``` ... ```
        text = re.sub(r'```[\w]*\n.*?```', '', text, flags=re.DOTALL)
        text = re.sub(r'```', '', text)
        
        return text
    
    def _extract_skills_from_bullets(self, response: str) -> List[Dict[str, Any]]:
        """
        Extract skills from bullet list format with STRICT validation.
        
        Args:
            response: AI response containing SKILLS_TO_LEARN:
            
        Returns:
            List of validated skill dictionaries
        """
        # Split at marker
        parts = response.split("SKILLS_TO_LEARN:")
        if len(parts) < 2:
            logger.warning("No SKILLS_TO_LEARN section found")
            return []
        
        skills_section = parts[1].strip()
        logger.debug(f"Skills section: {skills_section[:200]}")
        
        # Extract lines that start with bullet points
        skill_lines = re.findall(
            r'^[\s]*[-*•]\s*(.+?)[\s]*$',
            skills_section,
            re.MULTILINE
        )
        
        if not skill_lines:
            # Fallback: get lines without bullets (but not empty)
            lines = skills_section.split('\n')
            skill_lines = []
            for line in lines:
                line = line.strip()
                if line and len(line) > 2 and not line.startswith('#'):
                    # Remove leading bullet if present
                    line = re.sub(r'^[-*•]\s*', '', line)
                    skill_lines.append(line)
        
        logger.debug(f"Found {len(skill_lines)} potential skills: {skill_lines}")
        
        # Clean and validate each skill with STRICT checks
        skills = []
        for raw_skill in skill_lines:
            cleaned = self._clean_skill_name(raw_skill)
            
            if cleaned and self._is_valid_skill_name(cleaned):
                skills.append({
                    "name": cleaned,
                    "description": f"User wants to learn {cleaned}",
                    "proficiency_level": "beginner"
                })
                logger.debug(f"✅ Valid skill: {cleaned}")
            else:
                logger.warning(f"❌ Rejected invalid skill: {raw_skill} -> {cleaned}")
        
        return skills
    
    def _clean_skill_name(self, raw_name: str) -> str:
        """
        Aggressively clean skill name to remove ALL artifacts.
        
        Args:
            raw_name: Raw extracted text
            
        Returns:
            Cleaned skill name
        """
        # Remove code block markers
        cleaned = re.sub(r'```[\w]*', '', raw_name)
        cleaned = re.sub(r'```', '', cleaned)
        
        # Remove triple quotes (common Python artifact)
        cleaned = cleaned.replace('"""', '').replace("'''", '')
        
        # Remove all types of quotes and backticks
        cleaned = re.sub(r'^[`"\'\s]+|[`"\'\s]+$', '', cleaned)
        
        # Remove JSON-like brackets and braces
        cleaned = cleaned.replace('{', '').replace('}', '')
        cleaned = cleaned.replace('[', '').replace(']', '')
        
        # Remove common formatting words that appear alone
        if cleaned.lower().strip() in ['json', 'yaml', 'xml', 'code']:
            return ""
        
        return cleaned.strip()
    
    def _is_valid_skill_name(self, name: str) -> bool:
        """
        STRICT validation to prevent ANY artifacts from passing through.
        
        Args:
            name: Cleaned skill name
            
        Returns:
            True only if legitimately valid
        """
        if not name:
            return False
        
        # Length check
        if len(name) < 2 or len(name) > 100:
            logger.debug(f"Length check failed: {len(name)} chars")
            return False
        
        # EXPANDED list of invalid terms
        invalid_terms = {
            # Programming artifacts
            'json', 'yaml', 'xml', 'html', 'css', 'markdown', 'md',
            # Code formatting
            '```', '"""', "'''", '---', 'code', 'block', 'text',
            # Programming keywords
            'null', 'none', 'undefined', 'nan', 'true', 'false',
            # Empty/placeholder
            'n/a', 'tbd', 'todo', 'fixme', 'example', 'sample',
            # Single letters/numbers
            'a', 'b', 'c', 'x', 'y', 'z', '1', '2', '3',
        }
        
        name_lower = name.lower().strip()
        
        # Exact match check
        if name_lower in invalid_terms:
            logger.debug(f"Exact match to invalid term: {name_lower}")
            return False
        
        # Check if name is ONLY special characters
        if re.match(r'^[^a-zA-Z0-9]+$', name):
            logger.debug(f"Only special characters: {name}")
            return False
        
        # Must contain at least one letter
        if not re.search(r'[a-zA-Z]', name):
            logger.debug(f"No letters found: {name}")
            return False
        
        # Reject if mostly special characters (>50%)
        letter_count = len(re.findall(r'[a-zA-Z]', name))
        if letter_count < len(name) * 0.5:
            logger.debug(f"Too many special chars: {letter_count}/{len(name)}")
            return False
        
        # Additional check: must have at least 2 letters
        if letter_count < 2:
            logger.debug(f"Less than 2 letters: {letter_count}")
            return False
        
        return True
    
    def _fallback_keyword_extraction(
        self, 
        user_message: str, 
        chat_history: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Fallback: Extract using keyword matching from predefined list.
        This completely prevents hallucination.
        
        Args:
            user_message: Current message
            chat_history: Previous messages
            
        Returns:
            List of extracted skills
        """
        # Combine all user text
        all_text = " ".join([
            msg["content"] for msg in chat_history 
            if msg.get("role") == "user"
        ])
        all_text += " " + user_message
        text_lower = all_text.lower()
        
        # EXPANDED skill keyword mapping
        skill_keywords = {
            # Programming Languages
            "python": "Python Programming",
            "javascript": "JavaScript",
            "typescript": "TypeScript",
            "java": "Java Programming",
            "c++": "C++ Programming",
            "c#": "C# Programming",
            "golang": "Go Programming",
            "rust": "Rust Programming",
            "ruby": "Ruby Programming",
            "php": "PHP Development",
            "swift": "Swift Development",
            "kotlin": "Kotlin Development",
            
            # Web Development
            "react": "React",
            "vue": "Vue.js",
            "angular": "Angular",
            "node": "Node.js",
            "express": "Express.js",
            "django": "Django",
            "flask": "Flask",
            "fastapi": "FastAPI",
            "nextjs": "Next.js",
            "nuxt": "Nuxt.js",
            
            # Frontend
            "html": "HTML",
            "css": "CSS",
            "sass": "Sass/SCSS",
            "tailwind": "Tailwind CSS",
            "bootstrap": "Bootstrap",
            "frontend": "Frontend Development",
            "web development": "Web Development",
            
            # Backend
            "backend": "Backend Development",
            "rest api": "REST APIs",
            "graphql": "GraphQL",
            "microservices": "Microservices",
            
            # Data & ML
            "machine learning": "Machine Learning",
            "data science": "Data Science",
            "deep learning": "Deep Learning",
            "neural network": "Neural Networks",
            "nlp": "Natural Language Processing",
            "computer vision": "Computer Vision",
            "ai": "Artificial Intelligence",
            "tensorflow": "TensorFlow",
            "pytorch": "PyTorch",
            
            # Databases
            "sql": "SQL",
            "database": "Database Design",
            "mongodb": "MongoDB",
            "postgresql": "PostgreSQL",
            "mysql": "MySQL",
            "redis": "Redis",
            
            # DevOps & Cloud
            "docker": "Docker",
            "kubernetes": "Kubernetes",
            "aws": "AWS",
            "azure": "Azure",
            "gcp": "Google Cloud",
            "devops": "DevOps",
            "ci/cd": "CI/CD",
            
            # Design & Marketing
            "ui": "UI Design",
            "ux": "UX Design",
            "design": "Design",
            "figma": "Figma",
            "photoshop": "Photoshop",
            "marketing": "Marketing Strategy",
            "digital marketing": "Digital Marketing",
            "brand": "Brand Design",
            "graphic design": "Graphic Design",
            
            # Mobile
            "mobile": "Mobile Development",
            "android": "Android Development",
            "ios": "iOS Development",
            "react native": "React Native",
            "flutter": "Flutter",
            
            # Other
            "testing": "Software Testing",
            "git": "Git Version Control",
            "agile": "Agile Development",
            "scrum": "Scrum",
        }
        
        extracted = []
        found_skills = set()
        
        # Sort by length (longest first) to match "machine learning" before "machine"
        sorted_keywords = sorted(skill_keywords.keys(), key=len, reverse=True)
        
        for keyword in sorted_keywords:
            if keyword in text_lower:
                skill_name = skill_keywords[keyword]
                if skill_name not in found_skills:
                    extracted.append({
                        "name": skill_name,
                        "description": f"User wants to learn {skill_name}",
                        "proficiency_level": "beginner"
                    })
                    found_skills.add(skill_name)
        
        if not extracted:
            logger.warning(f"⚠️ Fallback found no skills in: {user_message}")
        else:
            logger.info(f"✅ Fallback extracted: {[s['name'] for s in extracted]}")
        
        return extracted


def create_chat_service(api_key: str, model: str, llm_service):
    """Create chat service instance."""
    return ChatService(api_key, model, llm_service)