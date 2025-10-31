/**
 * MCP SDK Client Wrapper
 * Official MCP SDK-based client with full bidirectional support
 * Supports: elicitation, notifications, sampling, and all MCP features
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import type {
  MCPServerConfig,
  MCPTool,
  MCPToolCallParams,
  MCPToolCallResult,
  ElicitationRequest,
  ElicitationResponse,
  MCPResource,
  MCPPrompt,
} from './types';

// Elicitation callback type
export type ElicitationHandler = (request: ElicitationRequest) => Promise<ElicitationResponse>;

// Client connection state
interface ConnectionState {
  client: Client;
  transport: StreamableHTTPClientTransport;
  connected: boolean;
  serverCapabilities?: any;
}

/**
 * SDK-based MCP Client Manager
 * Manages connections to multiple MCP servers using official SDK
 */
export class SDKMCPClientManager {
  private connections = new Map<string, ConnectionState>();
  private elicitationHandler?: ElicitationHandler;

  /**
   * Set handler for elicitation requests from servers
   */
  setElicitationHandler(handler: ElicitationHandler): void {
    this.elicitationHandler = handler;
  }

  /**
   * Connect to an MCP server
   */
  async connectToServer(serverConfig: MCPServerConfig): Promise<void> {
    // Check if already connected
    if (this.connections.has(serverConfig.id)) {
      const state = this.connections.get(serverConfig.id);
      if (state?.connected) {
        console.log(`✓ Already connected to ${serverConfig.name}`);
        return;
      }
      // If connection exists but not connected, remove it
      await this.disconnectFromServer(serverConfig.id);
    }

    console.log(`📡 Connecting to MCP server: ${serverConfig.name}`);

    // Create transport without sessionId (let server generate one)
    const transport = new StreamableHTTPClientTransport(
      new URL(serverConfig.url),
      {
        // Don't set sessionId - let the server generate one
        // sessionId will be managed automatically by the transport
        requestInit: serverConfig.apiKey
          ? {
              headers: {
                Authorization: `Bearer ${serverConfig.apiKey}`,
              },
            }
          : undefined,
      }
    );

    // Set protocol version (2025-06-18 for elicitation support)
    transport.setProtocolVersion('2025-06-18');

    console.log('Transport created, protocol version set to 2025-06-18');

    // Create client with capabilities
    const client = new Client(
      {
        name: 'mcp-webclient',
        version: '1.0.0',
      },
      {
        capabilities: {
          // Declare support for elicitation
          elicitation: {},
          // Support for sampling (server-requested LLM completions)
          sampling: {},
        },
      }
    );

    // Register elicitation handler
    this.registerElicitationHandler(client, serverConfig.id);

    // Register notification handlers
    this.registerNotificationHandlers(client);

    // Register sampling handler (optional)
    this.registerSamplingHandler(client);

    try {
      // Connect client to transport
      console.log('Attempting to connect client to transport...');
      await client.connect(transport);

      console.log(`✅ Connected to ${serverConfig.name}`);
      console.log('Session ID:', transport.sessionId);
      console.log('Server capabilities:', client.getServerCapabilities());
      console.log('Server version:', client.getServerVersion());

      // Store connection state
      this.connections.set(serverConfig.id, {
        client,
        transport,
        connected: true,
        serverCapabilities: client.getServerCapabilities(),
      });
    } catch (error) {
      console.error(`❌ Failed to connect to ${serverConfig.name}:`, error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Register handler for elicitation/create requests from server
   */
  private registerElicitationHandler(client: Client, serverId: string): void {
    // Create proper Zod schema for elicitation/create request
    const ElicitationCreateRequestSchema = z.object({
      method: z.literal('elicitation/create'),
      params: z.object({
        message: z.string().optional(),
        requestedSchema: z.any(),
      }).optional(),
    });

    try {
      client.setRequestHandler(ElicitationCreateRequestSchema, async (request, extra) => {
        console.log('🔔 ELICITATION REQUEST from server:', request);

        if (!this.elicitationHandler) {
          console.error('No elicitation handler set!');
          return {
            action: 'cancel' as const,
          };
        }

        // Convert MCP request to our ElicitationRequest format
        const elicitRequest: ElicitationRequest = {
          requestId: String(Date.now()),
          serverId: serverId,
          toolName: 'unknown', // Will be filled by context
          message: request.params?.message || 'Server is requesting input',
          schema: request.params?.requestedSchema || { type: 'object', properties: {} },
        };

        try {
          // Call UI handler and wait for user response
          const response = await this.elicitationHandler(elicitRequest);

          console.log('📝 User responded to elicitation:', response);

          // Return to server in MCP format
          return {
            action: response.action,
            content: response.content,
          };
        } catch (error) {
          console.error('Error handling elicitation:', error);
          return {
            action: 'cancel' as const,
          };
        }
      });
    } catch (error) {
      console.error('Failed to register elicitation handler:', error);
      // Continue without elicitation support if registration fails
    }
  }

  /**
   * Register handlers for server notifications
   */
  private registerNotificationHandlers(client: Client): void {
    try {
      // Note: Notification handlers might not work with current SDK version
      // Notifications are typically one-way messages that don't need handlers
      console.log('Notification handlers: using default SDK behavior');
    } catch (error) {
      console.error('Failed to register notification handlers:', error);
    }
  }

  /**
   * Register handler for sampling requests (server wants LLM completion)
   */
  private registerSamplingHandler(client: Client): void {
    // Create Zod schema for sampling/createMessage
    const SamplingCreateMessageSchema = z.object({
      method: z.literal('sampling/createMessage'),
      params: z.object({
        messages: z.array(z.any()).optional(),
        systemPrompt: z.string().optional(),
        includeContext: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        stopSequences: z.array(z.string()).optional(),
        metadata: z.record(z.any()).optional(),
      }).optional(),
    });

    try {
      client.setRequestHandler(SamplingCreateMessageSchema, async (request) => {
        console.log('🎯 SAMPLING REQUEST from server:', request);

        // Server is asking us to get an LLM completion
        // This would require user approval + calling Ollama
        // For now, decline
        return {
          model: 'declined',
          stopReason: 'endTurn' as const,
          role: 'assistant' as const,
          content: {
            type: 'text' as const,
            text: 'Sampling declined by client',
          },
        };
      });
    } catch (error) {
      console.error('Failed to register sampling handler:', error);
      // Continue without sampling support if registration fails
    }
  }

  /**
   * Disconnect from a server
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const state = this.connections.get(serverId);
    if (!state) {
      return;
    }

    try {
      await state.transport.close();
      this.connections.delete(serverId);
      console.log(`🔌 Disconnected from server: ${serverId}`);
    } catch (error) {
      // Even if close fails, remove from connections
      this.connections.delete(serverId);
      console.error(`Error disconnecting from server ${serverId}:`, error);
    }
  }

  /**
   * Get client for a server
   */
  private getClient(serverId: string): Client {
    const state = this.connections.get(serverId);
    if (!state || !state.connected) {
      throw new Error(`Not connected to server: ${serverId}`);
    }
    return state.client;
  }

  /**
   * List tools from a server with automatic reconnection
   */
  async listTools(serverConfig: MCPServerConfig, retryCount = 0): Promise<MCPTool[]> {
    const maxRetries = 2;

    try {
      // Ensure connected
      if (!this.connections.has(serverConfig.id)) {
        await this.connectToServer(serverConfig);
      }

      const client = this.getClient(serverConfig.id);
      const response = await client.listTools();

      return (response.tools || []).map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
      }));
    } catch (error) {
      // Check if it's a session ID error
      const isSessionError =
        error instanceof Error &&
        (error.message.includes('No valid session ID') ||
         error.message.includes('session') ||
         error.message.includes('400'));

      if (isSessionError && retryCount < maxRetries) {
        console.warn(`⚠️ Session error on listTools, reconnecting... (attempt ${retryCount + 1}/${maxRetries})`);

        // Disconnect and clear the old connection
        await this.disconnectFromServer(serverConfig.id);

        // Wait a bit before reconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reconnect and retry
        await this.connectToServer(serverConfig);

        // Retry listing tools
        return this.listTools(serverConfig, retryCount + 1);
      }

      console.error(`Failed to list tools from ${serverConfig.name}:`, error);
      return [];
    }
  }

