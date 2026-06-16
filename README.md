# KnowledgeX

A reciprocal **skill-exchange platform** that connects people who want to learn with those who can
teach — collaborative learning through skill bartering instead of money. A Python developer who
wants to learn UI/UX design is matched with a designer who wants to learn programming, and the two
exchange knowledge directly.

> Built at the **NexHacks** hackathon.

## Overview

Users describe what they can teach and what they want to learn through a short AI-guided chat. A
two-layer matching engine then finds complementary partners — semantic vector search to surface
candidates, followed by an LLM pass that judges and re-ranks them — and surfaces **reciprocal**
matches where both people can help each other. Connected users coordinate over a built-in messaging
system.

## Core Features

- **AI skill extraction** — a chat assistant extracts skills offered / needed from natural
  conversation, so there are no long onboarding forms.
- **Two-layer semantic matching** — vector embeddings find candidates, then an LLM re-ranks them and
  flags reciprocal (mutually beneficial) pairs.
- **Messaging** — connected users coordinate sessions and exchange resources, with polling-based
  updates.
- **Profiles** — each user maintains skills offered, skills needed, bio, and location.

## Architecture

```mermaid
flowchart LR
    subgraph Client["🖥️ Client"]
        UI["React 18 + Tailwind SPA<br/>bearer token in localStorage"]
    end

    subgraph API["⚙️ FastAPI Backend (backend/main.py · :8000)"]
        direction TB
        R["Routers<br/>auth · users · chat · matching · messages · barter"]
        subgraph SVC["Service layer"]
            CHAT["ChatService<br/>skill extraction"]
            MATCH["MatchingService<br/>two-layer engine"]
            EMB["EmbeddingService<br/>+ cache"]
            LLM["LLMService"]
            STORE["StorageService"]
        end
        R --> CHAT & MATCH
        MATCH --> EMB & LLM & STORE
        CHAT --> LLM
    end

    subgraph Data["🗄️ MongoDB (Motor async)"]
        DB[("users · matches · messages<br/>embeddings_cache")]
    end

    subgraph AI["🤖 OpenRouter (OpenAI-compatible)"]
        GEMMA["LLM<br/>google/gemma-3-27b-it:free"]
        OAI["Embeddings<br/>openai/text-embedding-3-small · 1536-d"]
    end

    UI -- "HTTP / JSON<br/>/api" --> R
    STORE <--> DB
    EMB <--> DB
    LLM --> GEMMA
    EMB --> OAI
```

### Stack
- **Frontend:** React 18 + React Router + Tailwind CSS. Talks to the backend at
  `http://localhost:8000/api` with a bearer token stored in `localStorage`.
- **Backend:** FastAPI + `asyncio`, MongoDB via Motor, Pydantic for models/settings, JWT auth.
- **AI:** All model calls go through **OpenRouter**. The LLM is **Google Gemma**
  (`google/gemma-3-27b-it:free`) and embeddings are **OpenAI `text-embedding-3-small`** (1536-dim),
  called through OpenRouter's OpenAI-compatible endpoint. Embeddings are cached in the
  `embeddings_cache` MongoDB collection (keyed by a hash of the text) to avoid recomputation.

### Two-layer matching engine
1. **Layer 1 — embedding retrieval** (`backend/services/matching_service.py::_retrieve_candidates`):
   each "skill needed" and each candidate "skill offered" is embedded, and **cosine similarity**
   (`backend/utils/similarity.py`) ranks candidates. Pairs below
   `MIN_EMBEDDING_SIMILARITY = 0.4` are dropped.
2. **Layer 2 — LLM re-rank** (`_rerank_with_llm` + `backend/services/llm_service.py::analyze_match`):
   the top candidates are passed to the LLM, which judges whether the helper can really teach the
   need, returns a confidence and explanation, and adjusts the score.
3. **Reciprocity** (`_check_reciprocity`): detects pairs where each user can help the other, so the
   exchange is mutual.

The full request flow, from a user asking for matches to the ranked, reciprocity-flagged result:

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant API as FastAPI /matching
    participant MS as MatchingService
    participant ES as EmbeddingService
    participant DB as MongoDB
    participant OR as OpenRouter

    U->>FE: Request matches
    FE->>API: POST /api/matches/compute (Bearer)
    API->>MS: find_matches_for_user(user_id)

    rect rgb(235, 244, 255)
    note over MS,OR: Layer 1 — embedding retrieval
    MS->>ES: get_or_create(need / skill text)
    ES->>DB: lookup embeddings_cache (hash + model)
    alt cache miss
        ES->>OR: embed (text-embedding-3-small)
        OR-->>ES: 1536-d vector
        ES->>DB: upsert cache
    end
    ES-->>MS: vectors
    MS->>MS: cosine similarity, keep ≥ 0.4, top-K
    end

    rect rgb(237, 247, 237)
    note over MS,OR: Layer 2 — LLM re-rank
    MS->>OR: analyze_match (Gemma) per candidate
    OR-->>MS: can_help, adjusted_score, confidence, explanation
    MS->>MS: drop can_help=false, re-sort
    end

    rect rgb(255, 244, 235)
    note over MS,DB: Reciprocity
    MS->>DB: fetch helpers' skills_needed
    MS->>MS: flag mutual (is_reciprocal)
    end

    MS-->>API: ranked matches
    API-->>FE: 200 OK (matches JSON)
    FE-->>U: Render match cards
