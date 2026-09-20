# Plan — Auctum Ledger Full-Stack Launch (AUCTUM_LEDGER_LOTSPACE)

## Mission
Continue engineering on `marcusdax/AUCTUM_LEDGER_LOTSPACE`: build and launch the Auctum Ledger
full stack (coffee green-bean CRM/marketing + education module) with new features and new UI,
fully Dockerized, driven by a multi-agent expert team (front-end, back-end, DevOps/containerization,
design/art, business logic, product design). Deliverables: all files pushed to the GitHub repo + a zip archive.

## Source Context (already gathered)
- Repo currently holds only CI/CD scaffolding (greensheet-ci-*.yml, guides) + task briefs/reports.
- Uploaded zip (GREENALMOSATDONE) contains: rebranding rulings (greensheet → Auctum Ledger, AL-* error codes,
  al.* topics, api.auctumledger.io), docker-migration task briefs/reports (PostgreSQL+TimescaleDB, Redis, Kafka,
  outbox), credential state-machine task (active/expiring/stale/lapsed), expansion pack (domain model, OpenAPI
  contract, design tokens "Lot Compass" brand, growth playbooks, i18n en/zh/es/pt), .env contract, package-lock.
- Uploaded txt: "AI Agent Skill Profile" Format B exemplar (ODASI front-end design engineer) — style reference
  for personas per user skill `multi-agent-experts`.

## Stage 1 — Context Extraction (explore subagent)
Mine /tmp/green/GREENALMOSATDONE/.tmp.driveupload for the design tokens, domain model, OpenAPI contract,
docker task specs (tasks 1–7), and env contract. Output: concise BUILD-BRIEF.md (canonical conventions,
stack, ports, env vars, brand tokens, core entities/endpoints).

## Stage 2 — Expert Team Personas (general subagent, user skill: multi-agent-experts)
Create 6 personas in Format A/B per skill: Front-End Design Engineer, Back-End Platform Engineer,
DevOps & Containerization Engineer, Visual Artist & Brand Designer, Business Logic & Growth Strategist,
Product Designer. Read skill reference files (structure_contract.md, style_contract.md, example_personas.md).
Output: docs/expert-team.md + docs/expert-team.docx (via docx skill at integration stage).
Personas double as role framing for build agents.

## Stage 3 — Architecture Contract (Orchestrator)
Write CONTRACT.md in shared workspace /mnt/agents/output/AUCTUM_LEDGER_LOTSPACE/ defining:
folder layout (app/ with client+server+shared+migrations), API routes, env vars, ports (80 app),
AL-* error model, DB schema (credential state machine + core domain), docker-compose services.
Gate: backend/frontend/devops agents all build against this contract.

## Stage 4 — Parallel Build (3 coder subagents, background)
- Backend agent: Express+TS API (lots, roasters, orders, credentials + state machine, events/outbox),
  SQL migrations, seed data, vitest unit tests for state transitions.
- Frontend agent: React+Vite+TS+Tailwind new UI (brand tokens, pages: Dashboard, Lots, Roasters,
  Orders, Education/Credentials, Campaigns), i18n scaffolding, mock-free API client with fallback.
- DevOps agent: multi-stage Dockerfile(s), docker-compose.yml (app, postgres/timescale, redis, kafka
  optional profile, ai-proxy), .github/workflows from existing greensheet-ci-*.yml (rebranded AL),
  .env.example, nginx conf.
Each writes only its assigned paths per CONTRACT.md.

## Stage 5 — Integration & Verification (verifier subagent)
npm install + build frontend, tsc/vitest for backend state machine, `docker compose config` validation,
fix-forward until green. README + docs assembly. Generate expert-team.docx.

## Stage 6 — Delivery (Orchestrator)
Push all files to GitHub repo via push_files (batched), zip workspace to
/mnt/agents/output/AUCTUM_LEDGER_LOTSPACE.zip, report with REF tags.

## Skills loaded per stage
- Stage 2: /app/.user/skills/multi-agent-experts (user skill — exclusive) + docx (integration)
- Stages 4–5: vibecoding-general-swarm conventions (Orchestrator-designed; offline sandbox → local build, no Kimi deploy)
- Stage 6: GitHub MCP (push_files)
