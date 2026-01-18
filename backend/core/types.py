"""
Shared type definitions and enums for the Knowledge Debt Exchange backend.
"""

from enum import Enum
from typing import TypedDict, List, Optional, Dict, Any
from datetime import datetime


# ==================== Enums ====================

class MatchStatus(str, Enum):
    """Status of a match between users."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class BarterStatus(str, Enum):
    """Status of a barter/exchange."""
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BarterType(str, Enum):
    """Type of barter exchange."""
    DIRECT = "direct"  # 1:1 exchange (A ↔ B)
    THREE_WAY = "three_way"  # 3-way cycle (A → B → C → A)
    MULTI_WAY = "multi_way"  # Complex n-way cycle


class ProficiencyLevel(str, Enum):
    """Skill proficiency level."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class SkillCategory(str, Enum):
    """Common skill categories."""
    PROGRAMMING = "programming"
    DESIGN = "design"
    BUSINESS = "business"
    MARKETING = "marketing"
    DATA_SCIENCE = "data_science"
    LANGUAGE = "language"
    WRITING = "writing"
    MUSIC = "music"
    OTHER = "other"


# ==================== TypedDicts for Internal Use ====================

class SkillDict(TypedDict, total=False):
    """Skill dictionary for internal processing."""
    name: str
    description: Optional[str]
    category: Optional[str]
    proficiency_level: Optional[str]
    tags: List[str]
    embedding: Optional[List[float]]


class MatchCandidate(TypedDict):
    """Candidate match before LLM re-ranking."""
    user_id: str
    skill_offered: str
    skill_needed: str
    embedding_score: float
    metadata: Dict[str, Any]


class LLMMatchAnalysis(TypedDict):
    """Result from LLM match analysis."""
    adjusted_score: float
    can_help: bool
    confidence: float
    reasoning: str
    explanation: str
    prerequisites_met: bool
    skill_level_match: bool


class MatchResult(TypedDict):
    """Final match result after hybrid scoring."""
    user_id: str
    matched_user_id: str
    skill_offered: str
    skill_needed: str
    match_score: float
    confidence: float
    explanation: str
    is_reciprocal: bool
    metadata: Dict[str, Any]


class BarterCycle(TypedDict):
    """Detected barter cycle."""
    participants: List[str]  # User IDs in cycle order
    cycle_type: BarterType
    exchanges: List[Dict[str, str]]  # from_user, to_user, skill
    fairness_score: float
    explanation: str


# ==================== Constants ====================

# Matching thresholds
MIN_MATCH_SCORE = 0.3  # Minimum score to consider as a match
HIGH_CONFIDENCE_THRESHOLD = 0.8  # Score considered high confidence
MIN_EMBEDDING_SIMILARITY = 0.4  # Minimum embedding similarity for candidates

# LLM configuration
LLM_MAX_RETRIES = 3
LLM_TIMEOUT_SECONDS = 30
LLM_TEMPERATURE = 0.3  # Low temperature for consistent scoring

# Barter configuration
MAX_BARTER_PARTICIPANTS = 5  # Maximum users in a barter cycle
MIN_FAIRNESS_SCORE = 0.6  # Minimum fairness score for valid barter

# Embedding configuration
EMBEDDING_CACHE_TTL_DAYS = 30  # How long to keep cached embeddings
MAX_EMBEDDING_BATCH_SIZE = 100  # Max embeddings to generate in one batch

# API rate limits
MAX_MATCHES_PER_REQUEST = 20
MAX_SKILLS_PER_USER = 50


# ==================== Helper Functions ====================

def proficiency_to_numeric(level: str) -> int:
    """
    Convert proficiency level to numeric score for comparison.
    
    Args:
        level: Proficiency level string
        
    Returns:
        Numeric score (1-4)
    """
    mapping = {
        ProficiencyLevel.BEGINNER: 1,
        ProficiencyLevel.INTERMEDIATE: 2,
        ProficiencyLevel.ADVANCED: 3,
        ProficiencyLevel.EXPERT: 4,
    }
    return mapping.get(level, 2)  # Default to intermediate


def proficiency_gap(helper_level: str, seeker_level: str) -> int:
    """
    Calculate proficiency gap between helper and seeker.
    Positive means helper is more proficient (good for teaching).
    
    Args:
        helper_level: Helper's proficiency level
        seeker_level: Seeker's proficiency level
        
    Returns:
        Gap (-3 to 3)
    """
    return proficiency_to_numeric(helper_level) - proficiency_to_numeric(seeker_level)


def is_valid_proficiency_match(helper_level: str, seeker_level: str) -> bool:
    """
    Check if helper's proficiency is sufficient for seeker's need.
    Helper should be at least at the same level or higher.
    
    Args:
        helper_level: Helper's proficiency level
        seeker_level: Seeker's need level
        
    Returns:
        True if valid match
    """
    gap = proficiency_gap(helper_level, seeker_level)
    return gap >= 0  # Helper should be same level or higher