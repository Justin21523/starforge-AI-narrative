# Repository Guidelines

## Project Structure & Module Organization
- Current docs: `project.md` holds the game vision; `README.md` is the entry point. Add deep design notes under `docs/` when they grow.
- Planned layout (create as you scaffold): `client/` (2D canvas/Pixi front end), `server/` (gameplay APIs/persistence), `ai/` (RAG/orchestrator/safety), `assets/` (sprites/audio/story seeds), `tests/`, `scripts/`.
- Co-locate scene code, dialogue defs, and quest helpers by feature (e.g., `client/src/scenes/hallway/*`). Keep mocks next to interfaces (`ai/mocks/*`) to ease swapping real services.

## Build, Test, and Development Commands
- Use Node 18+ and npm (or pnpm if standardized). Add scripts to `package.json` as soon as packages exist.
- Suggested scripts: `npm run dev:client` (front-end dev server), `npm run dev:server` (API/AI stub server), `npm test` (unit/integration with mocks), `npm run lint` (ESLint/Prettier), `npm run build` (production bundle). Note any differences in `README.md`.
- Provide `.env.example` for required keys (LLM, image gen); never commit real secrets.
 - Backend dev: conda `ai_env`, install `fastapi uvicorn pydantic httpx` (mock mode by default, no GPU); run `uvicorn app.main:app --reload --app-dir backend/app`. Routes: `/health`, `/ai/dialogue`, `/game/scenes`, `/game/npcs`, `/game/quests`, `/game/player/{id}/state`, `/game/player/{id}/quests`.

## Coding Style & Naming Conventions
- Default to TypeScript, 2-space indentation, semicolons on, trailing commas for multi-line literals. Use camelCase for vars/functions, PascalCase for classes/components, kebab-case for filenames/dirs.
- Keep scene, quest, and agent modules small and pure; isolate side effects behind services (e.g., `ai/OrchestratorService.ts`).
- Run formatting and linting before push; keep Prettier/ESLint configs shared at repo root.

## Testing Guidelines
- Use Vitest or Jest for units; name files `*.spec.ts`. For flow/scene checks, prefer Playwright/Cypress with deterministic seeds and mocked AI.
- All AI/image calls must have stub adapters; no network in CI. Capture expected prompts/responses as fixtures.
- Target branch logic, quest gating, and safety filters with coverage; add regression tests for dialogue branching bugs.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). Keep commits focused and reversible.
- PRs should include a short summary, what/where tested (`npm test`, `npm run lint`, manual steps), linked issue/task, and screenshots/GIFs for UI or dialogue changes.
- Update docs when behavior or architecture shifts (`project.md`, `AGENTS.md`, `README.md`); request reviews only after checks pass.

## AI & Content Safety
- Keep a dedicated safety agent/rule set for bullying-related dialogues; assert safe responses in tests and mocks.
- Version prompt templates and RAG seed data under `ai/prompts/` and `assets/data/`; document changes in PRs.
- Respect minors’ context: avoid violent/unsafe suggestions, and log safety decisions server-side without storing player PII.
