# Repository Guidelines

## Project Structure & Module Organization

IdeaJar is a TypeScript MCP server exposing `idea_add`, `idea_list`, and `idea_update` over stdio.

- `src/index.ts`: tool registration, transport, and storage-path configuration.
- `src/store.ts`: Zod validation and JSON persistence.
- `test/mcp.test.mjs`: integration tests using a real MCP client and server process.
- `dist/`: generated JavaScript; `data/`: default runtime storage. Both are ignored.

## Build, Test, and Development Commands

Use Node.js 22 or newer and npm.

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run check`: type-check without emitting files.
- `npm run build`: compile TypeScript into `dist/`.
- `npm start`: launch the compiled server, which waits for MCP messages on stdin. Build first.
- `npm test`: build, then run Node's built-in test runner.

## Coding Style & Naming Conventions

Follow existing two-space indentation, double-quoted strings, and semicolons. Use strict TypeScript and ES modules; local imports use `.js` extensions for NodeNext resolution. Use camelCase for functions and variables, PascalCase for classes and types, and `idea_*` names for MCP tools. No formatter or linter is configured.

## Testing Guidelines

Use `node:test` and `node:assert/strict`; name tests `test/*.test.mjs`. Isolate storage with temporary directories and `IDEAJAR_FILE`, and close clients and remove fixtures afterward. Cover persistence across restarts, exact text preservation, validation failures, corrupted files, and concurrent requests when relevant. No numeric coverage threshold is configured. Add regression tests for behavior changes and run `npm test` before review.

## Commit & Pull Request Guidelines

Current feature history uses concise typed subjects, such as `feat: add minimal file-backed IdeaJar MCP server`. Follow that pattern with focused `feat:`, `fix:`, or `docs:` commits. Use GitButler (`but`) for version control and a dedicated branch; preserve unrelated work.

PR descriptions should explain what changed and why, link relevant issues, and report type-check and test results. Update `README.md` when commands, tools, or storage behavior change. Agents must only push or open PRs when requested.

## Configuration & Protocol Safety

Reserve stdout for MCP traffic; send diagnostics to stderr. Prefer an absolute `IDEAJAR_FILE`; relative paths resolve from the server's working directory. Use one server process per storage file. Preserve atomic writes and reject malformed existing data without overwriting it.

## Agent Workflow

Discover globally managed skills exclusively through SkillGesture and load only relevant instructions and referenced resources. If unavailable, report the connection problem and continue unaffected work.
