/**
 * MCP Hook
 * React hook for managing MCP server connections and tools
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { sdkMCPClient } from '@/lib/mcp/sdk-client';
import { formatToolsForOllama } from '@/lib/mcp/tool-formatter';
import type { MCPServerConfig, MCPTool, OllamaToolFunction, ElicitationRequest, ElicitationResponse } from '@/lib/mcp/types';

const MCP_STORAGE_KEY = 'mcp-servers';

export function useMCP() {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [allTools, setAllTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load servers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MCP_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setServers(parsed);
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  }, []);

  // Save servers to localStorage
  const saveServers = useCallback((newServers: MCPServerConfig[]) => {
    try {
      localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(newServers));
      setServers(newServers);
    } catch (error) {
      console.error('Failed to save MCP servers:', error);
      setError('Failed to save server configuration');
    }
  }, []);

  // Add a new server
  const addServer = useCallback(
    (server: Omit<MCPServerConfig, 'id' | 'connected'>) => {
      const newServer: MCPServerConfig = {
        ...server,
        id: `mcp-${Date.now()}`,
        connected: false,
      };
      saveServers([...servers, newServer]);
    },
    [servers, saveServers]
  );

  // Remove a server
  const removeServer = useCallback(
    (serverId: string) => {
      sdkMCPClient.disconnectFromServer(serverId);
      saveServers(servers.filter((s) => s.id !== serverId));
      // Refresh tools after removing server
      refreshTools();
    },
    [servers, saveServers]
  );

  // Update a server
  const updateServer = useCallback(
    (serverId: string, updates: Partial<MCPServerConfig>) => {
      saveServers(
        servers.map((s) => (s.id === serverId ? { ...s, ...updates } : s))
      );
    },
    [servers, saveServers]
  );

  // Test server connection
  const testConnection = useCallback(async (server: MCPServerConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const isConnected = await sdkMCPClient.testConnection(server);
      return isConnected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Discover tools from all enabled servers
  const refreshTools = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const enabledServers = servers.filter((s) => s.enabled);
    if (enabledServers.length === 0) {
      setAllTools([]);
      setIsLoading(false);
      return;
    }

    try {
      const toolPromises = enabledServers.map((server) =>
        sdkMCPClient.listTools(server).catch((error) => {
          console.error(`Failed to load tools from ${server.name}:`, error);
          return [];
        })
      );

      const toolsArrays = await Promise.all(toolPromises);
      const combinedTools = toolsArrays.flat();

      setAllTools(combinedTools);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh tools';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [servers]);

  // Get tools in Ollama format
  const getToolsForOllama = useCallback((): OllamaToolFunction[] => {
    return formatToolsForOllama(allTools);
  }, [allTools]);

  // Execute a tool call with elicitation support
  const executeTool = useCallback(
    async (
      toolName: string,
      args: Record<string, any>,
      onElicitationNeeded?: (request: ElicitationRequest) => Promise<ElicitationResponse>
    ): Promise<any> => {
      // Find which server has this tool
      const enabledServers = servers.filter((s) => s.enabled);

      for (const server of enabledServers) {
        try {
          const serverTools = await sdkMCPClient.listTools(server);
          const tool = serverTools.find((t) => t.name === toolName);

          if (tool) {
            // Set elicitation handler if provided
            if (onElicitationNeeded) {
              sdkMCPClient.setElicitationHandler(onElicitationNeeded);
            }

            // Call the tool - SDK client handles elicitation automatically
            const result = await sdkMCPClient.callTool(server, {
              name: toolName,
              arguments: args,
            });

            return result;
          }
        } catch (error) {
          console.error(`Failed to execute tool ${toolName} on ${server.name}:`, error);
          throw error; // Re-throw so caller can handle
        }
      }

      throw new Error(`Tool "${toolName}" not found on any enabled MCP server`);
    },
    [servers]
  );

  // Auto-refresh tools when servers change
  useEffect(() => {
    const enabledServers = servers.filter((s) => s.enabled);
    if (enabledServers.length > 0) {
      refreshTools();
    } else {
      setAllTools([]);
    }
  }, [servers, refreshTools]);

  return {
    servers,
    allTools,
    isLoading,
    error,
    addServer,
    removeServer,
    updateServer,
    testConnection,
    refreshTools,
    getToolsForOllama,
    executeTool,
  };
}
