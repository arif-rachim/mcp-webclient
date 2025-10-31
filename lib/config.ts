/**
 * Application Configuration
 * Centralizes environment variable access with type safety
 */

export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Authentication
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // MCP Configuration
  mcp: {
    useClientSide: process.env.NEXT_PUBLIC_MCP_CLIENT_SIDE === 'true',
    clientUrl: process.env.NEXT_PUBLIC_MCP_SERVER_URL,
    serverUrl: process.env.MCP_SERVER_URL,
    apiKey: process.env.MCP_API_KEY,
  },

  // Ollama
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
  },

  // Application
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
  },

  // Feature Flags
  features: {
    debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
    experimental: process.env.NEXT_PUBLIC_EXPERIMENTAL_FEATURES === 'true',
  },

  // Computed properties
  get isDevelopment() {
    return this.app.env === 'development';
  },

  get isProduction() {
    return this.app.env === 'production';
  },

  get isTest() {
    return this.app.env === 'test';
  },
} as const;

export type Config = typeof config;
