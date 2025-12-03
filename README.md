# starforge-AI-narrative

## Backend quickstart (mock mode, conda `ai_env`)
- Activate env: `conda activate ai_env`
- Install deps (minimal): `pip install fastapi uvicorn pydantic httpx`
- Run API (mock LLM, no GPU): `cd backend/app && uvicorn app.main:app --reload`
- Key routes:
  - `GET /health` — health check
  - `POST /ai/dialogue` — dialogue (uses mock LLM by default)
  - `GET /game/scenes`, `/game/npcs`, `/game/quests` — static data
  - `GET /game/player/{playerId}/state` — player/NPC stats (in-memory)
  - `GET /game/player/{playerId}/quests` — quest stages (in-memory)
  - `GET /config` — current mock flags & model paths
- Tests: `PYTHONPATH=backend pytest backend/tests` (mock-only; no GPU/model needed)

## Frontend quickstart (mock AI)
- Install: `cd client && npm install`
- Run: `npm run dev`
- Toggle AI mode: click “AI Mode” button in HUD (Mock/HTTP) or set `VITE_USE_MOCK_AI=false` & `VITE_API_BASE_URL=/ai`.
