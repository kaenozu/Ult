/**
 * Centralized Configuration Management
 *
 * This module provides unified access to environment variables
 * and application configuration across the entire application.
 */

interface AppConfig {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
  };

  // WebSocket Configuration
  websocket: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };

  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    currency: string;
  };

  // Feature Flags
  features: {
    enableDebug: boolean;
    enableAnalytics: boolean;
    enableWebSocket: boolean;
  };

  // Development
  dev: {
    enableBundleAnalyzer: boolean;
    enableMockData: boolean;
  };
}

// Environment variables with defaults
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Configuration object
export const config: AppConfig = {
  api: {
    baseUrl: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:8000'),
    timeout: getEnvNumber('API_TIMEOUT', 30000),
  },

  websocket: {
    url: getEnvVar('NEXT_PUBLIC_WS_URL', 'ws://localhost:8000/ws/regime'),
    reconnectInterval: getEnvNumber('WS_RECONNECT_INTERVAL', 5000),
    maxReconnectAttempts: getEnvNumber('WS_MAX_RECONNECT_ATTEMPTS', 5),
  },

  ui: {
    theme: getEnvVar('UI_THEME', 'auto') as AppConfig['ui']['theme'],
    language: getEnvVar('UI_LANGUAGE', 'en'),
    currency: getEnvVar('UI_CURRENCY', 'USD'),
  },

  features: {
    enableDebug: getEnvBool('NEXT_PUBLIC_ENABLE_DEBUG', false),
    enableAnalytics: getEnvBool('NEXT_PUBLIC_ENABLE_ANALYTICS', true),
    enableWebSocket: getEnvBool('ENABLE_WEBSOCKET', true),
  },

  dev: {
    enableBundleAnalyzer: getEnvBool('ANALYZE', false),
    enableMockData: getEnvBool('ENABLE_MOCK_DATA', false),
  },
};

// Validation function
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate URLs
  try {
    new URL(config.api.baseUrl);
  } catch {
    errors.push('Invalid API base URL');
  }

  try {
    new URL(config.websocket.url);
  } catch {
    errors.push('Invalid WebSocket URL');
  }

  // Validate timeouts
  if (config.api.timeout <= 0) {
    errors.push('API timeout must be positive');
  }

  if (config.websocket.reconnectInterval <= 0) {
    errors.push('WebSocket reconnect interval must be positive');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Environment-specific configurations
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Feature flags
export const features = {
  debug: () => config.features.enableDebug || isDevelopment,
  analytics: () => config.features.enableAnalytics && isProduction,
  websocket: () => config.features.enableWebSocket,
  bundleAnalyzer: () => config.dev.enableBundleAnalyzer,
};

// Utility functions
export const getApiUrl = (endpoint: string): string => {
  return `${config.api.baseUrl}${endpoint}`;
};

export const getWebSocketUrl = (): string => {
  return config.websocket.url;
};

// Export for backward compatibility
export default config;
