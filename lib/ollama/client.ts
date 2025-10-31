/**
 * Ollama Client Wrapper
 * Provides a simple interface for interacting with Ollama
 */

import { Ollama } from 'ollama';
import { config } from '../config';
import type { OllamaChatRequest, OllamaChatResponse } from '../types';

// Create Ollama client instance
export const ollama = new Ollama({
  host: config.ollama.apiUrl,
});

/**
 * Get complete chat response from Ollama (non-streaming)
 * @param request Chat request parameters
 * @returns Complete chat response
 */
export async function chatComplete(request: OllamaChatRequest): Promise<OllamaChatResponse> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 OLLAMA CLIENT - Non-streaming request');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Model:', request.model);
    console.log('Messages:', request.messages.length);
    console.log('Tools:', request.tools?.length || 0);
    console.log('\n📝 MESSAGES TO OLLAMA:');
    console.log(JSON.stringify(request.messages, null, 2));

    const response = await ollama.chat({
      model: request.model,
      messages: request.messages,
      stream: false, // Non-streaming
      tools: request.tools,
      options: {
        ...request.options,
        think: true, // Enable thinking mode for reasoning display
      },
    });

    console.log('\n🔵 Complete response from Ollama:');
    console.log(JSON.stringify(response, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return response as OllamaChatResponse;
  } catch (error) {
    console.error('Ollama error:', error);
    throw error;
  }
}

/**
 * Stream chat completion from Ollama
 * @param request Chat request parameters
 * @returns AsyncGenerator that yields response chunks
 */
export async function* streamChat(request: OllamaChatRequest) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 OLLAMA CLIENT - Sending to Ollama');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Model:', request.model);
    console.log('Stream:', request.stream);
    console.log('Tools:', request.tools?.length || 0);
    console.log('\n📝 MESSAGES TO OLLAMA:');
    console.log(JSON.stringify(request.messages, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response = await ollama.chat({
      model: request.model,
      messages: request.messages,
      stream: true,
      tools: request.tools, // Pass tools for function calling
      options: request.options,
    });

    let chunkCount = 0;
    for await (const chunk of response) {
      chunkCount++;
      if (chunkCount === 1) {
        console.log('🔵 First chunk from Ollama:', JSON.stringify(chunk, null, 2));
      }
      yield chunk as OllamaChatResponse;
    }
    console.log('🔵 Ollama streaming complete. Total chunks:', chunkCount);
  } catch (error) {
    console.error('Ollama streaming error:', error);
    throw error;
  }
}

/**
 * Get list of available models
 * @returns Array of model names
 */
export async function listModels() {
  try {
    const response = await ollama.list();
    return response.models;
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
}

/**
 * Check if Ollama is running and accessible
 * @returns true if Ollama is accessible
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    await ollama.list();
    return true;
  } catch (error) {
    console.error('Ollama health check failed:', error);
    return false;
  }
}

/**
 * Get default model (uses first available model or 'llama3.1')
 */
export async function getDefaultModel(): Promise<string> {
  try {
    const models = await listModels();
    if (models && models.length > 0) {
      return models[0].name;
    }
    return 'llama3.1'; // fallback
  } catch (error) {
    console.error('Error getting default model:', error);
    return 'llama3.1'; // fallback
  }
}
