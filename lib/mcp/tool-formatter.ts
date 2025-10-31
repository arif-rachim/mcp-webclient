/**
 * MCP Tool Formatter
 * Converts MCP tool schemas to Ollama/OpenAI function format
 */

import type { MCPTool, OllamaToolFunction } from './types';

/**
 * Convert MCP tool to Ollama function format
 */
export function formatToolForOllama(mcpTool: MCPTool): OllamaToolFunction {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: {
        type: 'object',
        properties: mcpTool.inputSchema.properties,
        required: mcpTool.inputSchema.required || [],
      },
    },
  };
}

/**
 * Convert array of MCP tools to Ollama format
 */
export function formatToolsForOllama(mcpTools: MCPTool[]): OllamaToolFunction[] {
  return mcpTools.map(formatToolForOllama);
}

/**
 * Parse tool call arguments from JSON string
 */
export function parseToolArguments(argsString: string): Record<string, any> {
  try {
    return JSON.parse(argsString);
  } catch (error) {
    console.error('Failed to parse tool arguments:', error);
    return {};
  }
}

/**
 * Format tool result for display
 */
export function formatToolResult(result: any): string {
  if (typeof result === 'string') {
    return result;
  }

  if (result.content && Array.isArray(result.content)) {
    return result.content
      .map((item: any) => {
        if (item.type === 'text') {
          return item.text;
        }
        return JSON.stringify(item);
      })
      .join('\n');
  }

  return JSON.stringify(result, null, 2);
}
