/**
 * Broker System Initialization
 * 
 * Initialize the broker system on application startup.
 * This file should be imported early in the application lifecycle.
 */

import { 
  initializeOrderExecutor, 
  loadBrokerConfigFromEnv,
  validateBrokerConfig,
  getBrokerDisplayName,
  isBrokerConfigured,
} from '../lib/brokers';
import { devLog, devError } from '../lib/utils/dev-logger';

let initialized = false;

/**
 * Initialize the broker system
 */
export async function initializeBrokerSystem(): Promise<void> {
  if (initialized) {
    devLog('Broker system already initialized');
    return;
  }

  try {
    devLog('Initializing broker system...');

    // Load configuration from environment
    const config = loadBrokerConfigFromEnv();

    // Validate configuration
    const errors = validateBrokerConfig(config);
    if (errors.length > 0) {
      devError('Broker configuration errors:', errors);
      throw new Error(`Broker configuration invalid: ${errors.join(', ')}`);
    }

    // Initialize order executor
    const executor = initializeOrderExecutor(config);

    // Log configured brokers
    const configuredBrokers = config.brokers.map(b => {
      const name = getBrokerDisplayName(b.type);
      const mode = b.paperTrading ? '(Paper Trading)' : '(Live Trading)';
      return `  - ${name} ${mode}`;
    });

    devLog('Configured brokers:');
    devLog(configuredBrokers.join('\n'));
    devLog(`Default broker: ${getBrokerDisplayName(config.defaultBroker)}`);

    // Connect to all brokers
    devLog('Connecting to brokers...');
    await executor.connectAll();

    // Verify connections
    const connectedBrokers = config.brokers
      .filter(b => executor.isConnected(b.type))
      .map(b => getBrokerDisplayName(b.type));

    if (connectedBrokers.length === 0) {
      throw new Error('Failed to connect to any broker');
    }

    devLog('Connected brokers:', connectedBrokers.join(', '));

    initialized = true;
    devLog('✓ Broker system initialized successfully');
  } catch (error) {
    devError('Failed to initialize broker system:', error);
    throw error;
  }
}

/**
 * Check if broker system is initialized
 */
export function isBrokerSystemInitialized(): boolean {
  return initialized;
}

/**
 * Get broker system status
 */
export function getBrokerSystemStatus() {
  if (!initialized) {
    return {
      initialized: false,
      status: 'not_initialized',
    };
  }

  const config = loadBrokerConfigFromEnv();
  const brokers = config.brokers.map(b => ({
    type: b.type,
    name: getBrokerDisplayName(b.type),
    configured: isBrokerConfigured(b.type),
    paperTrading: b.paperTrading,
  }));

  return {
    initialized: true,
    status: 'ready',
    defaultBroker: config.defaultBroker,
    brokers,
  };
}

// Auto-initialize in development mode
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Only initialize in browser, not during SSR
  if (process.env.NEXT_PUBLIC_AUTO_INIT_BROKER !== 'false') {
    initializeBrokerSystem().catch(error => {
      devError('Auto-initialization failed:', error);
    });
  }
}
