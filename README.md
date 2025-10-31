# MCP WebClient

A modern, production-ready web application for chatting with Ollama models with complete **Model Context Protocol (MCP)** support. Think Open WebUI, but built with TypeScript and native MCP integration.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)

## Features

- **Real-time Streaming Chat** - Stream responses token-by-token from Ollama models
- **Full MCP Protocol Support** - Tools, Resources, Prompts, and Sampling
- **Progressive Web App** - Install on any device, works offline
- **Multi-Model Support** - Switch between any Ollama model
- **Persistent Chat History** - PostgreSQL storage with Prisma
- **Secure Authentication** - NextAuth.js with flexible providers
- **Hybrid MCP Execution** - Client-side for dev, server-side for production
- **Type-Safe** - Full TypeScript throughout the stack

## Tech Stack

```
Frontend:  Next.js 15 + React + TypeScript + Tailwind CSS
Backend:   Next.js API Routes + Ollama + MCP SDK
Database:  PostgreSQL
ORM:       Prisma
Auth:      NextAuth.js
PWA:       @ducanh2912/next-pwa
Deploy:    Vercel
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted: Railway, Render, Neon)
- Ollama installed and running locally
- Optional: MCP server for tool integration

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-webclient
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Initialize database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Ollama** (in a separate terminal)
   ```bash
   ollama serve
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
mcp-webclient/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Ollama streaming endpoint
│   │   ├── mcp/           # MCP proxy endpoint
│   │   └── messages/      # Message CRUD
│   ├── chat/              # Chat pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── chat/             # Chat UI components
│   ├── mcp/              # MCP tool components
│   └── ui/               # Shared UI components
├── lib/                   # Utilities and libraries
│   ├── mcp/              # MCP client logic
│   ├── config.ts         # Environment configuration
│   └── db.ts             # Prisma database client
├── prisma/               # Database schema
│   └── schema.prisma
├── public/               # Static assets
│   ├── icons/            # PWA icons
│   └── manifest.json     # PWA manifest
├── CLAUDE.md             # Comprehensive project reference
├── ARCHITECTURE.md       # Technical architecture details
├── SETUP.md              # Detailed setup instructions
└── README.md             # This file
```

## Configuration

### Environment Variables

See `.env.example` for all required environment variables.

Key variables:
```env
DATABASE_URL                    # PostgreSQL connection string
NEXTAUTH_SECRET                # NextAuth.js secret key
NEXTAUTH_URL                   # Application URL
OLLAMA_API_URL                 # Ollama API endpoint
MCP_SERVER_URL                 # MCP server endpoint
```

### Hybrid MCP Mode

**Development (Client-Side):**
```env
NEXT_PUBLIC_MCP_CLIENT_SIDE=true
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8000
```

**Production (Server-Side):**
```env
NEXT_PUBLIC_MCP_CLIENT_SIDE=false
MCP_SERVER_URL=https://your-mcp-server.com
MCP_API_KEY=your-secret-key
```

## Development

```bash
# Run development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Deploy to Vercel

1. **Connect repository to Vercel**
   ```bash
   vercel
   ```

2. **Set environment variables** in Vercel dashboard
   - Database credentials (DATABASE_URL)
   - NextAuth secret (NEXTAUTH_SECRET)
   - MCP server URL and API key

3. **Deploy**
   ```bash
   vercel deploy --prod
   ```

### Database Setup

1. Set up PostgreSQL database (Railway, Render, Neon, or local)
2. Copy the connection string to DATABASE_URL
3. Run migrations: `npx prisma migrate deploy`
4. Verify connection: `npx prisma db push`

## Usage

### Basic Chat

1. Open the application
2. Select an Ollama model from the dropdown
3. Type your message and press Enter
4. Watch the response stream in real-time

### Using MCP Tools

1. Connect an MCP server (configure in settings)
2. Tools are automatically discovered
3. When chatting, the LLM can invoke tools as needed
4. Tool results are fed back into the conversation

### Offline Mode

1. Install the PWA (click "Install" button)
2. Messages are cached in IndexedDB
3. New messages queue when offline
4. Auto-sync when connection restored

## MCP Protocol Support

This application implements the full MCP specification (version 2025-03-26):

- ✅ **Tools** - Execute actions (API calls, file operations)
- ✅ **Resources** - Access read-only data (files, logs, databases)
- ✅ **Prompts** - Use reusable prompt templates
- ✅ **Sampling** - MCP servers can request LLM completions
- ✅ **Progress Notifications** - Real-time updates during tool execution
- ✅ **Streamable HTTP** - Modern HTTP transport protocol
- ✅ **Session Management** - Stateful connections

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive project reference for Claude Code
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design decisions
- **[SETUP.md](./SETUP.md)** - Detailed setup and configuration guide

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

### Database Connection Issues

```bash
# Test database connection
npx prisma db push

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### MCP Server Issues

- Check CORS configuration if using client-side MCP
- Verify MCP server is running: `curl http://localhost:8000`
- Check MCP_SERVER_URL in environment variables

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - Anthropic's standardized AI integration protocol
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Next-generation TypeScript ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication for Next.js
- [Open WebUI](https://github.com/open-webui/open-webui) - Inspiration for this project

## Links

- **Documentation:** [Full docs](./CLAUDE.md)
- **MCP Specification:** https://modelcontextprotocol.io/specification
- **Ollama API:** https://github.com/ollama/ollama/blob/main/docs/api.md

---

**Built with ❤️ using TypeScript and the Model Context Protocol**
