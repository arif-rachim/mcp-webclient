/**
 * Shared TypeScript types for the application
 */

import type { OllamaToolFunction, OllamaToolCall, ElicitationRequest, ElicitationResponse } from './mcp/types';

// Chat message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  thinking?: string; // AI's internal reasoning process (Ollama thinking mode)
  tool_calls?: OllamaToolCall[];
  tool_name?: string; // For tool role messages - identifies which tool this result is for

  // Elicitation support - for tools requesting user input
  elicitationRequest?: ElicitationRequest; // Server's request for user input
  elicitationResponse?: ElicitationResponse; // User's response to the elicitation
}

// Ollama API types
export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string; // AI's internal reasoning process (Ollama thinking mode)
  tool_calls?: OllamaToolCall[];
  tool_name?: string; // For tool role messages - identifies which tool this result is for
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  tools?: OllamaToolFunction[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    thinking?: string; // AI's internal reasoning process (Ollama thinking mode)
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Chat state
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

// API response types
export interface ApiError {
  error: string;
  message?: string;
}