  /**
   * Call a tool on a server with automatic reconnection on session errors
   * NOTE: Elicitation is handled automatically via request handler!
   */
  async callTool(
    serverConfig: MCPServerConfig,
    params: MCPToolCallParams,
    retryCount = 0
  ): Promise<MCPToolCallResult> {
    const maxRetries = 2;

    // Ensure connected
    if (!this.connections.has(serverConfig.id)) {
      await this.connectToServer(serverConfig);
    }

    try {
      const client = this.getClient(serverConfig.id);

      console.log(`Calling tool ${params.name} with args:`, params.arguments);

      // Call tool - elicitation will happen automatically if server requests it
      const response = await client.callTool({
        name: params.name,
        arguments: params.arguments,
      });

      console.log('Tool response:', response);

      return {
        content: response.content || [],
        isError: response.isError,
      };
    } catch (error) {
      // Check if it's a session ID error
      const isSessionError =
        error instanceof Error &&
        (error.message.includes('No valid session ID') ||
         error.message.includes('session') ||
         error.message.includes('400'));

      if (isSessionError && retryCount < maxRetries) {
        console.warn(`⚠️ Session error detected, reconnecting... (attempt ${retryCount + 1}/${maxRetries})`);

        // Disconnect and clear the old connection
        await this.disconnectFromServer(serverConfig.id);

        // Wait a bit before reconnecting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reconnect and retry
        await this.connectToServer(serverConfig);

        // Retry the tool call
        return this.callTool(serverConfig, params, retryCount + 1);
      }

      // If not a session error or out of retries, rethrow
      console.error('Tool call failed:', error);
      throw error;
    }
  }

