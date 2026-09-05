# SprintForge

SprintForge turns a product feature idea into an explainable PRD, user stories, engineering tasks, and a capacity-aware sprint plan.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/sprintforge run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push development schema changes
- Required env: `DATABASE_URL` — managed PostgreSQL connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query
- API: Express 5
- DB: managed PostgreSQL + Drizzle ORM
- Validation: generated OpenAPI Zod schemas
- API codegen: Orval
- Build: Vite and esbuild

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/` — plans, stories, tasks, sprints, and processing runs
- `artifacts/api-server/src/lib/planning.ts` — deterministic priority, effort, dependency, and sprint allocation logic
- `artifacts/api-server/src/routes/plans.ts` — plan CRUD, processing, and admin statistics
- `artifacts/sprintforge/src/App.tsx` — responsive product workflow and results experience
- `artifacts/sprintforge/src/index.css` — Forge Console visual system

## Architecture decisions

- Planning output is deterministic and key decisions are returned with explanations, so the app works without an AI key and remains demo-friendly.
- The app uses the workspace-managed PostgreSQL database rather than introducing a second database runtime.
- The frontend consumes generated API hooks only; the OpenAPI file is the contract between UI and server.
- Sample data is seeded once on an empty database and is marked `[Sample]` in the saved-plan library.

## Product

- Overview dashboard with live plan, story, task, and engine health summaries
- New plan workflow with required product context and capacity model
- Generated plan detail with PRD, stories, engineering tasks, sprint allocation, risks, metrics, decision explanations, copy, and Markdown export
- Saved plans with search, open, rename, and delete actions
- Admin monitoring dashboard with real database statistics and recent activity

## Gotchas

- The managed workflows provide `PORT` and `BASE_PATH`; do not start the app with a root-level `pnpm dev`.
- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Run `pnpm --filter @workspace/db run push` after changing database schema files.