/**
 * MCP Client Manager
 * Handles connections and communication with MCP servers
 */

import type {
  MCPServerConfig,
  JSONRPCRequest,
  JSONRPCResponse,
  MCPTool,
  MCPToolsListResponse,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPResource,
  MCPResourcesListResponse,
  MCPPrompt,
  MCPPromptsListResponse,
  MCPToolResult,
  ElicitationRequest,
  ElicitationResponse,
  ElicitationSchema,
} from './types';

export class MCPClientManager {
  private requestId = 1;
  private sessionIds = new Map<string, string>();
  private initializedServers = new Set<string>();

  // Store pending elicitation contexts for resuming tool execution
  private pendingElicitations = new Map<string, {
    serverId: string;
    toolName: string;
    requestId: string;
  }>();

  /**
   * Initialize session with MCP server
   */
  private async initialize(serverConfig: MCPServerConfig): Promise<void> {
    // Skip if already initialized
    if (this.initializedServers.has(serverConfig.id)) {
      return;
    }

    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mcp-webclient',
          version: '1.0.0',
        },
      },
      id: this.requestId++,
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-protocol-version': '2024-11-05',
    };

    if (serverConfig.apiKey) {
      headers['Authorization'] = `Bearer ${serverConfig.apiKey}`;
    }

    const response = await fetch(serverConfig.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Store session ID from response headers
    const sessionId = response.headers.get('Mcp-Session-Id');
    if (sessionId) {
      this.sessionIds.set(serverConfig.id, sessionId);
      this.initializedServers.add(serverConfig.id);
    }

    // Consume response (SSE or JSON)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/event-stream')) {
      const text = await response.text();
      this.parseSSE(text); // Parse but don't need to use result for initialize
    } else {
      await response.json();
    }
  }

  /**
   * Parse SSE (Server-Sent Events) response format
   */
  private parseSSE(text: string): JSONRPCResponse | null {
    // SSE format: event: message\ndata: {...}\n\n
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonData = line.slice(6); // Remove "data: " prefix
        try {
          return JSON.parse(jsonData);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
    return null;
  }

  /**
   * Send JSON-RPC request to MCP server
   */
  private async sendRequest(
    serverConfig: MCPServerConfig,
    method: string,
    params?: Record<string, any>
  ): Promise<JSONRPCResponse> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestId++,
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream', // Must accept both for streamable-http transport
      'mcp-protocol-version': '2024-11-05', // MCP protocol version
    };

    // Add session ID if exists
    const sessionId = this.sessionIds.get(serverConfig.id);
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }

    // Add API key if configured
    if (serverConfig.apiKey) {
      headers['Authorization'] = `Bearer ${serverConfig.apiKey}`;
    }

    const response = await fetch(serverConfig.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Store session ID from response headers
    const newSessionId = response.headers.get('Mcp-Session-Id');
    if (newSessionId) {
      this.sessionIds.set(serverConfig.id, newSessionId);
    }

    // Check content type to determine how to parse response
    const contentType = response.headers.get('Content-Type') || '';
    let jsonResponse: JSONRPCResponse;

    if (contentType.includes('text/event-stream')) {
      // Parse SSE format
      const text = await response.text();
      const parsed = this.parseSSE(text);
      if (!parsed) {
        throw new Error('Failed to parse SSE response');
      }
      jsonResponse = parsed;
    } else {
      // Parse plain JSON
      jsonResponse = await response.json();
    }

    if (jsonResponse.error) {
      throw new Error(
        `MCP Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`
      );
    }

    return jsonResponse;
  }

  /**
   * Test connection to MCP server
   */
  async testConnection(serverConfig: MCPServerConfig): Promise<boolean> {
    try {
      // Initialize session first
      await this.initialize(serverConfig);
      // Try to list tools as a connection test
      await this.sendRequest(serverConfig, 'tools/list');
      return true;
    } catch (error) {
      console.error('MCP connection test failed:', error);
      return false;
    }
  }

  /**
   * List available tools from MCP server
   */
  async listTools(serverConfig: MCPServerConfig): Promise<MCPTool[]> {
    try {
      // Initialize session first
      await this.initialize(serverConfig);
      const response = await this.sendRequest(serverConfig, 'tools/list');
      const result = response.result as MCPToolsListResponse;
      return result.tools || [];
    } catch (error) {
      console.error('Failed to list tools:', error);
      return [];
    }
  }

  /**
   * Execute a tool on MCP server
   * Now returns MCPToolResult which can be 'pending' (needs elicitation) or 'complete'
   */
  async callTool(
    serverConfig: MCPServerConfig,
    params: MCPToolCallParams
  ): Promise<MCPToolResult> {
    await this.initialize(serverConfig);
    const response = await this.sendRequest(serverConfig, 'tools/call', params);
    const result = response.result as MCPToolCallResult;

    // Note: Old implementation - elicitation not supported in this version
    // Use SDKMCPClientManager for full elicitation support
    return {
      status: 'complete',
      result,
    };
  }

  /**
   * Respond to an elicitation request and resume tool execution
   */
  async respondToElicitation(
    serverConfig: MCPServerConfig,
    elicitRequestId: string,
    response: ElicitationResponse
  ): Promise<MCPToolCallResult> {
    const context = this.pendingElicitations.get(elicitRequestId);
    if (!context) {
      throw new Error('No pending elicitation found for this request ID');
    }

    // If user declined or cancelled, throw error
    if (response.action === 'decline' || response.action === 'cancel') {
      this.pendingElicitations.delete(elicitRequestId);
      throw new Error(`User ${response.action}d the elicitation request`);
    }

    // Send elicitation response to server
    // This would be a continuation of the tool call with the user's input
    const elicitResponse = await this.sendRequest(serverConfig, 'elicit/response', {
      requestId: context.requestId,
      action: response.action,
      content: response.content,
    });

    // Clean up pending elicitation
    this.pendingElicitations.delete(elicitRequestId);

    // Return the final tool result
    return elicitResponse.result as MCPToolCallResult;
  }

  /**
   * List available resources from MCP server
   */
  async listResources(serverConfig: MCPServerConfig): Promise<MCPResource[]> {
    try {
      await this.initialize(serverConfig);
      const response = await this.sendRequest(serverConfig, 'resources/list');
      const result = response.result as MCPResourcesListResponse;
      return result.resources || [];
    } catch (error) {
      console.error('Failed to list resources:', error);
      return [];
    }
  }

  /**
   * Read a resource from MCP server
   */
  async readResource(serverConfig: MCPServerConfig, uri: string): Promise<any> {
    await this.initialize(serverConfig);
    const response = await this.sendRequest(serverConfig, 'resources/read', { uri });
    return response.result;
  }

  /**
   * List available prompts from MCP server
   */
  async listPrompts(serverConfig: MCPServerConfig): Promise<MCPPrompt[]> {
    try {
      await this.initialize(serverConfig);
      const response = await this.sendRequest(serverConfig, 'prompts/list');
      const result = response.result as MCPPromptsListResponse;
      return result.prompts || [];
    } catch (error) {
      console.error('Failed to list prompts:', error);
      return [];
    }
  }

  /**
   * Get a prompt from MCP server
   */
  async getPrompt(
    serverConfig: MCPServerConfig,
    name: string,
    args?: Record<string, string>
  ): Promise<any> {
    await this.initialize(serverConfig);
    const response = await this.sendRequest(serverConfig, 'prompts/get', {
      name,
      arguments: args,
    });
    return response.result;
  }

  /**
   * Clear session for a server
   */
  clearSession(serverId: string): void {
    this.sessionIds.delete(serverId);
    this.initializedServers.delete(serverId);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessionIds.clear();
    this.initializedServers.clear();
  }
}

// Singleton instance
export const mcpManager = new MCPClientManager();
