/**
 * Model Selector Component
 * Icon-only dropdown to select Ollama model
 */

'use client';

import { useState } from 'react';
import { IoSparkles } from 'react-icons/io5';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const availableModels = [
  { id: 'gpt-oss:20b-cloud', name: 'GPT-OSS 20B' },
  { id: 'llama3.2', name: 'Llama 3.2' },
  { id: 'llama3.1', name: 'Llama 3.1' },
  { id: 'phi3', name: 'Phi-3' },
  { id: 'gemma:2b', name: 'Gemma 2B' },
  { id: 'tinyllama', name: 'TinyLlama' },
];

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentModel = availableModels.find((m) => m.id === selectedModel) || availableModels[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
        title={currentModel.name}
      >
        <IoSparkles className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-gray-300 rounded-lg shadow-xl z-20">
            {availableModels.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                  model.id === selectedModel ? 'bg-gray-100 font-medium' : ''
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
