# CLAUDE.md - MCP WebClient Project Reference

> **Master Reference Document for Claude Code**
> This document contains the complete project vision, architecture, and implementation plan for the MCP WebClient project - an Open WebUI alternative with full MCP protocol support.

---

## Table of Contents

1. [Project Vision](#project-vision)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Request Flow](#request-flow)
5. [MCP Protocol Deep Dive](#mcp-protocol-deep-dive)
6. [Hybrid MCP Approach](#hybrid-mcp-approach)
7. [PWA Implementation](#pwa-implementation)
8. [Database Design](#database-design)
9. [Implementation Phases](#implementation-phases)
10. [Key Decisions](#key-decisions)
11. [Security Considerations](#security-considerations)

---

## Project Vision

**Goal:** Build a production-ready web application similar to Open WebUI with complete MCP (Model Context Protocol) support, enabling users to chat with Ollama models while leveraging standardized tools, resources, and prompts through MCP servers.

**Key Features:**
- ✅ Real-time streaming chat interface with Ollama
- ✅ Full MCP protocol support (tools, resources, prompts, sampling)
- ✅ Progressive Web App (PWA) with offline capabilities
- ✅ Hybrid MCP execution (client-side dev, server-side prod)
- ✅ Multi-model support (switch between Ollama models)
- ✅ Persistent chat history with PostgreSQL
- ✅ Secure authentication with NextAuth.js
- ✅ Application-level authorization

**Differentiators from Open WebUI:**
- TypeScript throughout (vs Python backend)
- Native MCP protocol support (not just OpenAI tool calling)
- PWA with offline-first approach
- Modern Next.js architecture with streaming

---

## Tech Stack

### Frontend
```
Framework:     Next.js 15 (App Router)
Language:      TypeScript
Styling:       Tailwind CSS
UI Components: shadcn/ui (Radix UI + Tailwind)
State:         React Context + TanStack Query
PWA:           @ducanh2912/next-pwa
```

**Rationale:**
- Next.js 15 App Router: Native SSE streaming support, unified codebase
- TypeScript: Type safety throughout the stack
- Tailwind: Rapid UI development, excellent with shadcn/ui
- @ducanh2912/next-pwa: Most mature PWA solution (44k+ weekly downloads)

### Backend
```
Framework:     Next.js API Routes
LLM:           Ollama (ollama npm package)
MCP:           @modelcontextprotocol/sdk
Streaming:     Server-Sent Events (SSE)
```

**Rationale:**
- API Routes: Collocated with frontend, easier deployment
- Ollama: Local LLM with official TypeScript SDK
- MCP SDK: Official Anthropic implementation
- SSE: Perfect for one-way streaming (simpler than WebSockets)

### Database
```
Database:      PostgreSQL
ORM:           Prisma
Auth:          NextAuth.js
```

**Rationale:**
- PostgreSQL: Robust relational database, JSONB support
- Prisma: Best TypeScript DX, mature ecosystem
- NextAuth.js: Flexible authentication, supports multiple providers

### Deployment
```
Hosting:       Vercel
Database:      PostgreSQL (Railway, Render, Neon, or local)
MCP Servers:   Self-hosted or third-party
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React UI (PWA)                                     │   │
│  │  - Chat Interface                                   │   │
│  │  - Model Selector                                   │   │
│  │  - Tool Discovery UI                                │   │
│  │  - Offline Storage (IndexedDB)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓ SSE / Fetch                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│               Next.js Server (Vercel)                       │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  API Routes      │  │  Server Actions  │               │
│  │  - /api/chat     │  │  - Mutations     │               │
│  │  - /api/mcp      │  │  - Auth          │               │
│  │  - /api/messages │  └──────────────────┘               │
│  └──────────────────┘                                      │
│           ↓                    ↓                            │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  MCP Client      │  │  Ollama Client   │               │
│  │  (SDK)           │  │  (ollama pkg)    │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
           ↓                        ↓
    ┌──────────────┐        ┌──────────────┐
    │  MCP Servers │        │    Ollama    │
    │  (stdio/HTTP)│        │  localhost:  │
    │  - Tools     │        │     11434    │
    │  - Resources │        └──────────────┘
    │  - Prompts   │
    └──────────────┘
           ↓
    ┌──────────────┐
    │  PostgreSQL  │
    │   Database   │
    │   (Prisma)   │
    └──────────────┘
```

---

## Request Flow

### 1. Simple Chat Request (No Tools)

```
User types message
     ↓
Browser sends POST to /api/chat
     ↓
Next.js API receives request
     ↓
Ollama client streams response via SSE
     ↓
Browser receives SSE events
     ↓
React displays tokens progressively
     ↓
Save complete message to PostgreSQL (via Prisma)
```

### 2. Chat with MCP Tool Execution

```
User types: "Read my latest report"
     ↓
Browser sends POST to /api/chat
     ↓
Next.js API processes:
  1. Query MCP servers for available tools
  2. Augment system prompt with tool schemas
  3. Send to Ollama with tool context
     ↓
Ollama analyzes and decides to use tool:
  {
    "tool_call": {
      "name": "read_file",
      "arguments": {"path": "/workspace/report.txt"}
    }
  }
     ↓
Next.js intercepts tool call:
  1. Send tools/call to MCP server
  2. MCP server executes (reads file)
  3. Returns file contents
     ↓
Next.js feeds tool result back to Ollama:
  "Tool result: [file contents]"
     ↓
Ollama generates final response:
  "Based on your report, here's a summary..."
     ↓
Stream response to browser via SSE
     ↓
Save conversation to database
```

### 3. MCP Resource Access

```
User wants to see available resources
     ↓
Browser calls /api/mcp with resources/list
     ↓
Next.js MCP client queries all connected servers
     ↓
Servers respond with resource URIs:
  [
    "file:///workspace/config.json",
    "db://users/123",
    "log://application/2025-01-15"
  ]
     ↓
Browser displays resources in UI
     ↓
User clicks a resource
     ↓
Browser calls /api/mcp with resources/read
     ↓
MCP server returns resource content
     ↓
Display in UI
```

---

## MCP Protocol Deep Dive

### What is MCP?

**Model Context Protocol (MCP)** is a standardized protocol for connecting AI applications with external tools and data sources. Inspired by LSP (Language Server Protocol), it provides:

- **Standardization**: Write tools once, use across any MCP client
- **Separation of Concerns**: LLM logic separate from tool implementations
- **Security**: Clear boundaries and permission models
- **Discoverability**: Tools expose schemas for automatic discovery

### Protocol Version

Current: **2025-03-26** (Streamable HTTP support)

### Transport Mechanisms

| Transport | Use Case | Our Usage |
|-----------|----------|-----------|
| **stdio** | Local subprocesses | Server-side MCP servers |
| **Streamable HTTP** | Remote services | Client-side dev, production |
| **SSE (legacy)** | Deprecated | Migration to Streamable HTTP |

### Core Concepts

#### 1. Tools

**Purpose:** Execute actions (API calls, file operations, calculations)

**Discovery:**
```json
// Request
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read contents of a file",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {"type": "string"}
          },
          "required": ["path"]
        }
      }
    ]
  }
}
```

**Execution:**
```json
// Request
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "id": 2,
  "params": {
    "name": "read_file",
    "arguments": {"path": "/file.txt"}
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {"type": "text", "text": "File contents here"}
    ],
    "isError": false
  }
}
```

#### 2. Resources

**Purpose:** Provide read-only data/context (files, logs, database records)

**Key Difference from Tools:**
- Tools: Model-controlled (LLM decides when to call)
- Resources: App-controlled (user/app decides what to provide)

**Discovery:**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "id": 3
}
```

**Access:**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "id": 4,
  "params": {
    "uri": "file:///workspace/config.json"
  }
}
```

#### 3. Prompts

**Purpose:** Reusable prompt templates with arguments

**Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "prompts/get",
  "id": 5,
  "params": {
    "name": "code_review",
    "arguments": {
      "language": "python",
      "filepath": "app.py"
    }
  }
}
```

#### 4. Sampling

**Purpose:** MCP server requests LLM completion from client (reverse flow)

**Use Case:** Server needs AI reasoning but doesn't have model access

**Flow:**
```
MCP Server → Client: "sampling/createMessage"
Client → User: Show prompt for approval
User: Approve/Edit/Reject
Client → LLM: Generate completion
LLM → Client: Response
Client → User: Show result for approval
User: Approve/Edit/Reject
Client → MCP Server: Final result
```

**Security:** Human-in-the-loop prevents malicious prompts

#### 5. Progress Notifications

**Purpose:** Real-time updates during long-running operations

```json
// Client sends progressToken
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "id": 6,
  "params": {
    "name": "analyze_large_file",
    "arguments": {"path": "/big.csv"}
  },
  "_meta": {
    "progressToken": "progress-123"
  }
}

// Server sends progress updates
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "progress-123",
    "progress": 50,
    "total": 100,
    "message": "Processing row 500 of 1000..."
  }
}

// Final result
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [{"type": "text", "text": "Analysis complete"}]
  }
}
```

### Session Management

**Headers:**
```http
POST /mcp HTTP/1.1
Content-Type: application/json
Mcp-Session-Id: session-uuid-here
```

**Purpose:**
- Maintain stateful connections over HTTP
- Enable resumability after disconnects
- Associate requests with server-side context

---

## Hybrid MCP Approach

### Development Mode: Client-Side MCP

**Configuration:**
```env
NODE_ENV=development
NEXT_PUBLIC_MCP_CLIENT_SIDE=true
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8000
```

**Flow:**
```
Browser → http://localhost:8000 → MCP Server (direct)
```

**Advantages:**
- ✅ Faster development (no proxy)
- ✅ Easier debugging (browser DevTools)
- ✅ See requests/responses directly

**Disadvantages:**
- ⚠️ CORS required on MCP server
- ⚠️ Credentials exposed in browser
- ⚠️ Limited to HTTP transport (no stdio)

**MCP Server CORS Setup:**
```javascript
// Your MCP server needs:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
  next();
});
```

### Production Mode: Server-Side MCP

**Configuration:**
```env
NODE_ENV=production
NEXT_PUBLIC_MCP_CLIENT_SIDE=false
MCP_SERVER_URL=https://your-mcp-server.com
MCP_API_KEY=secret-key-here
```

**Flow:**
```
Browser → Next.js API Route → MCP Server (proxied)
```

**Advantages:**
- ✅ Credentials stay on server
- ✅ No CORS issues
- ✅ Rate limiting & auth control
- ✅ Can use stdio transport for local servers
- ✅ Secure

**Implementation:**

```typescript
// lib/mcp/client.ts
export async function getMCPClient() {
  const isDev = process.env.NODE_ENV === 'development';
  const useClientSide = process.env.NEXT_PUBLIC_MCP_CLIENT_SIDE === 'true';

  if (isDev && useClientSide && typeof window !== 'undefined') {
    // Browser-side client
    return createBrowserClient();
  } else {
    // Server-side client or proxy
    return createServerClient();
  }
}
```

---

## PWA Implementation

### Why PWA?

- **Installable:** Add to home screen, feels like native app
- **Offline:** Works without internet (cached messages, queue new)
- **Fast:** Service worker caching, instant loads
- **Engaging:** Push notifications, background sync

### Implementation Strategy

#### 1. Manifest Configuration

**public/manifest.json:**
```json
{
  "name": "MCP WebClient",
  "short_name": "MCP Chat",
  "description": "AI-powered chat with MCP protocol support",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 2. Service Worker Strategy

**Caching Strategy:**
- **Static Assets:** Cache-first (HTML, CSS, JS, images)
- **API Calls:** Network-first with cache fallback
- **SSE Streams:** Bypass service worker (can't cache streams)
- **Messages:** Store in IndexedDB, sync when online

**Service Worker Pattern:**
```javascript
// Static assets: Cache-first
workbox.routing.registerRoute(
  /\.(js|css|png|jpg|svg)$/,
  new workbox.strategies.CacheFirst()
);

// API: Network-first
workbox.routing.registerRoute(
  /\/api\//,
  new workbox.strategies.NetworkFirst({
    networkTimeoutSeconds: 10,
  })
);

// SSE streams: Don't intercept
workbox.routing.registerRoute(
  /\/api\/stream/,
  () => null, // Pass through
  'GET'
);
```

#### 3. Offline Storage

**IndexedDB Structure:**
```typescript
interface ChatDB {
  messages: {
    id: string;
    conversationId: string;
    content: string;
    role: 'user' | 'assistant';
    synced: boolean;
    createdAt: number;
  };
  conversations: {
    id: string;
    title: string;
    updatedAt: number;
  };
}
```

**Usage:**
- Read from IndexedDB first (instant display)
- Fetch from API in background (sync)
- Queue writes when offline
- Background sync when online

#### 4. Install Prompt

```typescript
// components/install-prompt.tsx
'use client';

import { useEffect, useState } from 'react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
    <button onClick={handleInstall}>
      Install App
    </button>
  );
}
```

---

## Database Design

### Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  type VARCHAR(50) DEFAULT 'one-on-one',
  model VARCHAR(100), -- Ollama model used
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-Conversation junction
CREATE TABLE user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'assistant', 'system'
  metadata JSONB DEFAULT '{}', -- Tool calls, tokens, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_metadata ON messages USING GIN(metadata);
CREATE INDEX idx_user_conversations_user ON user_conversations(user_id);
```

### Design Decisions

**1. Normalized vs Denormalized:**
- ✅ Normalized: Separate tables for conversations and messages
- ❌ Not: JSONB array of messages in conversations
- **Why:** Better query performance, easier to paginate messages

**2. Soft Deletes:**
- `deleted_at` column instead of hard deletes
- **Why:** Audit trail, recovery, compliance

**3. JSONB Metadata:**
- Store flexible data: MCP tool calls, token counts, model parameters
- **Why:** Don't need predefined columns for every field

**4. Junction Table:**
- `user_conversations` for many-to-many relationship
- **Why:** Support group conversations, shared chats

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Research and documentation (DONE)
- [x] Initialize Next.js project (DONE)
- [x] Set up PostgreSQL database (DONE)
- [x] Initialize Prisma with schema (DONE)
- [x] Configure environment variables (DONE)
- [x] Set up project structure (DONE)

### Phase 2: Database & Auth (Week 1-2)
- [ ] Run Prisma migrations
- [ ] Set up NextAuth.js
- [ ] Create auth API routes
- [ ] Implement login/signup UI
- [ ] Add session management with NextAuth

### Phase 3: Basic Chat (Week 2)
- [ ] Create chat UI components
- [ ] Implement /api/chat route with Ollama
- [ ] Add SSE streaming to browser
- [ ] Display messages in real-time
- [ ] Save messages to database

### Phase 4: MCP Integration (Week 3)
- [ ] Install MCP SDK
- [ ] Create MCP client manager
- [ ] Implement /api/mcp routes
- [ ] Add tool discovery
- [ ] Implement tool execution
- [ ] Integrate tools into chat flow

### Phase 5: Multi-Model & History (Week 3-4)
- [ ] Fetch available Ollama models
- [ ] Add model selector UI
- [ ] Implement conversation list
- [ ] Add conversation CRUD
- [ ] Implement message pagination

### Phase 6: PWA (Week 4)
- [ ] Configure @ducanh2912/next-pwa
- [ ] Create manifest.json
- [ ] Generate PWA icons
- [ ] Implement service worker
- [ ] Add IndexedDB storage
- [ ] Test offline functionality

### Phase 7: Additional Features (Week 5)
- [ ] Add typing indicators (using WebSockets if needed)
- [ ] Implement presence tracking (optional)
- [ ] Add notifications
- [ ] Export/import conversations

### Phase 8: Polish & Deploy (Week 5-6)
- [ ] Add error boundaries
- [ ] Implement loading states
- [ ] Optimize performance
- [ ] Write tests
- [ ] Deploy to Vercel
- [ ] Configure production MCP

---

## Key Decisions

### 1. Database: PostgreSQL vs MongoDB

**Chosen: Plain PostgreSQL**

**Rationale:**
- Structured data (conversations, messages) fit relational model
- JSONB provides flexibility where needed
- Simpler stack without additional dependencies
- Better query performance for chat history
- Prisma ORM has excellent PostgreSQL support
- Can use any PostgreSQL hosting (Railway, Render, Neon, etc.)

### 2. ORM: Prisma vs Drizzle

**Chosen: Prisma**

**Rationale:**
- Better TypeScript DX (type safety, autocomplete)
- Mature ecosystem and documentation
- Prisma Studio for database GUI
- Better for team collaboration
- Trade-off: Slightly larger bundle, acceptable for our use case

### 3. PWA Library: Native vs @ducanh2912/next-pwa

**Chosen: @ducanh2912/next-pwa**

**Rationale:**
- Next.js native PWA support is basic
- next-pwa provides Workbox integration
- Advanced caching strategies
- 44k+ weekly downloads, well-maintained
- Better offline experience

### 4. MCP Transport: stdio vs HTTP

**Chosen: Hybrid (stdio server-side, HTTP everywhere else)**

**Rationale:**
- stdio: Best for local MCP servers (filesystem, etc.)
- HTTP: Required for remote MCP servers and browser clients
- Streamable HTTP: Modern, replaces legacy SSE transport
- Flexibility: Can connect to any MCP server

### 5. Streaming: SSE vs WebSockets

**Chosen: Server-Sent Events (SSE)**

**Rationale:**
- One-way streaming sufficient for LLM responses
- Simpler than WebSockets
- Native browser EventSource API
- Better for serverless (Vercel)
- No need for bidirectional communication

---

## Security Considerations

### 1. MCP-Specific Risks

**Risk: Prompt Injection**
- Attacker manipulates prompts to leak data
- **Mitigation:** Sanitize inputs, validate tool outputs

**Risk: Tool Combination Attacks**
- Chain multiple tools to exfiltrate files
- **Mitigation:** Tool authorization, rate limiting, audit logs

**Risk: No Native Auth**
- MCP protocol lacks authentication
- **Mitigation:** Implement app-level auth, JWT tokens

### 2. Client-Side MCP (Development Only)

**Risk: Exposed Credentials**
- API keys visible in browser
- **Mitigation:** NEVER enable in production

**Risk: Localhost CORS Bypass**
- Malicious localhost services can access MCP
- **Mitigation:** Development only, strict origin checking

### 3. Production Security

**Required:**
- ✅ HTTPS only
- ✅ Server-side MCP execution
- ✅ Environment variable secrets
- ✅ Rate limiting on API routes
- ✅ Input validation and sanitization
- ✅ CSRF protection
- ✅ SQL injection prevention (Prisma handles)

### 4. Application-Level Authorization

**Authorization Checks in API Routes:**
```typescript
// Middleware to check user owns conversation
async function checkConversationAccess(userId: string, conversationId: string) {
  const access = await prisma.userConversation.findFirst({
    where: {
      userId,
      conversationId,
    },
  });

  if (!access) {
    throw new Error('Unauthorized');
  }
}

// Example in API route
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { conversationId } = await req.json();
  await checkConversationAccess(session.user.id, conversationId);

  // Proceed with authorized request...
}
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Run development server
npm run dev

# Run Ollama (separate terminal)
ollama serve

# Run MCP server (separate terminal)
node mcp-server.js

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

---

## Environment Variables Reference

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication (NextAuth.js)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# MCP Configuration
NEXT_PUBLIC_MCP_CLIENT_SIDE=false  # true for dev
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8000
MCP_SERVER_URL=http://localhost:8000
MCP_API_KEY=secret

# Ollama
OLLAMA_API_URL=http://localhost:11434

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Useful Resources

**MCP Documentation:**
- Specification: https://modelcontextprotocol.io/specification/2025-03-26
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Examples: https://github.com/modelcontextprotocol/servers

**Ollama:**
- API Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- JavaScript SDK: https://github.com/ollama/ollama-js

**Next.js:**
- App Router: https://nextjs.org/docs/app
- Streaming: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- PWA Guide: https://nextjs.org/docs/app/guides/progressive-web-apps

**NextAuth.js:**
- Documentation: https://next-auth.js.org/getting-started/introduction
- Credentials Provider: https://next-auth.js.org/providers/credentials
- Session Management: https://next-auth.js.org/configuration/options#session

**Prisma:**
- Documentation: https://www.prisma.io/docs
- PostgreSQL Guide: https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgresql

---

## Project Status

**Current Phase:** Documentation and Planning ✅
**Next Phase:** Project Initialization

**Last Updated:** 2025-10-31

---

*This document should be referenced by Claude Code when working on the MCP WebClient project. It contains all architectural decisions, rationale, and implementation guidance.*
