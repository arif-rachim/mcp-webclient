# Architecture Documentation

This document provides a detailed technical overview of the MCP WebClient architecture, including system design, data flow, API structure, and key technical decisions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [MCP Integration](#mcp-integration)
7. [Streaming Implementation](#streaming-implementation)
8. [State Management](#state-management)
9. [Security Model](#security-model)
10. [Performance Considerations](#performance-considerations)

---

## System Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Client (Browser)                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React Application (Next.js)                           │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │  │
│  │  │ Chat UI      │ │ Model Select │ │ Tool Explorer │  │  │
│  │  └──────────────┘ └──────────────┘ └───────────────┘  │  │
│  │  ┌──────────────┐ ┌──────────────┐                    │  │
│  │  │ Auth UI      │ │ Settings     │                    │  │
│  │  └──────────────┘ └──────────────┘                    │  │
│  │                                                         │  │
│  │  State Management: React Context + TanStack Query     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Service Worker (PWA)                                  │  │
│  │  - Cache static assets                                 │  │
│  │  - Background sync                                     │  │
│  │  - Push notifications                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  IndexedDB                                             │  │
│  │  - Offline message storage                             │  │
│  │  - Cached conversations                                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          ↕ HTTPS/SSE
┌──────────────────────────────────────────────────────────────┐
│                    Next.js Server (Vercel)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  API Routes                                            │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │  │
│  │  │ /api/chat   │ │ /api/mcp    │ │ /api/messages   │  │  │
│  │  │ (streaming) │ │ (proxy)     │ │ (CRUD)          │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘  │  │
│  │  ┌─────────────┐ ┌─────────────┐                      │  │
│  │  │ /api/auth   │ │ /api/models │                      │  │
│  │  └─────────────┘ └─────────────┘                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                  │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │  │
│  │  │ MCP Client  │ │ Ollama      │ │ Auth Handler    │  │  │
│  │  │ Manager     │ │ Client      │ │                 │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Data Access Layer                                     │  │
│  │  ┌─────────────┐                                      │  │
│  │  │ Prisma ORM  │                                      │  │
│  │  │             │                                      │  │
│  │  └─────────────┘                                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          ↕                    ↕                    ↕
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    Ollama    │    │ MCP Servers  │
│   Database   │    │  localhost:  │    │ (stdio/HTTP) │
│   (Prisma)   │    │    11434     │    │              │
└──────────────┘    └──────────────┘    │ - Filesystem │
                                        │ - GitHub API │
                                        │ - Custom     │
                                        └──────────────┘
```

---

## Component Architecture

### Frontend Components

```
app/
├── layout.tsx                  # Root layout with providers
├── page.tsx                    # Landing page
├── chat/
│   ├── page.tsx               # Conversation list
│   └── [id]/
│       └── page.tsx           # Individual conversation view
├── login/
│   └── page.tsx               # Login page
└── settings/
    └── page.tsx               # Settings page

components/
├── chat/
│   ├── message-list.tsx       # Display messages with streaming
│   ├── message-input.tsx      # User input with model selection
│   ├── message-item.tsx       # Individual message component
│   ├── typing-indicator.tsx   # Shows when streaming
│   └── model-selector.tsx     # Dropdown for Ollama models
├── mcp/
│   ├── tool-list.tsx          # Display available MCP tools
│   ├── tool-item.tsx          # Individual tool card
│   ├── resource-explorer.tsx  # Browse MCP resources
│   └── progress-indicator.tsx # Show MCP progress notifications
├── ui/
│   ├── button.tsx             # shadcn/ui button
│   ├── input.tsx              # shadcn/ui input
│   ├── dialog.tsx             # shadcn/ui dialog
│   └── ...                    # Other shadcn components
└── providers/
    ├── auth-provider.tsx      # Authentication context
    ├── theme-provider.tsx     # Dark/light mode
    └── query-provider.tsx     # TanStack Query setup
```

### Backend Structure

```
app/api/
├── chat/
│   └── route.ts               # POST: Stream chat responses
├── mcp/
│   ├── route.ts               # POST: MCP proxy (tools/list, tools/call)
│   ├── tools/
│   │   └── route.ts           # GET: List tools, POST: Execute tool
│   └── resources/
│       └── route.ts           # GET: List resources, POST: Read resource
├── messages/
│   ├── route.ts               # GET: List messages, POST: Create
│   └── [id]/
│       └── route.ts           # GET, PUT, DELETE: Single message
├── conversations/
│   ├── route.ts               # GET: List, POST: Create
│   └── [id]/
│       └── route.ts           # GET, PUT, DELETE: Single conversation
├── models/
│   └── route.ts               # GET: List available Ollama models
└── auth/
    ├── login/
    │   └── route.ts           # POST: Login
    ├── signup/
    │   └── route.ts           # POST: Signup
    └── logout/
        └── route.ts           # POST: Logout

lib/
├── mcp/
│   ├── client.ts              # MCP client manager (hybrid mode)
│   ├── tools.ts               # Tool execution logic
│   └── types.ts               # MCP TypeScript types
├── ollama/
│   ├── client.ts              # Ollama client wrapper
│   └── stream.ts              # Streaming helpers
├── db.ts                      # Prisma client singleton
├── config.ts                  # Environment configuration
└── utils.ts                   # Shared utilities
```

---

## Data Flow

### 1. User Sends Message

```
┌─────────┐
│  User   │ Types message and presses Enter
└────┬────┘
     │
     ▼
┌─────────────────────┐
│ MessageInput.tsx    │ 1. Capture input
│                     │ 2. Optimistically add to UI
│                     │ 3. Call mutation
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ useSendMessage hook │ TanStack Query mutation
└──────────┬──────────┘
           │
           ▼ POST /api/chat
┌─────────────────────────────────────────┐
│ Next.js API Route                       │
│ app/api/chat/route.ts                   │
│                                          │
│ 1. Validate request                     │
│ 2. Get user from session                │
│ 3. Load conversation history            │
│ 4. Check if MCP tools available         │
│    ├─ Yes: Augment prompt with schemas  │
│    └─ No: Continue with plain prompt    │
│ 5. Call Ollama API (streaming)          │
└──────────┬──────────────────────────────┘
           │
           ▼ HTTP Streaming
┌─────────────────────┐
│ Ollama API          │ Generate response tokens
│ localhost:11434     │
└──────────┬──────────┘
           │
           ▼ Stream chunks back
┌─────────────────────────────────────────┐
│ Next.js API                             │
│                                          │
│ 1. Check each chunk for tool calls      │
│ 2. If tool call detected:               │
│    ├─ Parse tool name & arguments       │
│    ├─ Execute via MCP client            │
│    ├─ Get tool result                   │
│    ├─ Feed back to Ollama               │
│    └─ Continue streaming                │
│ 3. If regular text:                     │
│    └─ Stream to client via SSE          │
└──────────┬──────────────────────────────┘
           │
           ▼ SSE Events
┌─────────────────────┐
│ Browser             │
│ EventSource         │ Receive SSE events
│                     │
│ data: {"token":"Hi"}│
│ data: {"token":" there"}│
│ data: {"done":true} │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ MessageList.tsx     │ 1. Append tokens
│                     │ 2. Update UI
│                     │ 3. Show complete message
└──────────┬──────────┘
           │
           ▼ After completion
┌─────────────────────┐
│ Save to Database    │ POST /api/messages
│ (PostgreSQL/Prisma) │
└─────────────────────┘
```

### 2. MCP Tool Discovery

```
┌─────────┐
│  User   │ Opens chat page
└────┬────┘
     │
     ▼
┌─────────────────────┐
│ Chat Page Mounts    │ useEffect runs
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ useTools() hook     │ Fetch available tools
└──────────┬──────────┘
           │
           ▼ GET /api/mcp/tools
┌─────────────────────────────────────────┐
│ Next.js API                             │
│ app/api/mcp/tools/route.ts             │
│                                          │
│ 1. Initialize MCP client (if not cached)│
│ 2. Send tools/list to MCP server(s)     │
│ 3. Collect tools from all servers       │
│ 4. Cache in memory (5 min TTL)          │
│ 5. Return tools array                   │
└──────────┬──────────────────────────────┘
           │
           ▼ JSON-RPC
┌─────────────────────┐
│ MCP Server          │ Return tools with schemas
│ localhost:8000      │
└──────────┬──────────┘
           │
           ▼ Response
┌─────────────────────────────────────────┐
│ Browser                                  │
│                                          │
│ {                                        │
│   "tools": [                             │
│     {                                    │
│       "name": "read_file",               │
│       "description": "...",              │
│       "inputSchema": {...}               │
│     }                                    │
│   ]                                      │
│ }                                        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ ToolList.tsx        │ Display tools in sidebar
└─────────────────────┘
```

---

## API Endpoints

### Chat Endpoints

#### POST /api/chat
Stream chat responses from Ollama with optional MCP tool integration.

**Request:**
```typescript
{
  "conversationId": "uuid",
  "message": "string",
  "model": "llama3.1",
  "temperature": 0.7
}
```

**Response:** SSE Stream
```
data: {"token": "Hello"}
data: {"token": " there"}
data: {"tool_call": {"name": "read_file", "args": {...}}}
data: {"tool_result": "File contents..."}
data: {"token": " Based on the file..."}
data: {"done": true, "usage": {...}}
```

### MCP Endpoints

#### POST /api/mcp
Generic MCP proxy endpoint for any JSON-RPC method.

**Request:**
```typescript
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Response:**
```typescript
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

#### GET /api/mcp/tools
List all available tools from connected MCP servers.

**Response:**
```typescript
{
  "tools": [
    {
      "name": "read_file",
      "description": "Read file contents",
      "inputSchema": {...},
      "server": "filesystem"
    }
  ]
}
```

#### POST /api/mcp/tools
Execute a specific tool.

**Request:**
```typescript
{
  "name": "read_file",
  "arguments": {
    "path": "/workspace/file.txt"
  },
  "progressToken": "optional-token"
}
```

**Response:** SSE if progressToken provided, otherwise JSON
```typescript
{
  "content": [
    {"type": "text", "text": "File contents"}
  ],
  "isError": false
}
```

### Message Endpoints

#### GET /api/messages?conversationId=uuid&limit=50&offset=0
Paginated message list.

**Response:**
```typescript
{
  "messages": [
    {
      "id": "uuid",
      "content": "Hello",
      "role": "user",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /api/messages
Create a new message.

**Request:**
```typescript
{
  "conversationId": "uuid",
  "content": "Message text",
  "role": "user",
  "metadata": {}
}
```

### Conversation Endpoints

#### GET /api/conversations
List user's conversations.

**Response:**
```typescript
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Chat about MCP",
      "model": "llama3.1",
      "lastMessage": {...},
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/conversations
Create new conversation.

**Request:**
```typescript
{
  "title": "New Chat",
  "model": "llama3.1"
}
```

### Model Endpoints

#### GET /api/models
List available Ollama models.

**Response:**
```typescript
{
  "models": [
    {
      "name": "llama3.1",
      "size": "7B",
      "modified": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │───┐
│ username        │   │
│ email           │   │
│ password_hash   │   │
│ created_at      │   │
│ updated_at      │   │
└─────────────────┘   │
                      │
                      │ Many-to-Many
                      │
         ┌────────────┴──────────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│ user_conversations  │           │   conversations     │
├─────────────────────┤           ├─────────────────────┤
│ id (PK)             │           │ id (PK)             │───┐
│ user_id (FK)        │───────────│ title               │   │
│ conversation_id (FK)│───────────│ type                │   │
│ joined_at           │           │ model               │   │
│ last_read_at        │           │ created_at          │   │
└─────────────────────┘           │ updated_at          │   │
                                  └─────────────────────┘   │
                                                            │
                                                            │ One-to-Many
                                                            │
                                                            ▼
                                                  ┌─────────────────────┐
                                                  │     messages        │
                                                  ├─────────────────────┤
                                                  │ id (PK)             │
                                                  │ conversation_id (FK)│
                                                  │ user_id (FK)        │
                                                  │ content             │
                                                  │ role                │
                                                  │ metadata (JSONB)    │
                                                  │ created_at          │
                                                  │ edited_at           │
                                                  │ deleted_at          │
                                                  └─────────────────────┘
```

### Prisma Schema

See `prisma/schema.prisma` for the complete schema definition.

### Indexes

Performance-critical indexes:

```sql
-- Message queries by conversation
CREATE INDEX idx_messages_conversation
ON messages(conversation_id, created_at DESC);

-- User's conversations lookup
CREATE INDEX idx_user_conversations_user
ON user_conversations(user_id);

-- Full-text search on messages (future)
CREATE INDEX idx_messages_content_fts
ON messages USING GIN(to_tsvector('english', content));

-- Metadata queries (MCP tool calls, etc.)
CREATE INDEX idx_messages_metadata
ON messages USING GIN(metadata);
```

---

## MCP Integration

### Client Manager Architecture

```typescript
// lib/mcp/client.ts
export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, Transport> = new Map();

  async connect(serverConfig: MCPServerConfig) {
    const { id, url, transport } = serverConfig;

    // Check if already connected
    if (this.clients.has(id)) {
      return this.clients.get(id);
    }

    // Create appropriate transport
    const transportInstance = this.createTransport(transport, url);

    // Create client
    const client = new Client({
      name: "mcp-webclient",
      version: "1.0.0",
    });

    // Connect
    await client.connect(transportInstance);

    // Store references
    this.clients.set(id, client);
    this.transports.set(id, transportInstance);

    return client;
  }

  private createTransport(type: string, url: string) {
    switch (type) {
      case 'http':
        return new StreamableHTTPClientTransport(url);
      case 'stdio':
        return new StdioClientTransport({
          command: url, // Actually a command
        });
      default:
        throw new Error(`Unknown transport: ${type}`);
    }
  }

  async listTools(serverId?: string): Promise<Tool[]> {
    const servers = serverId
      ? [this.clients.get(serverId)]
      : Array.from(this.clients.values());

    const toolPromises = servers.map(client =>
      client.request({ method: 'tools/list' })
    );

    const results = await Promise.all(toolPromises);
    return results.flatMap(r => r.tools);
  }

  async executeTool(
    toolName: string,
    args: any,
    progressToken?: string
  ): Promise<ToolResult> {
    // Find which server has this tool
    const tools = await this.listTools();
    const tool = tools.find(t => t.name === toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Execute on appropriate server
    const client = this.clients.get(tool.serverId);
    return client.request({
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
      _meta: progressToken ? { progressToken } : undefined,
    });
  }
}
```

### Tool Execution Flow

```
1. LLM generates tool call
   ↓
2. Parse tool name and arguments
   ↓
3. Validate arguments against schema
   ↓
4. Find MCP server that provides tool
   ↓
5. Send tools/call JSON-RPC request
   ↓
6. MCP server executes tool
   ↓
7. If progressToken: Stream progress notifications
   ↓
8. Return tool result
   ↓
9. Feed result back to LLM context
   ↓
10. LLM continues generation with new info
```

---

## Streaming Implementation

### Server-Sent Events (SSE) Setup

#### Server Side (Next.js API Route)

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message, conversationId } = await req.json();

  // Create readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await ollama.chat({
          model: 'llama3.1',
          messages: [...history, { role: 'user', content: message }],
          stream: true,
        });

        // Stream tokens
        for await (const chunk of response) {
          const data = JSON.stringify({
            token: chunk.message.content,
            done: false,
          });

          controller.enqueue(
            new TextEncoder().encode(`data: ${data}\n\n`)
          );
        }

        // Send completion
        controller.enqueue(
          new TextEncoder().encode(`data: {"done":true}\n\n`)
        );

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### Client Side (React)

```typescript
// hooks/use-chat-stream.ts
export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    // Optimistic update
    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = JSON.parse(line.slice(6));

        if (data.done) {
          setIsStreaming(false);
          break;
        }

        if (data.token) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            last.content += data.token;
            return updated;
          });
        }
      }
    }
  };

  return { messages, sendMessage, isStreaming };
}
```

---

## State Management

### React Context + TanStack Query Strategy

```typescript
// providers/chat-provider.tsx
export function ChatProvider({ children }) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// hooks/use-conversations.ts
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/conversations');
      return res.json();
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

// hooks/use-send-message.ts
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId, content }),
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate messages query
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.conversationId]
      });

      // Invalidate conversations (update last message)
      queryClient.invalidateQueries({
        queryKey: ['conversations']
      });
    },
  });
}
```

### Optimistic Updates

```typescript
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessageAPI,
    onMutate: async (newMessage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['messages', newMessage.conversationId]
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData([
        'messages',
        newMessage.conversationId
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ['messages', newMessage.conversationId],
        (old) => [...old, { ...newMessage, id: 'temp', createdAt: new Date() }]
      );

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['messages', newMessage.conversationId],
        context.previousMessages
      );
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.conversationId]
      });
    },
  });
}
```

---

## Security Model

### Authentication Flow

```
1. User submits credentials
   ↓