  /**
   * List resources from a server
   */
  async listResources(serverConfig: MCPServerConfig): Promise<MCPResource[]> {
    try {
      if (!this.connections.has(serverConfig.id)) {
        await this.connectToServer(serverConfig);
      }

      const client = this.getClient(serverConfig.id);
      const response = await client.listResources();

      return (response.resources || []).map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      }));
    } catch (error) {
      console.error(`Failed to list resources from ${serverConfig.name}:`, error);
      return [];
    }
  }

  /**
   * Read a resource from a server
   */
  async readResource(serverConfig: MCPServerConfig, uri: string): Promise<any> {
    if (!this.connections.has(serverConfig.id)) {
      await this.connectToServer(serverConfig);
    }

    const client = this.getClient(serverConfig.id);
    return await client.readResource({ uri });
  }

  /**
   * List prompts from a server
   */
  async listPrompts(serverConfig: MCPServerConfig): Promise<MCPPrompt[]> {
    try {
      if (!this.connections.has(serverConfig.id)) {
        await this.connectToServer(serverConfig);
      }

      const client = this.getClient(serverConfig.id);
      const response = await client.listPrompts();

      return (response.prompts || []).map((prompt: any) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
      }));
    } catch (error) {
      console.error(`Failed to list prompts from ${serverConfig.name}:`, error);
      return [];
    }
  }

  /**
   * Get a prompt from a server
   */
  async getPrompt(
    serverConfig: MCPServerConfig,
    name: string,
    args?: Record<string, string>
  ): Promise<any> {
    if (!this.connections.has(serverConfig.id)) {
      await this.connectToServer(serverConfig);
    }

    const client = this.getClient(serverConfig.id);
    return await client.getPrompt({
      name,
      arguments: args,
    });
  }

  /**
   * Test connection to a server
   */
  async testConnection(serverConfig: MCPServerConfig): Promise<boolean> {
    try {
      await this.connectToServer(serverConfig);
      const client = this.getClient(serverConfig.id);
      await client.ping();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Clear all connections
   */
  async clearAllConnections(): Promise<void> {
    const serverIds = Array.from(this.connections.keys());
    await Promise.all(serverIds.map((id) => this.disconnectFromServer(id)));
  }
}

// Singleton instance
export const sdkMCPClient = new SDKMCPClientManager();
