# Sample MCP Server with FastMCP 2.x

A demonstration MCP server built with FastMCP 2.x that showcases core Model Context Protocol features.

## MCP Protocol Features

This server demonstrates the **5 main MCP capabilities**:

### 1. Tools
Actions that the LLM can trigger:
- **`echo`** - Echo messages back (with optional uppercase)
- **`add`** - Add two numbers together
- **`get_current_time`** - Get current timestamp
- **`create_greeting`** - Personalized greeting (demonstrates elicitation)

### 2. Resources
Data/context that can be provided to the LLM:
- **`config://server`** - Server configuration information
- **`docs://welcome`** - Welcome documentation
- **`docs://examples`** - Usage examples

### 3. Prompts
Reusable prompt templates with arguments:
- **`summarize`** - Text summarization template with word limit
- **`code_review`** - Code review template with language parameter

### 4. Elicitation
Server asks user for input during tool execution:
- **`create_greeting`** tool uses `ctx.elicit()` to ask for name and greeting style
- Enables interactive, multi-step tool execution
- User provides input through the client interface

### 5. Sampling
Server can request LLM completion from client (with user approval):
- Demonstrates advanced MCP capability
- Requires human-in-the-loop for security

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. **Navigate to the mcp-server directory:**
   ```bash
   cd mcp-server
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file (optional):**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` if you want to customize the port or host.

## Running the Server

Start the MCP server with HTTP transport:

```bash
python server.py
```

The server will start on `http://0.0.0.0:8000` by default.

You should see output like:
```
Starting FastMCP server 'mcp-demo-server' on http://0.0.0.0:8000
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**CORS Support:** The server uses Starlette CORS middleware to support browser-based clients:
- **mcp-inspector**: Test tools and debugging
- **MCP WebClient**: Direct browser connections
- **Critical Headers**: Includes `mcp-session-id` in exposed headers for session management

**Development Mode:** Currently allows all origins (`*`). For production, restrict to specific domains.

## Connecting from MCP WebClient

1. Open the MCP WebClient at `http://localhost:3000`
2. Click the **Settings** icon (⚙️) in the message input
3. Click **Add Server**
4. Fill in the details:
   - **Server Name:** MCP Demo Server
   - **Server URL:** `http://localhost:8000`
   - **API Key:** (leave empty - not required)
5. Click **Add Server**
6. Toggle the **Enabled** checkbox
7. Click **Test Connection** to verify
8. Click **Refresh Tools** to discover available tools

The tools, resources, and prompts should now appear!

## Testing MCP Features

### Testing Tools

**Example 1: Echo**
```
User: "Echo 'Hello MCP World' in uppercase"
AI: [Uses echo tool with uppercase=true]
Result: "Echo: HELLO MCP WORLD"
```

**Example 2: Add numbers**
```
User: "Add 42 and 58"
AI: [Uses add tool]
Result: "42 + 58 = 100"
```

**Example 3: Get time**
```
User: "What's the current time?"
AI: [Uses get_current_time tool]
Result: "Current time (UTC): 2025-01-15T10:30:00.123456"
```

**Example 4: Elicitation (interactive)**
```
User: "Create a greeting for me"
AI: [Starts create_greeting tool]
Server: "What is your name?"
User: "Alice"
Server: "How would you like to be greeted?" (options: formal, casual, friendly)
User: "friendly"
Result: "Hello Alice! How are you doing today?"
```

### Testing Resources

Resources are automatically available to the LLM when connected. Ask questions like:

```
User: "What's the server configuration?"
AI: [Accesses config://server resource]
```

```
User: "Show me the welcome documentation"
AI: [Accesses docs://welcome resource]
```

### Testing Prompts

Prompts are templates that can be invoked with parameters:

```
User: "Summarize this text in 20 words: [long text]"
AI: [Uses summarize prompt with text and max_words=20]
```

```
User: "Review this Python code: [code snippet]"
AI: [Uses code_review prompt with code and language='python']
```

## Protocol Details

### Tool Discovery

All tools are automatically discovered by MCP clients through the `tools/list` endpoint. Each tool includes:

- **Name**: Unique identifier
- **Description**: What the tool does
- **Input Schema**: JSON Schema defining parameters (type, required fields, etc.)

Example schema for `echo` tool:
```json
{
  "name": "echo",
  "description": "Echo a message back, optionally in uppercase.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The message to echo"
      },
      "uppercase": {
        "type": "boolean",
        "description": "Convert to uppercase",
        "default": false
      }
    },
    "required": ["message"]
  }
}
```

### Resource URIs

Resources use URI format with custom schemes:
- `config://server` - Server configuration
- `docs://welcome` - Welcome documentation
- `docs://examples` - Usage examples

### Prompt Templates

Prompts accept parameters and return formatted prompt strings:
- `summarize(text, max_words)` - Returns summarization prompt
- `code_review(code, language)` - Returns code review prompt

## Security Considerations

This is a **sample server for development purposes**. For production use:

1. **Authentication:** Add API key validation in middleware
2. **CORS Configuration:**
   ```python
   # Change in server.py:
   allow_origins=["https://yourdomain.com"]  # Not "*"
   ```
   Never use `allow_origins=["*"]` in production - exposes server to all websites
3. **MCP Headers Security:**
   - `mcp-session-id` exposed to allow proper session management
   - `mcp-protocol-version` required for protocol negotiation
