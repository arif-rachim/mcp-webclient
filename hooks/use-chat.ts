/**
 * Chat Hook
 * Manages chat state and handles streaming from Ollama
 * Custom implementation with markdown, animation, and MCP tool calling support
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useMCP } from './use-mcp';
import type { Message, OllamaToolCall } from '@/lib/types';
import type { ElicitationRequest, ElicitationResponse } from '@/lib/mcp/types';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Elicitation state - for tools requesting user input
  const [pendingElicitation, setPendingElicitation] = useState<{
    messageId: string;
    request: ElicitationRequest;
    resolver: (response: ElicitationResponse) => void;
  } | null>(null);

  // Get MCP tools for function calling
  const { getToolsForOllama, executeTool } = useMCP();

  const sendMessage = useCallback(async (content: string, model: string = 'gpt-oss:20b-cloud') => {
    if (!content.trim()) return;

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Get MCP tools for function calling
    const tools = getToolsForOllama();

    // Format tools as readable list - extract only first line to avoid multi-line descriptions breaking the prompt
    const toolsList = tools.length > 0
      ? tools.map(tool => {
          // Extract only the first line of description (before any newlines/Args)
          const firstLine = tool.function.description.split('\n')[0].trim();
          return `  • ${tool.function.name}: ${firstLine}`;
        }).join('\n')
      : '  [No tools currently available]';

    // Create comprehensive system prompt with dynamic tool listing
    // This is created fresh for EVERY request to ensure consistent context
    const systemPrompt = `You are an expert AI assistant with access to external tools.

AVAILABLE TOOLS:
${toolsList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL USAGE GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Analyze if tools are needed (many questions don't need tools)
2. Use appropriate tools with correct parameters
3. Verify results make sense
4. Handle errors gracefully with alternatives

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMATTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Response Structure:**
- Start with the direct answer or result
- Add brief explanation if helpful
- Include next steps if relevant

**Tool Communication:**
- Simple tasks: Present results directly ("Created file.txt")
- Complex tasks: Brief updates ("Setting up... ✓ Done")
- Don't over-explain tool mechanics

**Formatting:**
- Use **bold** for key points
- Use \`code blocks\` with language specification
- Use bullet points for lists (keep brief)
- Use numbered lists for steps
- Keep responses concise but complete

**Examples:**

User: "What is 2+2?"
Good: "2+2 equals 4."
Bad: "Let me calculate that for you. Using my mathematical capabilities, I can determine that 2+2 equals 4. This is a basic addition operation."

User: "Create test.txt with 'Hello'"
Good: "Created test.txt with 'Hello'."
Bad: "I'll use the create_file tool to create a file named test.txt. Executing tool... Success! The file test.txt has been created with the content 'Hello'."

User: "How do I sort a list in Python?"
Good: "Use the \`sort()\` method:
\`\`\`python
numbers = [3, 1, 4, 1, 5]
numbers.sort()  # [1, 1, 3, 4, 5]
\`\`\`
Or \`sorted()\` to keep original unchanged."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remember: Be helpful, clear, and concise. Focus on what the user needs.`;

    // Create system message (ephemeral - not stored in React state)
    const systemMessage: Message = {
      id: 'system-prompt',
      role: 'system',
      content: systemPrompt,
      createdAt: new Date(),
    };

    // Always start with system message, then conversation history, then new user message
    // This ensures every request to Ollama has the system context
    let currentMessages = [systemMessage, ...messages, userMessage];

    console.log('📋 Building context: system + ', messages.length, ' history messages + 1 new user message');

    // Agent loop: allow multiple rounds of tool calling
    let maxIterations = 5; // Prevent infinite loops
    let iteration = 0;

    try {
      while (iteration < maxIterations) {
        iteration++;

        // Create a new assistant message for each iteration
        // This prevents gibberish from accumulating across tool calling rounds
        const assistantMessageId = `${Date.now()}-assistant-${iteration}`;
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          thinking: '',
          createdAt: new Date(),
        };

        // Add new assistant message to UI
        setMessages((prev) => [...prev, assistantMessage]);

        // Prepare request with tools
        const ollamaMessages = currentMessages.map((msg) => {
          // For tool role messages, ONLY send role and content (Ollama requirement)
          if (msg.role === 'tool') {
            return {
              role: msg.role,
              content: msg.content,
            };
          }

          // For other messages, include thinking and tool_calls if present
          return {
            role: msg.role,
            content: msg.content,
            thinking: msg.thinking,
            tool_calls: msg.tool_calls,
          };
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📤 REQUEST TO OLLAMA - Iteration ${iteration}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Model:', model);
        console.log('Message Count:', ollamaMessages.length);
        console.log('Tools Available:', tools.length);
        console.log('\n📝 FULL MESSAGE PAYLOAD:');
        console.log(JSON.stringify(ollamaMessages, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: ollamaMessages,
            model: model,
            tools: tools.length > 0 ? tools : undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get complete JSON response (non-streaming)
        const data = await response.json();

        console.log('📥 Received complete response:', JSON.stringify(data, null, 2));

        // Update assistant message with complete content
        assistantMessage.content = data.message.content || '';
        assistantMessage.thinking = data.message.thinking || '';
        const toolCalls = data.message.tool_calls || null;

        if (assistantMessage.thinking) {
          console.log('💭 Thinking received:', assistantMessage.thinking);
        }

        if (toolCalls) {
          assistantMessage.tool_calls = toolCalls;
          console.log('🔧 Tool calls received:', toolCalls);
        }

        // Update UI state with complete message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: assistantMessage.content,
                  thinking: assistantMessage.thinking,
                  tool_calls: assistantMessage.tool_calls
                }
              : msg
          )
        );

        // Add the assistant message to currentMessages for next iteration
        currentMessages = [...currentMessages, assistantMessage];

        console.log('✅ Added assistant message to context. Current context:',
          currentMessages.map(m => `${m.role}(${m.content?.slice(0, 20)}...)`).join(' → '));

        // Check if tool calls were made
        if (toolCalls && toolCalls.length > 0) {
          console.log(`Executing ${toolCalls.length} tool(s)...`);

          // Execute all tool calls
          const toolResultsPromises = toolCalls.map(async (toolCall) => {
            try {
              // Handle arguments - could be string (JSON) or already parsed object
              const args = typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments;

              // Elicitation handler - pauses execution and waits for user input
              const handleElicitation = async (elicitRequest: ElicitationRequest): Promise<ElicitationResponse> => {
                console.log('🔔 Tool requesting user input:', elicitRequest);

                // Create elicitation message to display in UI
                const elicitMessageId = `${Date.now()}-elicit`;
                const elicitMessage: Message = {
                  id: elicitMessageId,
                  role: 'assistant',
                  content: '', // No content, just elicitation form
                  elicitationRequest: elicitRequest,
                  createdAt: new Date(),
                };

                // Add elicitation message to UI
                setMessages((prev) => [...prev, elicitMessage]);

                // Wait for user response via Promise
                return new Promise<ElicitationResponse>((resolve) => {
                  setPendingElicitation({
                    messageId: elicitMessageId,
                    request: elicitRequest,
                    resolver: resolve,
                  });
                });
              };

              const result = await executeTool(
                toolCall.function.name,
                args,
                handleElicitation
              );

              return {
                tool_call_id: toolCall.id || `tool-${Date.now()}`,
                name: toolCall.function.name,
                result,
              };
            } catch (error) {
              console.error(`Error executing tool ${toolCall.function.name}:`, error);
              return {
                tool_call_id: toolCall.id || `tool-${Date.now()}`,
                name: toolCall.function.name,
                result: { error: error instanceof Error ? error.message : 'Tool execution failed' },
              };
            }
          });

          const toolResults = await Promise.all(toolResultsPromises);
          console.log('✅ Tool execution completed:', toolResults);

          // Create one message per tool result (Ollama expects separate messages)
          const toolResultMessages: Message[] = toolResults.map((toolResult, index) => {
            // Format result content as string - extract text from MCP result format
            let resultContent: string;

            if (typeof toolResult.result === 'string') {
              resultContent = toolResult.result;
            } else if (toolResult.result && typeof toolResult.result === 'object') {
              // Check if it's MCPToolCallResult format with content array
              if (Array.isArray(toolResult.result.content)) {
                // Extract text from content array
                const textContent = toolResult.result.content
                  .filter((item: any) => item.type === 'text' && item.text)
                  .map((item: any) => item.text)
                  .join('\n');
                resultContent = textContent || JSON.stringify(toolResult.result);
              } else {
                // Fallback: stringify the object
                resultContent = JSON.stringify(toolResult.result);
              }
            } else {
              resultContent = String(toolResult.result);
            }

            return {
              id: `${Date.now()}-tool-${index}`,
              role: 'tool' as const,
              content: resultContent,
              tool_name: toolResult.name, // Add tool_name for Ollama to match results to calls
              createdAt: new Date(),
            };
          });

          console.log('📤 Sending tool results to Ollama:', toolResultMessages);

          setMessages((prev) => [...prev, ...toolResultMessages]);
          currentMessages = [...currentMessages, ...toolResultMessages];

          console.log('📤 Added tool results to context. Will continue to iteration', iteration + 1);

          // Continue loop to get final answer with tool results
          continue;
        }

        // No tool calls, we're done
        break;
      }

      if (iteration >= maxIterations) {
        console.warn('Max tool calling iterations reached');
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          console.error('Error sending message:', err);
          setError(err.message);
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, getToolsForOllama, executeTool]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  // Handle elicitation response from user
  const handleElicitationResponse = useCallback((response: ElicitationResponse) => {
    if (!pendingElicitation) {
      console.warn('No pending elicitation to respond to');
      return;
    }

    console.log('📝 User responded to elicitation:', response);

    // Update the elicitation message with the response
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === pendingElicitation.messageId
          ? { ...msg, elicitationResponse: response }
          : msg
      )
    );

    // Resolve the Promise to resume tool execution
    pendingElicitation.resolver(response);

    // Clear pending elicitation
    setPendingElicitation(null);
  }, [pendingElicitation]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
    pendingElicitation,
    handleElicitationResponse,
  };
}
