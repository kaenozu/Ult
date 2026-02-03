/**
 * Broker Configuration Utility
 * 
 * Helper functions to initialize broker system from environment variables.
 */

import { BrokerType, BrokerConfig } from '../../types/broker';
import { OrderExecutorConfig } from './OrderExecutor';

/**
 * Load broker configuration from environment variables
 */
export function loadBrokerConfigFromEnv(): OrderExecutorConfig {
  const defaultBroker = (process.env.DEFAULT_BROKER as BrokerType) || 'paper';
  const brokers: BrokerConfig[] = [];

  // Always include paper trading
  if (process.env.ENABLE_PAPER_TRADING !== 'false') {
    brokers.push({
      type: 'paper',
      apiKey: 'paper_key',
      apiSecret: 'paper_secret',
      paperTrading: true,
    });
  }

  // Add Alpaca if configured
  if (process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET) {
    brokers.push({
      type: 'alpaca',
      apiKey: process.env.ALPACA_API_KEY,
      apiSecret: process.env.ALPACA_API_SECRET,
      paperTrading: process.env.ALPACA_PAPER_TRADING === 'true',
    });
  }

  // Add OANDA if configured
  if (process.env.OANDA_API_KEY && process.env.OANDA_ACCOUNT_ID) {
    brokers.push({
      type: 'oanda',
      apiKey: process.env.OANDA_API_KEY,
      apiSecret: process.env.OANDA_ACCOUNT_ID,
      paperTrading: process.env.OANDA_PRACTICE_MODE === 'true',
    });
  }

  // Add Interactive Brokers if configured
  if (process.env.IB_API_KEY && process.env.IB_ACCOUNT_ID) {
    brokers.push({
      type: 'interactive_brokers',
      apiKey: process.env.IB_API_KEY,
      apiSecret: process.env.IB_ACCOUNT_ID,
      paperTrading: process.env.IB_PAPER_TRADING === 'true',
    });
  }

  return {
    defaultBroker,
    brokers,
    autoRetry: process.env.ORDER_RETRY_ENABLED !== 'false',
    maxRetries: parseInt(process.env.ORDER_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.ORDER_RETRY_DELAY || '1000', 10),
  };
}

/**
 * Validate broker configuration
 */
export function validateBrokerConfig(config: OrderExecutorConfig): string[] {
  const errors: string[] = [];

  if (!config.brokers || config.brokers.length === 0) {
    errors.push('No brokers configured');
  }

  if (!config.defaultBroker) {
    errors.push('No default broker specified');
  }

  const brokerTypes = config.brokers.map(b => b.type);
  if (!brokerTypes.includes(config.defaultBroker)) {
    errors.push(`Default broker '${config.defaultBroker}' is not in configured brokers`);
  }

  // Validate each broker config
  config.brokers.forEach(broker => {
    if (!broker.type) {
      errors.push('Broker type is required');
    }
    if (!broker.apiKey) {
      errors.push(`API key is required for ${broker.type}`);
    }
    if (!broker.apiSecret) {
      errors.push(`API secret is required for ${broker.type}`);
    }
  });

  return errors;
}

/**
 * Get broker display name
 */
export function getBrokerDisplayName(type: BrokerType): string {
  const names: Record<BrokerType, string> = {
    paper: 'Paper Trading',
    alpaca: 'Alpaca Markets',
    oanda: 'OANDA',
    interactive_brokers: 'Interactive Brokers',
  };
  return names[type] || type;
}

/**
 * Check if broker supports extended hours trading
 */
export function supportsExtendedHours(type: BrokerType): boolean {
  return type === 'alpaca';
}

/**
 * Get broker API documentation URL
 */
export function getBrokerDocsUrl(type: BrokerType): string {
  const urls: Record<BrokerType, string> = {
    paper: '',
    alpaca: 'https://alpaca.markets/docs/',
    oanda: 'https://developer.oanda.com/',
    interactive_brokers: 'https://www.interactivebrokers.com/api/',
  };
  return urls[type] || '';
}

/**
 * Format broker order status for display
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '保留中',
    accepted: '承認済み',
    filled: '約定',
    partial: '一部約定',
    cancelled: 'キャンセル済み',
    rejected: '拒否',
    expired: '期限切れ',
  };
  return statusMap[status] || status;
}

/**
 * Check if broker is configured
 */
export function isBrokerConfigured(type: BrokerType): boolean {
  switch (type) {
    case 'paper':
      return true;
    case 'alpaca':
      return !!(process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET);
    case 'oanda':
      return !!(process.env.OANDA_API_KEY && process.env.OANDA_ACCOUNT_ID);
    case 'interactive_brokers':
      return !!(process.env.IB_API_KEY && process.env.IB_ACCOUNT_ID);
    default:
      return false;
  }
}
