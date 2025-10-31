'use client';

import { useState } from 'react';
import { useChat } from '@/hooks/use-chat';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Greeting } from '@/components/greeting';
import { MCPSettingsModal } from '@/components/mcp-settings-modal';

export default function Home() {
  const { messages, isLoading, error, sendMessage, clearMessages, handleElicitationResponse } = useChat();
  const [selectedModel, setSelectedModel] = useState('gpt-oss:20b-cloud');
  const [isMCPSettingsOpen, setIsMCPSettingsOpen] = useState(false);

  const hasMessages = messages.length > 0;

  const handleSendMessage = (content: string) => {
    sendMessage(content, selectedModel);
  };

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {!hasMessages ? (
          /* Empty State - Centered Greeting */
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
            <Greeting />
            <div className="w-full max-w-2xl">
              <MessageInput
                onSend={handleSendMessage}
                disabled={isLoading}
                placeholder="How can I help you today?"
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                onSettingsClick={() => setIsMCPSettingsOpen(true)}
              />
            </div>
          </div>
        ) : (
          /* Chat View - Messages + Input */
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Clear Chat Button - Top Right */}
            <div className="flex justify-end px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-background)' }}>
              <button
                onClick={clearMessages}
                className="px-4 py-1.5 text-sm rounded-lg transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--code-background)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Clear chat
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-auto max-w-3xl w-full px-6 pt-4">
                <div className="p-4 rounded-lg border" style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FCA5A5'
                }}>
                  <p className="text-sm" style={{ color: '#991B1B' }}>
                    <strong>Error:</strong> {error}
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            <MessageList
              messages={messages}
              isLoading={isLoading}
              onElicitationResponse={handleElicitationResponse}
            />

            {/* Input */}
            <div className="border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-background)' }}>
              <div className="max-w-3xl mx-auto px-6 py-4">
                <MessageInput
                  onSend={handleSendMessage}
                  disabled={isLoading}
                  placeholder={isLoading ? 'Generating response...' : 'Type a message...'}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  onSettingsClick={() => setIsMCPSettingsOpen(true)}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MCP Settings Modal */}
      <MCPSettingsModal
        isOpen={isMCPSettingsOpen}
        onClose={() => setIsMCPSettingsOpen(false)}
      />
    </div>
  );
}
