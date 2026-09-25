# MCP WebClient

MCP WebClient is a browser chat interface for Ollama models that can call tools on Model Context Protocol (MCP) servers, in the spirit of Open WebUI but written in TypeScript with the official MCP SDK. You add one or more MCP servers by URL (and an optional API key) in a settings dialog; the browser connects to each over the Streamable HTTP transport, lists their tools, and passes them to the model as Ollama function definitions. When the model asks for a tool, the client runs it, feeds the result back, and repeats for up to five rounds before showing the final answer, along with the model's "thinking" text and the tool calls it made. Tools that need more input from the user can use MCP elicitation, which renders a form in the chat. The app is built with Next.js 15, React 18 and Tailwind CSS, and the repository includes a small Python FastMCP demo server to test against. It is an early prototype from a single commit (November 2025): chat history is not saved, and the database and authentication pieces are only scaffolded.

> Status: early prototype. Not actively developed since the initial commit.

## Features

- Chat with an Ollama model through a Next.js API route (`POST /api/chat`), which calls Ollama without streaming and with thinking mode enabled
- Model picker with a fixed list: `gpt-oss:20b-cloud` (default), `llama3.2`, `llama3.1`, `phi3`, `gemma:2b`, `tinyllama`
- MCP server manager (add, test, enable, remove) stored in the browser's `localStorage`; the API key is sent as an `Authorization: Bearer` header
- Browser-side MCP client built on `@modelcontextprotocol/sdk` with the Streamable HTTP transport and protocol version `2025-06-18`
- Agent loop with up to 5 tool-calling iterations per message and a system prompt that lists the available tools
- MCP elicitation: a server's `elicitation/create` request becomes an in-chat form, and the answer is returned to the tool
- Sampling requests from servers are accepted but always declined
- Markdown rendering with GitHub-flavoured Markdown and syntax-highlighted code blocks; collapsible thinking and tool-call sections per message
- Demo MCP server (`mcp-server/`) with `echo`, `add`, `get_current_time` and `create_greeting` (elicitation) tools, plus sample resources and prompts

## Tech stack

Next.js 15 · React 18 · TypeScript · Tailwind CSS · MCP TypeScript SDK · Ollama JS client · Prisma + PostgreSQL (schema only) · Python FastMCP (demo server)

## Getting started

Prerequisites: Node.js and npm, a running Ollama instance with at least one of the models above pulled, and optionally Python 3 for the demo MCP server.

```bash
npm install
cp .env.example .env.local   # then edit the values
npm run dev                  # Next.js dev server (Turbopack) on http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm start            # serve the production build
npm run lint         # next lint
npm run type-check   # tsc --noEmit
```

Environment variables read by `lib/config.ts` (see `.env.example` for descriptions): `OLLAMA_API_URL` (default `http://localhost:11434`), `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_MCP_CLIENT_SIDE`, `NEXT_PUBLIC_MCP_SERVER_URL`, `MCP_SERVER_URL`, `MCP_API_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEBUG`, `NEXT_PUBLIC_EXPERIMENTAL_FEATURES`. In the current code only `OLLAMA_API_URL` affects the running app; MCP servers are configured in the UI.

### Demo MCP server

```bash
cd mcp-server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python server.py      # listens on http://0.0.0.0:8000 (MCP_SERVER_HOST / MCP_SERVER_PORT)
```

Then open the MCP settings in the chat input, add a server with the URL `http://localhost:8000/mcp`, and test the connection. See [`mcp-server/README.md`](mcp-server/README.md) for details and `test_server.py` for a test client.

### Database (optional, not yet used)

`prisma/schema.prisma` defines `User`, `Conversation`, `UserConversation` and `Message` tables for PostgreSQL, and `lib/db.ts` creates a Prisma client, but no route reads or writes them yet. To create the tables:

```bash
npx prisma migrate dev
npx prisma generate
```

## Project structure

```text
app/
  api/chat/route.ts        POST endpoint that forwards messages and tools to Ollama
  page.tsx                 chat page: greeting, message list, input, MCP settings modal
components/
  chat/                    message list, message item, input, elicitation form
  mcp-settings-modal.tsx   add/test/remove MCP servers, list their tools
  model-selector.tsx       Ollama model dropdown
  markdown-renderer.tsx    Markdown + code highlighting
hooks/
  use-chat.ts              message state, system prompt, tool-calling loop, elicitation
  use-mcp.ts               server list in localStorage, tool discovery and execution
lib/
  mcp/sdk-client.ts        MCP SDK client: connections, tools, resources, prompts, elicitation
  mcp/tool-formatter.ts    converts MCP tools to Ollama function definitions
  ollama/client.ts         Ollama client wrapper
  config.ts                environment variable access
  db.ts                    Prisma client singleton
prisma/schema.prisma       PostgreSQL schema (not yet used)
mcp-server/                Python FastMCP demo server
```

## Limitations

- Chat history lives in React state only and is lost on reload; nothing is written to the database.
- There is no authentication. NextAuth and bcrypt are installed but not wired up.
- Responses are not streamed token by token; the API route waits for the full Ollama reply (a `streamChat` helper exists but is unused).
- MCP connections are made from the browser, so each MCP server must allow CORS from the app's origin. The server-side MCP mode described in `.env.example` is not implemented.
- The model list is hard-coded rather than read from Ollama.
- MCP resources and prompts can be listed by the client library but are not exposed in the UI.
- There is no PWA manifest or service worker, and no tests for the web app.

## Further documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`SETUP.md`](SETUP.md) describe the intended design, including parts that are not built yet (persistence, auth, PWA, streaming, server-side MCP).
- [`CLAUDE.md`](CLAUDE.md) is a project reference for AI coding agents.

## Troubleshooting

```bash
# Check that Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if it is not running
ollama serve
```

For MCP connection errors, check that the server is running and that its CORS settings expose the `mcp-session-id` header (the demo server does this).

## Links

- MCP specification: https://modelcontextprotocol.io/specification
- Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