4. **Input Validation:** Enhanced validation and sanitization for all tool inputs
5. **Rate Limiting:** Prevent abuse of tools and resources (add rate limiting middleware)
6. **HTTPS:** Use TLS encryption for remote servers (configure uvicorn with SSL)
7. **Access Control:** Restrict file operations and system access to safe directories
8. **Monitoring:** Add logging and audit trails for tool execution

## Understanding CORS Configuration

### Why CORS is Needed

CORS (Cross-Origin Resource Sharing) is **only** required when:
- JavaScript running in a **browser** directly connects to your MCP server
- Examples: mcp-inspector, browser-based MCP clients

CORS is **NOT** needed when:
- LLM services (ChatGPT, Claude) connect to your server
- Because the request flow is: Browser → LLM Service → MCP Server (no direct browser access)

### Key CORS Headers Explained

**`expose_headers=["mcp-session-id"]`** - CRITICAL
- Server sends `mcp-session-id` in response headers
- Without this, browser receives it but JavaScript **cannot access it**
- Result: Session management breaks, connections fail
- This is the most common CORS mistake with MCP servers

**`allow_headers`** - Required MCP Headers
- `mcp-protocol-version`: Protocol version negotiation
- `mcp-session-id`: Session tracking across requests
- `Authorization`: For authenticated servers
- `Content-Type`: Standard HTTP header

**`allow_methods`** - HTTP Methods
- `OPTIONS`: Handles preflight requests (fixes 405 errors)
- `GET`, `POST`, `DELETE`: Used by MCP protocol

### Implementation Detail

The server uses `http_app()` instead of `run()`:
```python
# ❌ Won't work for CORS (no middleware support)
mcp.run(transport="http", host=host, port=port)

# ✅ Works with CORS middleware
app = mcp.http_app(middleware=middleware)
uvicorn.run(app, host=host, port=port)
```

## Testing with MCP Inspector

You can test the server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector http://localhost:8000/mcp
```

This will open a web interface where you can:
- View all available tools
- Test tool execution
- Inspect resources and prompts
- Test elicitation flows

**Verify CORS is Working:**
```bash
# Test OPTIONS preflight request
curl -X OPTIONS http://localhost:8000/mcp \
  -H "Origin: http://localhost:6274" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Expected response:
- Status: `200 OK`
- Header: `Access-Control-Allow-Origin: *`
- Header: `Access-Control-Expose-Headers: mcp-session-id`

## Troubleshooting

### Server won't start
- **Error:** `Address already in use`
  - **Solution:** Another process is using port 8000. Change port in `.env` or kill the other process

- **Error:** `ModuleNotFoundError: No module named 'fastmcp'`
  - **Solution:** Install dependencies: `pip install -r requirements.txt`

### Can't connect from WebClient or Inspector
- **Error:** `Failed to connect` or `CORS policy` errors
  - **Solution:** Verify server is running and URL is correct (`http://localhost:8000/mcp`)
  - **Solution:** Check server logs show "CORS enabled for browser clients"
  - **Solution:** Verify FastMCP version is 2.3.2+ (`pip show fastmcp`)
  - **Solution:** Test CORS with curl (see "Verify CORS is Working" section above)
  - **Solution:** Check Windows Firewall isn't blocking port 8000
  - **Solution:** Make sure no other service is using port 8000

### CORS 405 Method Not Allowed
- **Error:** `OPTIONS /mcp HTTP/1.1" 405 Method Not Allowed`
  - **Cause:** Server is not handling OPTIONS preflight requests
  - **Solution:** Verify you're using `http_app()` with middleware (not `mcp.run()`)
  - **Solution:** Check middleware includes `allow_methods=["OPTIONS"]`

### CORS Headers Missing
- **Error:** `No 'Access-Control-Allow-Origin' header is present`
  - **Solution:** Verify CORS middleware is configured in server.py
  - **Solution:** Check starlette is installed: `pip install starlette`
  - **Solution:** Restart the server after code changes

### Tools not appearing
- **Error:** No tools shown after connecting
  - **Solution:** Click "Refresh Tools" in the MCP settings modal
  - **Solution:** Check browser console for CORS errors
  - **Solution:** Verify server is running with `netstat -ano | findstr :8000` (Windows)

## Development

### Adding New Features

**Add a new Tool:**
```python
@mcp.tool()
async def my_tool(param1: str, param2: int = 10) -> str:
    """Tool description here."""
    return f"Result: {param1} with {param2}"
```

**Add a Tool with Elicitation:**
```python
@mcp.tool()
async def interactive_tool(ctx: Context, optional_param: Optional[str] = None) -> str:
    """Tool that asks user for input during execution."""
    if not optional_param:
        optional_param = await ctx.elicit("Please provide a value:")

    # Ask with options
    choice = await ctx.elicit("Choose an option:", options=["A", "B", "C"])

    return f"You provided: {optional_param}, chose: {choice}"
```

**Add a new Resource:**
```python
@mcp.resource("custom://my-data")
async def my_resource() -> str:
    """Resource description here."""
    return "Resource content here"
```

**Add a new Prompt:**
```python
@mcp.prompt()
async def my_prompt(task: str, context: str = "") -> str:
    """Prompt template description here."""
    return f"Perform {task} with context: {context}"
```

All features are automatically discovered by MCP clients!

## Resources

- **FastMCP Documentation:** https://github.com/jlowin/fastmcp
- **FastMCP Elicitation Guide:** https://fastmcp.wiki/en/servers/elicitation
- **MCP Specification:** https://modelcontextprotocol.io/specification/2025-03-26
- **MCP TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk

## License

This is sample code for demonstration purposes.