```

## Project layout

```
backend/        FastAPI app — api/ (routes), services/, models/, core/ (config, db), utils/
frontend/       React + Tailwind single-page app
tests/          pytest + standalone integration scripts (see below)
run_server.py   entry point (uvicorn on port 8000)
```

## Data model

MongoDB collections and their relationships. Skills are **embedded** documents inside each user
(`skills_offered` / `skills_needed`), not a separate collection.

```mermaid
erDiagram
    USERS ||--o{ SKILL_ITEM : embeds
    USERS ||--o{ MATCHES : "appears in"
    USERS ||--o{ MESSAGES : "sends / receives"
    USERS ||--o{ EMBEDDINGS_CACHE : owns
    MATCHES ||--o{ MESSAGES : initiates

    USERS {
        string _id PK
        string email UK
        string username UK
        string full_name
        string bio
        string location
        string hashed_password
        array  skills_offered "embedded SKILL_ITEM[]"
        array  skills_needed "embedded SKILL_ITEM[]"
        array  chat_history
        bool   is_active
        bool   is_verified
        datetime created_at
    }
    SKILL_ITEM {
        string name
        string description
        string category
        string proficiency_level "beginner..expert"
        array  tags
    }
    MATCHES {
        string _id PK
        string user_id FK "seeker"
        string matched_user_id FK "helper"
        string skill_needed
        string skill_offered
        float  match_score "0..1"
        float  confidence "0..1 (LLM)"
        string explanation
        string status "pending/accepted/rejected/expired"
        bool   is_reciprocal
        object metadata
    }
    MESSAGES {
        string _id PK
        string from_user_id FK
        string to_user_id FK
        string match_id FK
        string content
        bool   is_read
        datetime created_at
    }
    EMBEDDINGS_CACHE {
        string _id PK
        string ownerUserId FK
        string type "skill | need"
        string refId
        string model
        string textHash "invalidation key"
        int    dim "1536"
        array  vector
    }
```

A match moves through a simple lifecycle (`MatchStatus`):

```mermaid
stateDiagram-v2
    [*] --> pending : engine computes match
    pending --> accepted : helper accepts
    pending --> rejected : helper declines
    pending --> expired : no response
    accepted --> [*] : conversation opens
    rejected --> [*]
    expired --> [*]
```

## Service design

The matching engine composes three focused services behind `MatchingService`:

```mermaid
classDiagram
    class MatchingService {
        +find_matches_for_user(user_id, top_k, use_llm) List~Match~
        -_retrieve_candidates(user, top_k)
        -_rerank_with_llm(user, candidates, top_k)
        -_check_reciprocity(user, matches)
        -_skills_are_similar(a, b) bool
    }
    class EmbeddingService {
        +get_or_create(owner, type, ref_id, text) Vector
        +embed(texts) List~Vector~
        +embed_batch_with_cache(items)
        +cosine_similarity(a, b)$ float
    }
    class LLMService {
        +analyze_match(seeker_need, helper_skills, ...) Analysis
        -_build_match_analysis_prompt(...)
    }
    class StorageService {
        +get_user_by_id(id) UserInDB
        +get_active_users(limit, exclude_user_id)
    }

    MatchingService --> EmbeddingService : embeds & scores
    MatchingService --> LLMService : re-ranks
    MatchingService --> StorageService : loads users
    EmbeddingService ..> LLMService : "shares OpenRouter key"
```

## Getting started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A MongoDB instance (local or MongoDB Atlas)
- An [OpenRouter](https://openrouter.ai) API key

### Backend

```bash
git clone https://github.com/chaturbandaru/KnowledgeX.git
cd KnowledgeX

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # then edit .env with your values
python run_server.py             # serves on http://localhost:8000
```

The app loads configuration from a `.env` file in the project root (see
`backend/core/config.py`). Required and optional variables — full list in
[`.env.example`](.env.example):

```
MONGO_URL=mongodb+srv://<user>:<pass>@<cluster>/<db>   # MongoDB connection string
DATABASE_NAME=knoweldge_debt
JWT_SECRET_KEY=<a-long-random-secret>
OPENROUTER_API_KEY=<your-openrouter-key>
LLM_MODEL=google/gemma-3-27b-it:free
EMBEDDING_MODEL=openai/text-embedding-3-small
# TTC_API_KEY=<optional - Token Company compression, see below>
```

Interactive API docs are available at `http://localhost:8000/docs` once the server is running.

### Frontend

```bash
cd frontend
npm install
npm start                        # serves on http://localhost:3000
```

The frontend expects the backend at `http://localhost:8000/api`.

## Testing

```bash
pytest tests/                    # unit/contract tests (e.g. test_embeddings2.py)
```

Several files under `tests/` are **standalone integration scripts** that hit live services
(MongoDB, OpenRouter) rather than pytest cases — run them directly, e.g.:

```bash
python -m tests.test_matching
python -m tests.test_embeddings
python tests/test_import.py      # smoke test: confirms the app imports
```

## Optional: Token Company compression

The chat route can optionally compress prompts using the
[Token Company](https://pypi.org) `tokenc` SDK to reduce token usage. It is **off by default** and
not required — the app runs fine without it. To enable:

```bash
pip install tokenc          # not in requirements.txt; install separately
```

```
TTC_API_KEY=<your-token-company-key>
```

When `tokenc` is not installed or `TTC_API_KEY` is unset, compression is silently skipped.

## License

[MIT](LICENSE)