2. POST /api/auth/login (NextAuth.js)
   ↓
3. Verify credentials with bcrypt hash comparison
   ↓
4. Create session cookie (httpOnly, secure, sameSite)
   ↓
5. Return user data
   ↓
6. Subsequent requests include session cookie
   ↓
7. Middleware validates session (NextAuth.js)
   ↓
8. If valid: Continue to route
   If invalid: Redirect to login
```

### Application-Level Authorization

**Authorization Checks in API Routes:**

```typescript
// lib/auth.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSession() {
  return await getServerSession(authOptions);
}

// Middleware to check conversation access
export async function checkConversationAccess(
  userId: string,
  conversationId: string
) {
  const access = await prisma.userConversation.findFirst({
    where: {
      userId,
      conversationId,
    },
  });

  if (!access) {
    throw new Error('Unauthorized access to conversation');
  }

  return true;
}
```

### API Route Protection

```typescript
// app/api/messages/route.ts
import { getSession, checkConversationAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { conversationId } = await req.json();

  // Check user has access to this conversation
  try {
    await checkConversationAccess(session.user.id, conversationId);
  } catch (error) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch messages
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,  // Exclude soft-deleted messages
    },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json({ messages });
}
```

**Authorization Benefits:**
- ✅ Full control over authorization logic
- ✅ Can implement complex permission rules
- ✅ Easier to debug and test
- ✅ Works with any PostgreSQL hosting
- ✅ No database-level policies to manage

---

## Performance Considerations

### Caching Strategy

1. **Static Assets:** Cache-first with service worker
2. **API Responses:** TanStack Query with staleTime
3. **MCP Tool Schemas:** In-memory cache (5 min TTL)
4. **Database Queries:** Prisma query caching

### Pagination

```typescript
// Cursor-based pagination for messages
export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 50
) {
  return prisma.message.findMany({
    where: { conversationId },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}
```

### Code Splitting

```typescript
// Dynamic imports for heavy components
const ToolExplorer = dynamic(() => import('@/components/mcp/tool-explorer'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### Database Optimization

- Indexes on frequently queried columns
- JSONB indexes for metadata queries
- Partitioning for large message tables (future)
- Connection pooling with Prisma

---

**Last Updated:** 2025-10-31
