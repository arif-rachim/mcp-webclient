/**
 * Message Input Component
 * Clean input field with inline controls and model selector
 */

'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import { IoSettings, IoArrowUp } from 'react-icons/io5';
import { ModelSelector } from '@/components/model-selector';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSettingsClick?: () => void;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  selectedModel,
  onModelChange,
  onSettingsClick,
}: MessageInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling

      // Send message directly
      if (input.trim() && !disabled) {
        onSend(input.trim());
        setInput('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-2 rounded-3xl transition-colors px-4 py-3" style={{ backgroundColor: 'var(--card-background)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-color)' }}>
        {/* Settings Button */}
        <button
          type="button"
          onClick={onSettingsClick}
          className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--code-background)';
            e.currentTarget.style.color = 'var(--foreground)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label="MCP Settings"
          title="MCP Settings"
        >
          <IoSettings className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            minHeight: '24px',
            maxHeight: '120px',
            color: 'var(--foreground)',
          }}
        />

        {/* Model Selector */}
        <div className="flex-shrink-0">
          <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="flex-shrink-0 p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: disabled || !input.trim() ? 'var(--code-background)' : 'var(--accent-orange)',
            color: disabled || !input.trim() ? 'var(--text-secondary)' : '#FFFFFF',
            cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!disabled && input.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--accent-orange-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && input.trim()) {
              e.currentTarget.style.backgroundColor = 'var(--accent-orange)';
            }
          }}
          aria-label="Send message"
        >
          <IoArrowUp className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
