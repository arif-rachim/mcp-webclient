/**
 * Suggested Prompts Component
 * Displays clickable prompt suggestions
 */

'use client';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const prompts = [
  { icon: '✏️', label: 'Write', prompt: 'Help me write a professional email' },
  { icon: '🎓', label: 'Learn', prompt: 'Explain quantum computing in simple terms' },
  { icon: '💻', label: 'Code', prompt: 'Help me debug this TypeScript error' },
  { icon: '☕', label: 'Life stuff', prompt: 'Give me advice on work-life balance' },
  { icon: '💡', label: "Claude's choice", prompt: 'Surprise me with an interesting fact' },
];

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {prompts.map((prompt) => (
        <button
          key={prompt.label}
          onClick={() => onSelectPrompt(prompt.prompt)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span>{prompt.icon}</span>
          <span>{prompt.label}</span>
        </button>
      ))}
    </div>
  );
}
