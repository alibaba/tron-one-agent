# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

## Project Overview

Tron OneAgent — enterprise AI agent platform. Java 17 backend + React frontend monorepo.

## Backend (`backend_java/`)

Multi-module Spring Boot 3.5 app. Three-layer architecture: `api` → `core` → `infra`. Dependencies flow downward only.

- **api/** — REST controllers, WebSocket endpoints, DTOs
- **core/** — Business logic, domain models, agent handlers, services
- **infra/** — MySQL persistence (MyBatis-Plus), OSS storage
- **bootstrap/** — App entry, configuration, test infrastructure

### Build & Test

```bash
cd backend_java
mvn clean package -DskipTests          # Build jar
mvn clean test -pl bootstrap           # Tests (embedded MariaDB4j, no external DB)
mvn compile -q                         # Fast compile check
mvn checkstyle:check -q               # Lint (relaxed Google Java Style)
```

Tests extend `BaseFuncTest` (embedded MariaDB4j, schema from `bootstrap/src/test/resources/schema/init.sql`).

### Backend Conventions

- Lombok (`@Data`, `@Builder`, `@Slf4j`, `@RequiredArgsConstructor`) + MapStruct
- Enum serialization: `@JsonValue` (not `WRITE_ENUMS_USING_TO_STRING`)
- Key deps: AgentScope 1.0.11, MyBatis-Plus 3.5.15, OpenTelemetry 1.60.1

### Backend Env Vars (not needed for tests)

- `DASHSCOPE_API_KEY` — required for agent functionality
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — MySQL
- `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET` — OSS (optional)

## Frontend (`frontend/`)

Yarn workspaces monorepo with two packages:

- `packages/control` — Admin console (React 18 + Webpack 5 + Ant Design 5 + Less)
- `packages/chatbox` — Chat UI library (imported directly as TS sources, no build step)

### Commands

```bash
cd frontend
yarn dev                        # Dev server (port 4000, proxies /api and /chatApi to :8080)
yarn build                      # Production build
yarn workspace control lint     # ESLint
```

### Frontend Conventions

- Path alias: `@/` → `packages/control/src/` — always use it
- Styling: Less with CSS Modules (`*.module.less`); no Tailwind
- SSE streaming via `/chatApi` proxy (buffering off, 3600s timeout)
- Chatbox `eventSource/` supports WebSocket, SSE, and Polling
- Routing: HashRouter (`#/agents`, `#/mcp`, etc.)
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`

### UI Design

All frontend UI must follow `frontend/DESIGN.md` — the single source of truth for colors, typography, spacing, components, and layout patterns. Key rules:
- Primary interactive color: Cloud Blue `#1677ff` only — no second accent
- Feature card colors signal domain: purple=AI, blue=compute, teal=data, dark=premium
- Body text 14px; headlines use PingFang SC / Microsoft YaHei at weight 600 with zero letter-spacing
- CSS Modules + Less variables should reference DESIGN.md tokens; never inline hex values

## Shared Conventions

- All code, comments, commit messages in English
- Branch naming: `feat/xxx`, `fix/xxx`, `chore/xxx`

### License Header

Every newly created source file (`.java`, `.ts`, `.tsx`, `.js`, `.jsx`, `.less`, `.css`) **must** begin with the Apache 2.0 license header wrapped in a `/* ... */` block comment. The canonical header text is in `LICENSE.txt` at the repository root. A PostToolUse hook validates its presence on every Write operation.
