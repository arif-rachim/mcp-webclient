/**
 * MCP Protocol Type Definitions
 * Based on Model Context Protocol specification
 */

// MCP Server Configuration
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  transport: 'http' | 'stdio';
  enabled: boolean;
  connected?: boolean;
  apiKey?: string;
}

// JSON-RPC 2.0 Base Types
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
  id: number | string;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

// MCP Tool Types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolsListResponse {
  tools: MCPTool[];
}

export interface MCPToolCallParams {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
}

// MCP Resource Types
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourcesListResponse {
  resources: MCPResource[];
}

export interface MCPResourceReadParams {
  uri: string;
}

// MCP Prompt Types
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPPromptsListResponse {
  prompts: MCPPrompt[];
}

// MCP Connection State
export interface MCPConnectionState {
  serverId: string;
  connected: boolean;
  sessionId?: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  error?: string;
}

// Ollama Tool Format (OpenAI-compatible)
export interface OllamaToolFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// Tool Call from Ollama Response
export interface OllamaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// ============================================================================
// MCP Elicitation Types
// ============================================================================

/**
 * Field schema for boolean input
 */
export interface BooleanFieldSchema {
  type: 'boolean';
  title?: string;
  description?: string;
  default?: boolean;
}

/**
 * Field schema for string input
 */
export interface StringFieldSchema {
  type: 'string';
  title?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  format?: 'email' | 'uri' | 'date' | 'date-time';
}

/**
 * Field schema for number/integer input
 */
export interface NumberFieldSchema {
  type: 'number' | 'integer';
  title?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
}

/**
 * Field schema for enum (dropdown) input
 */
export interface EnumFieldSchema {
  type: 'string';
  title?: string;
  description?: string;
  enum: string[];
  enumNames?: string[]; // Display names for enum values
}

/**
 * Union type for all field schemas
 */
export type ElicitationFieldSchema =
  | BooleanFieldSchema
  | StringFieldSchema
  | NumberFieldSchema
  | EnumFieldSchema;

/**
 * Schema for the elicitation request
 */
export interface ElicitationSchema {
  type: 'object';
  properties: Record<string, ElicitationFieldSchema>;
  required?: string[];
}

/**
 * Elicitation request from MCP server
 * Server sends this when it needs user input during tool execution
 */
export interface ElicitationRequest {
  requestId: string; // Unique ID for this elicitation request
  serverId: string; // Which MCP server is requesting
  toolName: string; // Tool that triggered the elicitation
  message: string; // Message to display to user
  schema: ElicitationSchema; // Form fields schema
}

/**
 * Elicitation response from user
 * Client sends this back to the server with user's input
 */
export interface ElicitationResponse {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, unknown>; // User's input (only if action = 'accept')
}

/**
 * MCP Tool Call Result - extended to support pending elicitation
 */
export interface MCPToolPendingResult {
  status: 'pending';
  elicitationRequest: ElicitationRequest;
  sessionId: string;
}

export interface MCPToolCompleteResult {
  status: 'complete';
  result: MCPToolCallResult;
}

export type MCPToolResult = MCPToolPendingResult | MCPToolCompleteResult;
