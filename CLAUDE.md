# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Development server with Turbopack (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Vitest (all tests)
npm run db:reset       # Reset database (destructive)
```

Run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

**Environment:** Add `ANTHROPIC_API_KEY` to `.env` to use real Claude; without it, a mock provider returns static demo components.

## Architecture

UIGen is a three-panel UI (chat | preview | code editor) where Claude generates React components into a **virtual file system** (in-memory, never written to disk).

### Data Flow

1. User sends a message → `ChatContext` → `POST /api/chat` with serialized virtual FS
2. Claude (via Vercel AI SDK) streams a response and calls tools (`str_replace_editor`, `file_manager`)
3. Tool calls are processed in `FileSystemContext`, which updates the in-memory `VirtualFileSystem`
4. `PreviewFrame` picks up file changes, runs JSX through Babel + import maps, renders in a sandboxed iframe

### Key Modules

- **`src/lib/file-system.ts`** — `VirtualFileSystem` class: full CRUD for the in-memory file tree, serialization/deserialization for DB storage and API transmission
- **`src/lib/provider.ts`** — Dual provider: real `anthropic("claude-haiku-4-5")` or `MockLanguageModel`; chosen at runtime based on `ANTHROPIC_API_KEY`
- **`src/lib/transform/jsx-transformer.ts`** — Babel-based pipeline: transforms JSX → JS, builds import maps from CDN (esm.sh), wraps in HTML for iframe execution
- **`src/lib/tools/`** — Tool schemas passed to Claude: `str_replace_editor` (view/create/str_replace/insert) and `file_manager` (rename/delete)
- **`src/lib/contexts/file-system-context.tsx`** — Processes tool call results from Claude and applies them to the virtual FS; handles `App.jsx` auto-selection
- **`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK's `useChat`; sends serialized FS state with each message
- **`src/app/api/chat/route.ts`** — Streaming endpoint; 120s max duration, up to 40 tool-use steps; supports project persistence
- **`src/lib/auth.ts`** — JWT sessions via `jose`, stored in HTTP-only cookies, 7-day expiry
- **`src/actions/index.ts`** — Server actions for auth (signUp/signIn/signOut); passwords hashed with bcrypt (8+ char minimum)

### Database

The database schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the database structure.

Prisma with SQLite (dev). After schema changes: `npx prisma migrate dev --name <migration-name>` then `npx prisma generate`.

### Component Preview

`PreviewFrame` detects the entry point (`App.jsx` takes priority), transforms it via `jsx-transformer.ts`, and renders in a sandboxed iframe using blob URLs + ES module import maps pointing to esm.sh for npm packages.

### Path Aliases

TypeScript paths configured in `tsconfig.json`: `@/*` maps to `./src/*`.

## Code Style

Use comments sparingly. Only comment complex code.

