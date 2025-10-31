/**
 * Chat API Route - Streams responses from Ollama
 * Compatible with Vercel AI SDK's useChat hook
 * Supports MCP tool calling
 */

import { NextRequest } from 'next/server';
import { chatComplete } from '@/lib/ollama/client';
import type { OllamaMessage, OllamaToolFunction } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  messages: OllamaMessage[];
  model?: string;
  tools?: OllamaToolFunction[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, model = 'gpt-oss:20b-cloud', tools } = body;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 API ROUTE RECEIVED REQUEST (Non-streaming mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Model:', model);
    console.log('Messages:', messages.length);
    console.log('Tools:', tools?.length || 0);
    console.log('\n📝 FULL MESSAGES ARRAY:');
    console.log(JSON.stringify(messages, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!messages || messages.length === 0) {
      return Response.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Get complete response (no streaming)
    const response = await chatComplete({
      model,
      messages,
      stream: false,
      tools,
    });

    console.log('✅ Returning complete response to browser\n');

    // Return complete response as JSON
    return Response.json({
      message: response.message,
      done: response.done,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
