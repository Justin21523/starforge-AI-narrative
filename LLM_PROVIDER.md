# LLM_PROVIDER.md

This file provides guidance to LLMProvider Tooling (llm_provider.ai/code) when working with code in this repository.

## Project Overview

AI-driven narrative game for bullying prevention education, targeting 11-year-old students. Features a 2D horizontal scrolling game with dynamic NPC dialogue powered by multi-agent AI orchestration and RAG.

## Development Commands

### Frontend (TypeScript + Canvas + Vite)
```bash
cd client && npm install
npm run dev          # Dev server on http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
```

### Backend (Python + FastAPI)
```bash
conda activate ai_env
cd backend/app && uvicorn main:app --reload  # API on http://localhost:8000
```

### Testing
```bash
PYTHONPATH=backend pytest backend/tests  # Mock-only, no GPU needed
```

## Architecture

### Tech Stack
- **Frontend:** TypeScript 5.3+, Vite 5.0, native Canvas 2D API (no game framework)
- **Backend:** Python 3.10+, FastAPI, Pydantic, PyTorch-compatible
- **Data:** JSON files in `/data/` for scenes, NPCs, quests, lore

### Request Flow
```
Frontend (Canvas game) → AiClient/GameClient
    ↓
Backend API routes (/ai/dialogue, /game/*)
    ↓
DialogueAgent orchestration:
  PlannerAgent → ToolRegistry (GetGameStateTool, SearchLoreTool) → LlmClient → SafetyAgent
    ↓
Response with NPC dialogue, choices, stat effects
```

### Key Directories
- `client/src/core/` — Game loop, input handling, scene manager
- `client/src/api/` — AiClient, GameClient (HTTP + Mock implementations)
- `client/src/state/` — Centralized appStore for game state
- `backend/app/ai/orchestrator/` — DialogueAgent, PlannerAgent, SafetyAgent
- `backend/app/ai/tools/` — RAG search, game state tools
- `backend/app/game/services/` — PlayerService, QuestService, SceneService
- `data/` — Static game data (scenes, NPCs, quests, lore)

### Interface-Based Testing Pattern
All external services use interfaces for mock swapping:
- `AiClient` → MockAiClient | HttpAiClient
- `LlmClient` → LlmClientMock | LocalLlmClient
- Environment flags: `USE_MOCK_LLM`, `USE_MOCK_IMAGE_CLIENT`, `USE_MOCK_VECTOR_STORE`

### State Management
- **Frontend:** `appStore` with dispatch pattern
- **Backend:** In-memory services (PlayerService, QuestService) for MVP

## Key API Endpoints
- `POST /ai/dialogue` — Generate NPC dialogue with AI orchestration
- `GET /game/scenes`, `/game/npcs`, `/game/quests` — Static game data
- `GET /game/player/{playerId}/state` — Player and NPC stats
- `GET /game/lore/search` — RAG-based lore search

## Configuration

### Environment Variables (`.env`)
```
USE_MOCK_LLM=true              # Set false to use real models
USE_MOCK_IMAGE_CLIENT=true
USE_MOCK_VECTOR_STORE=true
LLM_MODEL_PATH=/mnt/c/ai_models/llm/qwen2-7b-instruct
```

### Frontend Toggle
Click "AI Mode: Mock/HTTP" button in UI, or set `VITE_USE_MOCK_AI=true/false`

## Data Models

### PlayerStats
`confidence`, `empathy`, `stress`, `reputation` (0-100 scale)

### NpcStats
`friendship` (-10 to +50), `trust` (0-20), `roleTags` (bully/friend/teacher/victim/adult)

### Scene
`id`, `name`, `timeOfDay[]`, `connections[]`, `backgroundPrompt`, `backgroundImage`

## Conventions

- **Frontend:** camelCase variables, PascalCase classes/types
- **Backend:** snake_case variables, PascalCase classes, async/await for I/O
- **Pydantic:** Auto alias camelCase ↔ snake_case for frontend compatibility
- **Canvas rendering:** Direct ctx methods, no PixiJS

## Documentation
- `project.md` — Detailed game design and architecture (Chinese)
- `AGENTS.md` — Agent system and safety protocols (Chinese)
- `docs/frontend_dev_notes.md` — Frontend development details
