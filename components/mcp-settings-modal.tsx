/**
 * MCP Settings Modal
 * UI for managing MCP server connections and tools
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoAdd, IoCheckmark, IoWarning, IoTrash, IoRefresh } from 'react-icons/io5';
import { useMCP } from '@/hooks/use-mcp';
import type { MCPServerConfig } from '@/lib/mcp/types';

interface MCPSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MCPSettingsModal({ isOpen, onClose }: MCPSettingsModalProps) {
  const { servers, allTools, isLoading, addServer, removeServer, updateServer, testConnection, refreshTools } = useMCP();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    url: '',
    transport: 'http' as 'http' | 'stdio',
    enabled: true,
    apiKey: '',
  });

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.url) {
      alert('Please fill in server name and URL');
      return;
    }

    addServer(newServer);
    setNewServer({ name: '', url: '', transport: 'http', enabled: true, apiKey: '' });
    setShowAddForm(false);
  };

  const handleTestConnection = async (server: MCPServerConfig) => {
    const isConnected = await testConnection(server);
    if (isConnected) {
      alert(`Successfully connected to ${server.name}`);
      updateServer(server.id, { connected: true });
    } else {
      alert(`Failed to connect to ${server.name}`);
      updateServer(server.id, { connected: false });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-black">MCP Server Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm text-gray-600">Connected Servers</p>
                <p className="text-2xl font-semibold">{servers.filter((s) => s.enabled).length}</p>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <div>
                <p className="text-sm text-gray-600">Available Tools</p>
                <p className="text-2xl font-semibold">{allTools.length}</p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => refreshTools()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  <IoRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Tools
                </button>
              </div>
            </div>

            {/* Server List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">MCP Servers</h3>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    <IoAdd className="w-4 h-4" />
                    Add Server
                  </button>
                )}
              </div>

              {/* Add Server Form */}
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 border border-gray-300 rounded space-y-3"
                >
                  <input
                    type="text"
                    placeholder="Server Name"
                    value={newServer.name}
                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <input
                    type="text"
                    placeholder="Server URL (e.g., http://localhost:8000)"
                    value={newServer.url}
                    onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <input
                    type="text"
                    placeholder="API Key (optional)"
                    value={newServer.apiKey}
                    onChange={(e) => setNewServer({ ...newServer, apiKey: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddServer}
                      className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Add Server
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewServer({ name: '', url: '', transport: 'http', enabled: true, apiKey: '' });
                      }}
                      className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Server Cards */}
              {servers.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="mb-1 text-sm">No MCP servers configured</p>
                  <p className="text-xs">Click "Add Server" to connect to an MCP server</p>
                </div>
              ) : (
                servers.map((server) => (
                  <div
                    key={server.id}
                    className="p-3 border border-gray-300 rounded hover:border-gray-400 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-black">{server.name}</h4>
                          {server.connected ? (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              <IoCheckmark className="w-3 h-3" />
                              Connected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              <IoWarning className="w-3 h-3" />
                              Not Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{server.url}</p>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={server.enabled}
                              onChange={(e) => updateServer(server.id, { enabled: e.target.checked })}
                              className="w-3.5 h-3.5 rounded"
                            />
                            Enabled
                          </label>
                          <button
                            onClick={() => handleTestConnection(server)}
                            className="text-xs text-black hover:underline"
                          >
                            Test Connection
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove server "${server.name}"?`)) {
                            removeServer(server.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <IoTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Available Tools */}
            {allTools.length > 0 && (
              <div className="mt-4">
                <h3 className="text-base font-semibold mb-3">Available Tools ({allTools.length})</h3>
                <div className="space-y-2">
                  {allTools.map((tool, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <h4 className="font-medium text-sm text-black">{tool.name}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
