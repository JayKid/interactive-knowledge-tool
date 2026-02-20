# Knowledge Tool - Architecture & Design Decisions

This document captures all decisions made during the design of the Knowledge Tool so the project can be continued without needing the original conversation.

## What This Project Is

A local web app for **conversational learning** that builds a **persistent knowledge graph**. You chat with a local LLM about a topic, it suggests related concepts to explore, and you selectively add them as nodes in a visual graph. Over time, you build an interconnected map of knowledge you can revisit, search, and expand.

## Core Interaction Model

- **Conversation-first**: The first time you use it, there's no graph — you start by chatting about a topic. On subsequent visits, you see your graph and can continue from any node or start a new graph.
- **User-driven graph growth**: The LLM suggests related topics as clickable "chips" after each response. The user chooses which to add as new nodes. The graph stays intentional and clean — no auto-generated noise.
- **Dual storage per node**: Each node stores both the full conversation history AND an LLM-generated summary. The summary is shown by default; the full conversation is available for context.

## Tech Stack Decisions

| Area | Choice | Why |
|------|--------|-----|
| Frontend framework | React 19 + TypeScript | Mature ecosystem, best library support for graph visualization |
| Build tool | Vite | Fast dev server, good TypeScript/React support |
| Graph visualization | react-force-graph-2d | Canvas-based (performant), active maintenance, clean React API, supports force-directed layout |
| Graph layout | Force-directed (D3 force) | Best for showing clusters and connections in a knowledge graph. Nodes auto-arrange based on relationships. |
| State management | Zustand (UI state) + TanStack React Query (server state) | Clean separation. Zustand is minimal; React Query handles caching/refetching. |
| Routing | React Router v7 | Only 2 routes needed (`/` and `/graph/:graphId`), standard choice |
| Backend | Node.js + Fastify | Same language as frontend. Fastify chosen over Express for built-in TS support, validation, and plugin system. |
| Database | SQLite via better-sqlite3 | File-based, zero config, great for local apps. Synchronous API (better-sqlite3) is simpler than async alternatives. |
| LLM integration | OpenAI SDK pointed at configurable endpoint | LM Studio (default) exposes OpenAI-compatible API. Same SDK works for any OpenAI-compatible provider (Ollama, cloud APIs). |
| Monorepo | npm workspaces + concurrently | Minimal overhead for a 2-package repo. No Turborepo needed. |
| Streaming | Server-Sent Events (SSE) | Simpler than WebSocket for unidirectional LLM streaming. Native browser EventSource support. |

## LLM Integration Decisions

### Structured Output Strategy

The LLM needs to both converse naturally AND produce structured topic suggestions. Decision: **instruct the LLM to append a ```json block** at the end of each response with suggested topics.

Why not `response_format: { type: "json_schema" }`? Many local models have inconsistent support for strict structured output. The markdown JSON block approach works reliably with essentially all instruction-following models (Llama, Mistral, Qwen, Phi, etc.).

The server parses the JSON block after the stream completes using a regex + Zod validation. If parsing fails, it degrades gracefully (no chips shown, conversation still works).

### Topic Suggestions Format

Each suggestion includes:
- `title`: The topic name (specific enough to be a standalone node)
- `relationship`: How it relates to the current topic
- `reason`: Why it would be interesting to explore

The system prompt includes the list of existing node titles to avoid duplicate suggestions.

### Summary Generation

A separate LLM call with a summarization prompt, triggered after a conversation reaches 4+ messages or on explicit user request. Produces 2-4 paragraphs in encyclopedic style (no references to "the conversation").

### Embedding Model

LM Studio can serve embedding models alongside chat models. The config allows specifying a separate model name for embeddings (e.g., `nomic-embed-text-v1.5`). Embeddings are generated via the standard `/v1/embeddings` endpoint.

### Provider Configuration

Default: LM Studio at `http://localhost:1234/v1`. Configurable via `.env` to point at any OpenAI-compatible endpoint — Ollama, OpenAI, Anthropic (via proxy), etc. The app fails gracefully if the LLM is unreachable.

## Search Decision

**Semantic search from day one** using embeddings stored as BLOBs in SQLite.

Why not sqlite-vec? For a local tool with tens to low thousands of nodes, brute-force cosine similarity in JavaScript is fast enough (sub-100ms for 1000 384-dim vectors). This avoids native extension complexity and platform compatibility issues. The schema is designed so upgrading to sqlite-vec later is straightforward.

Embedding pipeline: When a node's summary is created/updated, hash the text (SHA-256), skip if unchanged, otherwise generate embedding and store as Float32Array BLOB.

## Database Schema Decisions

- **UUIDs for IDs** (not auto-increment): Simpler for a local tool, no collision concerns, generated server-side with `crypto.randomUUID()`.
- **Separate embeddings table**: One row per node per content type. Allows re-embedding only changed content via text hash comparison.
- **Messages metadata as JSON column**: Stores suggested topics alongside the message that generated them. Flexible without schema changes.
- **Node depth field**: Distance from root node. Used for visual encoding (color gradient) in the graph.
- **Persisted x/y positions on nodes**: Optional. When force layout stabilizes, positions can be saved so the graph looks the same on reload.
- **CASCADE deletes**: Deleting a graph cascades to all its nodes, edges, messages, and embeddings.

## UI/UX Decisions

- **Layout**: Split panel — graph canvas (~70% left) + context sidebar (~30% right)
- **Sidebar modes**: chat, node-detail, search (switches based on user action)
- **Graph visual encoding**: Nodes colored by depth (darker = deeper exploration), sized by connection count. Selected node gets a highlight ring.
- **Dark theme**: Default (fits the exploratory/learning aesthetic)
- **Landing page**: Grid of graph cards showing title, node count, last updated. "New Knowledge Graph" button.
- **New graph flow**: Dialog asks for topic → creates graph + root node → redirects to workspace → auto-opens chat
- **Topic chip flow**: Click chip → creates node + edge on server → graph re-renders → sidebar switches to chat for new node → auto-sends "Tell me about [topic]"

## What We Explicitly Chose NOT To Do

- **No auto-generated graph nodes**: The LLM suggests, but the user decides. Keeps the graph intentional.
- **No complex migration system**: SQLite schema is defined declaratively. For a local tool, we can recreate the DB if the schema changes during development.
- **No authentication/multi-user**: This is a personal local tool.
- **No cloud deployment**: Runs on localhost only.
- **No Turborepo/Nx**: Overkill for 2 packages.
- **No WebSocket**: SSE is sufficient for unidirectional LLM streaming.
- **No sqlite-vec for MVP**: App-level cosine similarity is adequate at local scale.

## Configuration

Via `.env` file at project root:

```
LLM_BASE_URL=http://localhost:1234/v1
LLM_API_KEY=lm-studio
LLM_CHAT_MODEL=local-model
LLM_EMBEDDING_MODEL=text-embedding-nomic-embed-text-v1.5
EMBEDDING_DIMENSIONS=768
DB_PATH=./data/knowledge.db
PORT=3001
```
