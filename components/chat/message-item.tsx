/**
 * Message Item Component
 * Individual message with avatar, markdown rendering, tool calls, and animations
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ElicitationPrompt } from './elicitation-prompt';
import type { Message } from '@/lib/types';
import type { ElicitationResponse } from '@/lib/mcp/types';
import { IoCheckmarkCircle, IoCodeSlash, IoChevronDown, IoChevronUp } from 'react-icons/io5';

interface MessageItemProps {
  message: Message;
  onElicitationResponse?: (response: ElicitationResponse) => void;
}

export function MessageItem({ message, onElicitationResponse }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  // User messages
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex items-center gap-3"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: '#1A1A1A' }}>
          AA
        </div>
        <div className="flex-1 max-w-[85%] px-3 py-2 rounded-lg break-words overflow-hidden" style={{ backgroundColor: 'var(--card-background)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)', color: 'var(--foreground)' }}>
          <MarkdownRenderer content={message.content} />
        </div>
      </motion.div>
    );
  }

  // Tool result messages (hidden from UI, used for context)
  if (isTool) {
    return null;
  }

  // Track which section is expanded ('thinking', 'response', or 'tool-{index}')
  // Only for assistant messages
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Check if this is an empty assistant message (loading state)
  const isEmptyAssistant = message.role === 'assistant' && !message.content && !message.thinking && !message.elicitationRequest;

  // Check if there are any metadata sections to display
  const hasMetadata = message.thinking || (message.tool_calls && message.tool_calls.length > 0);

  // Assistant messages
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-start"
    >
      <div className="flex-1 min-w-0 break-words overflow-hidden" style={{ color: 'var(--foreground)' }}>
        {/* Loading indicator for empty assistant messages */}
        {isEmptyAssistant && (
          <div className="flex items-center gap-1.5 mt-3">
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
        )}
        {/* Elicitation Prompt - Show if server is requesting input */}
        {message.elicitationRequest && onElicitationResponse && !message.elicitationResponse && (
          <ElicitationPrompt
            request={message.elicitationRequest}
            onResponse={onElicitationResponse}
          />
        )}

        {/* Horizontal metadata badges (Reasoning, Tool Calls, Response) */}
        {hasMetadata && (
          <div className="mb-2">
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
              {/* Reasoning badge */}
              {message.thinking && (
                <button
                  onClick={() => toggleSection('thinking')}
                  className="flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: expandedSection === 'thinking' ? 'var(--code-background)' : 'transparent',
                    color: 'var(--text-secondary)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  {expandedSection === 'thinking' ? <IoChevronUp className="w-3 h-3" /> : <IoChevronDown className="w-3 h-3" />}
                  <span>Reasoning</span>
                </button>
              )}

              {/* Tool calls badges */}
              {message.tool_calls && message.tool_calls.map((toolCall, index) => (
                <button
                  key={index}
                  onClick={() => toggleSection(`tool-${index}`)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: expandedSection === `tool-${index}` ? 'var(--code-background)' : 'transparent',
                    color: 'var(--text-secondary)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  {expandedSection === `tool-${index}` ? <IoChevronUp className="w-3 h-3" /> : <IoCodeSlash className="w-3 h-3" />}
                  <span>{toolCall.function.name}</span>
                  <span className="text-[10px]">({Object.keys(toolCall.function.arguments || {}).length} args)</span>
                  <IoCheckmarkCircle className="w-3 h-3" style={{ color: '#16A34A' }} />
                </button>
              ))}

            </div>

            {/* Expanded content - shows below the badges */}
            <AnimatePresence>
              {expandedSection === 'thinking' && message.thinking && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 rounded text-xs" style={{ backgroundColor: 'var(--code-background)', color: 'var(--text-secondary)' }}>
                    <MarkdownRenderer content={message.thinking} />
                  </div>
                </motion.div>
              )}

              {message.tool_calls && message.tool_calls.map((toolCall, index) => (
                expandedSection === `tool-${index}` && (
                  <motion.div
                    key={index}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded text-xs" style={{ backgroundColor: 'var(--code-background)', color: 'var(--text-secondary)' }}>
                      <div className="font-medium mb-2">Arguments:</div>
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {JSON.stringify(toolCall.function.arguments, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Message Content */}
        {message.content && (
          <div>
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
