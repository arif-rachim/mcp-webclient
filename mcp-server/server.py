"""
Sample MCP Server using FastMCP 2.x
Demonstrates core MCP protocol features: Tools, Resources, Prompts, Elicitation, Sampling
"""

import os
from datetime import datetime
from typing import Optional
from fastmcp import FastMCP, Context
from fastmcp.exceptions import ToolError

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, skip

# Initialize FastMCP server
mcp = FastMCP("mcp-demo-server")

# ============================================================================
# TOOLS - Actions that the LLM can trigger
# ============================================================================

@mcp.tool()
async def echo(message: str, uppercase: bool = False) -> str:
    """
    Echo a message back, optionally in uppercase.
    Demonstrates basic tool with string manipulation.

    Args:
        message: The message to echo
        uppercase: Convert to uppercase (default: False)

    Returns:
        The echoed message
    """
    result = message.upper() if uppercase else message
    return f"Echo: {result}"


@mcp.tool()
async def add(a: float, b: float) -> str:
    """
    Add two numbers together.
    Demonstrates tool with numeric parameters.

    Args:
        a: First number
        b: Second number

    Returns:
        The sum of a and b
    """
    result = a + b
    return f"{a} + {b} = {result}"


@mcp.tool()
async def get_current_time(timezone: str = "UTC") -> str:
    """
    Get the current time.
    Demonstrates tool that accesses system state.

    Args:
        timezone: Timezone name (default: UTC)

    Returns:
        Current time as ISO 8601 string
    """
    now = datetime.now()
    return f"Current time ({timezone}): {now.isoformat()}"


@mcp.tool()
async def create_greeting(ctx: Context, name: Optional[str] = None) -> str:
    """
    Create a personalized greeting.
    Demonstrates server elicitation - asking user for input during execution.

    Args:
        ctx: MCP context (automatically provided)
        name: Person's name (optional - will ask if not provided)

    Returns:
        Personalized greeting message
    """
    # If name not provided, use elicitation to ask the user
    if not name:
        name = (await ctx.elicit(message="What is your name?",response_type=str)).data

    # Ask for preferred greeting style
    style = await ctx.elicit(
        "How would you like to be greeted?",
        response_type=["formal", "casual", "friendly"]
    )

    # Generate greeting based on style
    if style.data == "formal":
        greeting = f"Good day, {name}. It is a pleasure to meet you."
    elif style == "casual":
        greeting = f"Hey {name}!"
    else:  # friendly
        greeting = f"Hello {name}! How are you doing today?"

    return greeting


# ============================================================================
# ELICITATION - Server asks user for input during tool execution
# ============================================================================

# See create_greeting() tool above for elicitation example using ctx.elicit()
#
# Elicitation allows the server to interactively ask the user for additional
# information during tool execution. This is useful when:
# - A parameter is optional but preferred
# - The tool needs clarification or confirmation
# - The tool needs to guide the user through a multi-step process
#
# The client will prompt the user and return their response to the server.

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    from starlette.middleware import Middleware
    from starlette.middleware.cors import CORSMiddleware

    # Get configuration from environment or use defaults
    host = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("MCP_SERVER_PORT", "8000"))

    print(f"Starting FastMCP server '{mcp.name}' on http://{host}:{port}")
    print(f"CORS enabled for browser clients (mcp-inspector, WebClient)")
    print(f"Debug logging enabled - will show all incoming requests")

    # Define CORS middleware for browser clients
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Allow all origins in development
            allow_credentials=True,
            allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
            allow_headers=[
                "mcp-protocol-version",  # Required for MCP protocol negotiation
                "mcp-session-id",        # Required for MCP session management
                "Authorization",         # Required for authenticated servers
                "Content-Type",          # Standard header
                "Accept",                # Required for content negotiation
            ],
            expose_headers=["mcp-session-id"],  # CRITICAL: Browser needs access to session ID
        )
    ]

    # Create ASGI app with CORS middleware
    app = mcp.http_app(middleware=middleware,transport='streamable-http')

    # Run with uvicorn with debug logging
    try:
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="debug"  # Enable debug logging
        )
    except (KeyboardInterrupt, Exception):
        print("\nServer shutdown complete.")
