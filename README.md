# Interactive Knowledge Tool

A local web app for **conversational learning** that builds a **persistent knowledge graph**. Chat with a local LLM about any topic, explore suggested connections, and grow a visual map of interconnected knowledge over time.

## How It Works

1. **Start a conversation** — pick a topic and chat with your LLM about it
2. **Explore suggestions** — the LLM suggests related topics as clickable chips after each response
3. **Build your graph** — selectively add suggestions as new nodes connected to the current topic
4. **Revisit and expand** — browse your knowledge graph, click any node to continue the conversation, search across everything

The graph stays intentional — the LLM suggests, but you decide what gets added.

## Features

- **Visual knowledge graph** with force-directed layout (drag, zoom, pan)
- **Conversational exploration** — each node has its own chat history and LLM-generated summary
- **Semantic search** across all nodes using embeddings
- **Web resource integration** — paste URLs to summarize and attach to nodes
- **Message extraction** — turn interesting chat messages into new nodes
- **JSON import/export** — back up or share your graphs
- **Command palette** (Cmd+K) for quick navigation
- **Mobile-responsive** layout
- **Works with any OpenAI-compatible LLM** — LM Studio, Ollama, OpenAI, etc.

## Prerequisites

- **Node.js** 18+
- **An OpenAI-compatible LLM provider** running locally or remotely. Recommended:
  - [LM Studio](https://lmstudio.ai/) (default) — download a model and start the local server
  - [Ollama](https://ollama.ai/) — set `LLM_BASE_URL=http://localhost:11434/v1`
  - OpenAI API — set `LLM_BASE_URL=https://api.openai.com/v1` and your API key
- An **embedding model** served by the same provider (e.g., `nomic-embed-text` in LM Studio)

## Quick Start (Development)

```bash
# Clone the repo
git clone https://github.com/JayKid/interactive-knowledge-tool.git
cd interactive-knowledge-tool

# Install dependencies
npm install

# Configure your LLM provider
cp .env.example .env
# Edit .env with your settings (see Configuration below)

# Start the dev servers
npm run dev
```

The app will be available at **http://localhost:5173**. The API server runs on port 3001.

## Deployment with Docker (Recommended for Homelabs)

The easiest way to run this in a homelab or production-like environment is using Docker Compose.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the app
1. Ensure you have a `.env` file in the root directory with your `LLM_BASE_URL` pointing to your LLM provider (e.g., `http://<host-ip>:1234/v1`).
2. Run the following command:

```bash
docker-compose up --build
```

The application will be available at:
- **Frontend**: [http://localhost:3456](http://localhost:3456)
- **API Server**: [http://localhost:3001](http://localhost:3001)

### Configuration Notes for Docker
When running in Docker, ensure that `LLM_BASE_URL` uses a network-reachable IP address (like your host's local LAN IP) rather than `localhost`, as `localhost` inside the container refers to the container itself.


## Configuration

All configuration is via the `.env` file in the project root:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_BASE_URL` | `http://localhost:1234/v1` | OpenAI-compatible API endpoint |
| `LLM_API_KEY` | `lm-studio` | API key for the LLM provider |
| `LLM_CHAT_MODEL` | `local-model` | Model name for chat (use the name shown in your provider) |
| `LLM_EMBEDDING_MODEL` | `text-embedding-nomic-embed-text-v1.5` | Model name for embeddings |
| `EMBEDDING_DIMENSIONS` | `768` | Embedding vector dimensions (must match your model) |
| `DB_PATH` | `./data/knowledge.db` | Path to the SQLite database file |
| `PORT` | `3001` | Backend server port |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Graph visualization | react-force-graph-2d (Canvas + D3 force) |
| State management | Zustand (UI) + TanStack React Query (server) |
| Backend | Node.js, Fastify |
| Database | SQLite (better-sqlite3) |
| LLM integration | OpenAI SDK (works with any compatible provider) |
| Streaming | Server-Sent Events (SSE) |
| Monorepo | npm workspaces |

## Project Structure

```
├── client/          # React frontend
├── server/          # Fastify backend
├── shared/          # Shared TypeScript types
├── data/            # SQLite database (gitignored)
├── .env.example     # Configuration template
└── DECISIONS.md     # Architecture & design decisions
```

See [DECISIONS.md](DECISIONS.md) for detailed architecture and design rationale.

## License

[MIT](LICENSE)
