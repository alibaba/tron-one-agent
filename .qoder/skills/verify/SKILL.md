---
name: verify
description: Run compile checks and test suites for both backend and frontend to verify changes.
---

Run verification for the affected part of the codebase. Determine which part changed based on the file paths modified in this session.

## Backend (`backend_java/`)

1. **Compile check** — Run `cd backend_java && mvn compile -q` for fast feedback.
2. **Run tests** — Run `cd backend_java && mvn clean test -pl bootstrap` to execute all integration tests against embedded MariaDB4j.
3. **Report results** — Summarize pass/fail counts. If any test fails, read the output, identify the root cause, and suggest a fix.

Notes:
- Tests use embedded MariaDB4j so no external database is needed.
- Some tests use Dokimos LLM-based evaluation and require `DASHSCOPE_API_KEY` to be set.
- Test schema is at `bootstrap/src/test/resources/schema/init.sql`.

## Frontend (`frontend/`)

1. **Type check** — Run `cd frontend && yarn workspace control tsc --noEmit` for fast TypeScript type validation.
2. **Lint** — Run `cd frontend && yarn workspace control lint` to run ESLint (requires `.eslintrc.cjs` at `packages/control/.eslintrc.cjs`).
3. **Report results** — Summarize any errors or warnings found. If lint errors appear, include the rule name and file location.

If both parts were modified, run both. Report a summary of all results.
