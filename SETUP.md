# Setup Guide

Complete setup instructions for the MCP WebClient project, from prerequisites to running in production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [MCP Server Setup](#mcp-server-setup)
5. [Ollama Configuration](#ollama-configuration)
6. [Environment Configuration](#environment-configuration)
7. [Running Locally](#running-locally)
8. [PWA Configuration](#pwa-configuration)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | Runtime environment |
| npm | 9.x or higher | Package manager |
| PostgreSQL | 14.x or higher | Database (or use Supabase) |
| Ollama | Latest | Local LLM runtime |
| Git | Latest | Version control |

### Recommended Tools

- **VS Code** - Recommended IDE with extensions:
  - Prisma
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
- **Postman** or **Insomnia** - API testing
- **Prisma Studio** - Database GUI (included with Prisma)

### Account Setup

1. **Supabase Account** (recommended) or local PostgreSQL
2. **Vercel Account** (for deployment)
3. **MCP Server** (optional, for tool integration)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mcp-webclient
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- Next.js 15 and React 18
- Prisma ORM and Prisma Client
- Supabase client
- MCP SDK
- Ollama JavaScript client
- PWA dependencies
- UI libraries (shadcn/ui components)

### 3. Verify Installation

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Check npm version
npm --version   # Should be 9.x or higher

# Verify dependencies installed
npm list --depth=0
```

---

## Database Setup

### Option A: Supabase (Recommended)

#### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `mcp-webclient`
   - Database Password: (save this!)
   - Region: Choose closest to you

#### 2. Get Connection String

1. In Supabase dashboard, go to **Settings > Database**
2. Copy the connection string (Session mode)
3. Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

#### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
```

#### 4. Run Migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables in your Supabase database.

#### 5. Set Up Row Level Security (RLS)

1. Open Supabase SQL Editor
2. Run the RLS policies:

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id
    FROM user_conversations
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert own conversations
CREATE POLICY "Users can insert own conversations"
ON conversations FOR INSERT
WITH CHECK (true);

-- Policy: Users can update own conversations
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
USING (
  id IN (
    SELECT conversation_id
    FROM user_conversations
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can read messages in their conversations
CREATE POLICY "Users can read own messages"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM user_conversations
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert messages in their conversations
CREATE POLICY "Users can insert own messages"
ON messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id
    FROM user_conversations
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can manage their conversation memberships
CREATE POLICY "Users can manage own memberships"
ON user_conversations FOR ALL
USING (user_id = auth.uid());
```

#### 6. Verify Database

```bash
# Open Prisma Studio
npx prisma studio
```

Browser opens at `http://localhost:5555` showing your database tables.

### Option B: Local PostgreSQL

#### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download from [postgresql.org/download](https://www.postgresql.org/download/windows/)

**Linux:**
```bash
sudo apt-get install postgresql-14
sudo systemctl start postgresql
```

#### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE mcp_webclient;
CREATE USER mcp_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mcp_webclient TO mcp_user;
\q
```

#### 3. Configure Environment

```env
DATABASE_URL="postgresql://mcp_user:your_password@localhost:5432/mcp_webclient"
```

#### 4. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## MCP Server Setup

### Option 1: Use Existing MCP Server

If you have an MCP server running:

```env
# Development (client-side connection)
NEXT_PUBLIC_MCP_CLIENT_SIDE=true
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8000

# Production (server-side connection)
MCP_SERVER_URL=https://your-mcp-server.com
MCP_API_KEY=your-api-key
```

### Option 2: Run Sample MCP Server

#### Simple File System MCP Server

Create `mcp-server/index.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { promises as fs } from 'fs';
import path from 'path';

const server = new Server({
  name: 'filesystem-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Register read_file tool
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'read_file',
      description: 'Read contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to read',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_directory',
      description: 'List files in a directory',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path',
          },
        },
        required: ['path'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'read_file') {
      const content = await fs.readFile(args.path, 'utf-8');
      return {
        content: [{ type: 'text', text: content }],
      };
    }

    if (name === 'list_directory') {
      const files = await fs.readdir(args.path);
      return {
        content: [{ type: 'text', text: files.join('\n') }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: 'text', text: error.message }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
```

#### Run MCP Server

```bash
cd mcp-server
npm install @modelcontextprotocol/sdk
npx tsx index.ts
```

### Option 3: Use Official MCP Servers

Explore official servers: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)

Examples:
- `@modelcontextprotocol/server-filesystem` - File operations
- `@modelcontextprotocol/server-github` - GitHub integration
- `@modelcontextprotocol/server-postgres` - Database queries

---

## Ollama Configuration

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Windows/Linux:**
Download from [ollama.ai/download](https://ollama.ai/download)

### 2. Start Ollama

```bash
ollama serve
```

Ollama runs on `http://localhost:11434`

### 3. Pull Models

```bash
# Pull a model (e.g., Llama 3.1)
ollama pull llama3.1

# List installed models
ollama list

# Test the model
ollama run llama3.1 "Hello, how are you?"
```

### 4. Verify Ollama API

```bash
curl http://localhost:11434/api/tags
```

Should return a JSON list of installed models.

### 5. Configure Environment

```env
OLLAMA_API_URL=http://localhost:11434
```

---

## Environment Configuration

### Complete .env.local Template

```env
# ============================================
# Database Configuration
# ============================================
DATABASE_URL="postgresql://user:password@localhost:5432/mcp_webclient"

# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ============================================
# MCP Configuration
# ============================================
# Set to 'true' for client-side MCP (development only)
NEXT_PUBLIC_MCP_CLIENT_SIDE=true

# Client-side MCP server URL (visible in browser)
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8000

# Server-side MCP server URL (secrets stay on server)
MCP_SERVER_URL=http://localhost:8000
MCP_API_KEY=

# ============================================
# Ollama Configuration
# ============================================
OLLAMA_API_URL=http://localhost:11434

# ============================================
# Application Configuration
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ============================================
# Optional: Authentication
# ============================================
# NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `NEXT_PUBLIC_MCP_CLIENT_SIDE` | No | Enable client-side MCP (dev only) |
| `NEXT_PUBLIC_MCP_SERVER_URL` | No | MCP server URL for client-side |
| `MCP_SERVER_URL` | No | MCP server URL for server-side |
| `MCP_API_KEY` | No | MCP server authentication key |
| `OLLAMA_API_URL` | Yes | Ollama API endpoint |
| `NEXT_PUBLIC_APP_URL` | Yes | Application public URL |

---

## Running Locally

### 1. Start All Services

You need 4 terminal windows:

**Terminal 1: Ollama**
```bash
ollama serve
```

**Terminal 2: MCP Server (optional)**
```bash
cd mcp-server
npx tsx index.ts
```

**Terminal 3: Development Server**
```bash
npm run dev
```

**Terminal 4: Prisma Studio (optional)**
```bash
npx prisma studio
```

### 2. Access the Application

Open your browser:
- **App:** http://localhost:3000
- **Prisma Studio:** http://localhost:5555

### 3. Create First User

1. Navigate to http://localhost:3000/signup
2. Create an account
3. Log in
4. Start chatting!

### 4. Verify MCP Integration

1. Open chat interface
2. Type a message that requires a tool (e.g., "List files in /tmp")
3. Check if MCP tools are being invoked
4. View console logs for MCP requests/responses

---

## PWA Configuration

### 1. Generate Icons

You need PWA icons in multiple sizes. Use a tool like [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator):

**Required sizes:**
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

Place in `public/icons/`

### 2. Create Manifest

Already configured in `public/manifest.json`. Update with your app info:

```json
{
  "name": "MCP WebClient",
  "short_name": "MCP Chat",
  "description": "AI-powered chat with MCP protocol support",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [...]
}
```

### 3. Configure PWA in Next.js

Already configured in `next.config.js`:

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // Next.js config
});
```

### 4. Test PWA

1. Build for production: `npm run build`
2. Start production server: `npm start`
3. Open Chrome DevTools > Application > Manifest
4. Click "Add to home screen"
5. Test offline functionality

---

## Deployment

### Deploy to Vercel

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login to Vercel

```bash
vercel login
```

#### 3. Link Project

```bash
vercel link
```

#### 4. Set Environment Variables

Either through Vercel dashboard or CLI:

```bash
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add MCP_SERVER_URL
vercel env add MCP_API_KEY
vercel env add OLLAMA_API_URL
```

**Important:** Set `NEXT_PUBLIC_MCP_CLIENT_SIDE=false` in production!

#### 5. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Post-Deployment Steps

1. **Run Database Migrations**
   ```bash
   # From your local machine
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   ```

2. **Verify Environment Variables**
   - Check Vercel dashboard > Settings > Environment Variables
   - Ensure all required variables are set

3. **Test Deployment**
   - Open your Vercel URL
   - Test signup/login
   - Test chat functionality
   - Verify MCP tools work (if configured)

4. **Set Up Custom Domain (Optional)**
   - Vercel dashboard > Settings > Domains
   - Add your custom domain

### Deploy Database (Supabase)

Database is already deployed if using Supabase. For production:

1. Ensure RLS policies are enabled
2. Create database backups
3. Monitor usage in Supabase dashboard

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"

**Symptoms:**
- Prisma errors
- Database timeout

**Solutions:**
```bash
# Test connection
npx prisma db push

# Check DATABASE_URL format
# Correct: postgresql://user:pass@host:5432/db
# Wrong: postgres://... (should be postgresql://)

# Verify database is running
# Local: pg_isready
# Supabase: Check project status in dashboard
```

#### 2. "Ollama connection refused"

**Symptoms:**
- "Failed to fetch" errors
- Ollama API not responding

**Solutions:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Check OLLAMA_API_URL in .env.local
# Should be: http://localhost:11434
```

#### 3. "MCP server not found"

**Symptoms:**
- No tools available
- MCP connection errors

**Solutions:**
```bash
# Verify MCP server is running
curl http://localhost:8000

# Check CORS configuration if using client-side MCP
# MCP server needs to allow origin: http://localhost:3000

# Verify environment variables
echo $NEXT_PUBLIC_MCP_SERVER_URL
```

#### 4. "Prisma Client not generated"

**Symptoms:**
- `@prisma/client` import errors
- Type errors

**Solutions:**
```bash
# Generate Prisma Client
npx prisma generate

# If still failing, clean and reinstall
rm -rf node_modules .next
npm install
npx prisma generate
```

#### 5. "PWA not installing"

**Symptoms:**
- No install prompt
- Service worker errors

**Solutions:**
```bash
# Build for production (PWA only works in production build)
npm run build
npm start

# Check service worker registration
# Chrome DevTools > Application > Service Workers

# Verify manifest.json
# Chrome DevTools > Application > Manifest

# Check for HTTPS (required for PWA in production)
```

#### 6. "Supabase Auth errors"

**Symptoms:**
- Login fails
- Session not persisting

**Solutions:**
```bash
# Verify Supabase URL and keys
# Check .env.local values match Supabase dashboard

# Enable email provider in Supabase
# Dashboard > Authentication > Providers > Email

# Check RLS policies
# Disable temporarily to test: ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### Debug Mode

Enable verbose logging:

```env
# .env.local
NEXT_PUBLIC_DEBUG=true
```

Then check browser console and server logs for detailed output.

### Getting Help

1. **Check logs:**
   - Browser console (F12)
   - Server terminal output
   - Vercel logs (in dashboard)

2. **Review documentation:**
   - [CLAUDE.md](./CLAUDE.md) - Comprehensive reference
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details

3. **Common Resources:**
   - Next.js Docs: https://nextjs.org/docs
   - Prisma Docs: https://www.prisma.io/docs
   - Supabase Docs: https://supabase.com/docs
   - MCP Docs: https://modelcontextprotocol.io
   - Ollama Docs: https://github.com/ollama/ollama

---

## Development Workflow

### Daily Development

```bash
# Start all services
npm run dev        # Terminal 1: Next.js
ollama serve       # Terminal 2: Ollama
npx tsx mcp-server # Terminal 3: MCP Server (optional)

# View database
npx prisma studio  # Optional Terminal 4
```

### Making Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name your_migration_name

# 3. Generate client
npx prisma generate

# 4. Restart dev server
```

### Adding New Dependencies

```bash
# Install package
npm install package-name

# Restart dev server to apply changes
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

---

## Next Steps

After successful setup:

1. **Explore the UI** - Navigate through chat, settings, tools
2. **Create conversations** - Test Ollama integration
3. **Try MCP tools** - If configured, test tool execution
4. **Install as PWA** - Test offline functionality
5. **Read ARCHITECTURE.md** - Understand the codebase
6. **Start developing** - Add new features!

---

**Last Updated:** 2025-10-31
