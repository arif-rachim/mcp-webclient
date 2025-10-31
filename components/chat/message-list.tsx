/**
 * Message List Component
 * Displays all messages with animations
 */

'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageItem } from './message-item';
import type { Message } from '@/lib/types';
import type { ElicitationResponse } from '@/lib/mcp/types';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onElicitationResponse?: (response: ElicitationResponse) => void;
}

export function MessageList({ messages, isLoading, onElicitationResponse }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if last message is an empty assistant message
  const lastMessage = messages[messages.length - 1];
  const hasEmptyAssistantMessage = lastMessage?.role === 'assistant' && !lastMessage?.content && !lastMessage?.thinking && !lastMessage?.elicitationRequest;

  // Only show loading indicator if there's no empty assistant message already
  const shouldShowLoadingIndicator = isLoading && !hasEmptyAssistantMessage;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6 min-h-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center min-h-full" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Start a conversation</p>
              <p className="text-sm">Type a message below to begin chatting with the AI assistant.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onElicitationResponse={onElicitationResponse}
              />
            ))}
            {shouldShowLoadingIndicator && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start mt-3"
              >
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--text-secondary)' }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--text-secondary)' }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--text-secondary)' }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
