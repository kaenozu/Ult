
import { Skill, SkillResult } from './types';

// Mock data service for demonstration
const mockMarketData = {
  'AAPL': { price: 150.50, trend: 'UP', volume: 1000000 },
  'GOOGL': { price: 2800.00, trend: 'DOWN', volume: 500000 },
  'MSFT': { price: 300.00, trend: 'SIDEWAYS', volume: 750000 },
};

/**
 * Market Analysis Skill
 */
export class MarketDataSkill implements Skill {
  id = 'market_data';
  name = 'Market Data Analysis';
  description = 'Analyzes market data for symbols';

  async execute(params: any): Promise<SkillResult> {
    const { symbol } = params;
    if (!symbol) {
      return { success: false, error: 'Symbol is required' };
    }

    const data = mockMarketData[symbol as keyof typeof mockMarketData];
    if (!data) {
      return { success: false, error: 'Symbol not found' };
    }

    return {
      success: true,
      data: {
        symbol,
        ...data,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Trading Execution Skill
 */
export class TradingSkill implements Skill {
  id = 'trading_execution';
  name = 'Trading Execution';
  description = 'Executes buy and sell orders';

  async execute(params: any): Promise<SkillResult> {
    const { symbol, action, quantity } = params;

    if (!symbol || !action || !quantity) {
      return { success: false, error: 'Missing required trade parameters' };
    }

    // Mock execution delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      data: {
        orderId: `ORD-${Date.now()}`,
        symbol,
        action,
        quantity,
        status: 'FILLED',
        price: 150.00, // Mock price
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Risk Management Skill
 */
export class RiskManagementSkill implements Skill {
  id = 'risk_management';
  name = 'Risk Management';
  description = 'Evaluates trade risk';

  async execute(params: any): Promise<SkillResult> {
    const { quantity } = params;

    // Simple mock risk check
    const MAX_QUANTITY = 1000;

    if (quantity > MAX_QUANTITY) {
      return {
        success: true,
        data: {
          approved: false,
          reason: `Quantity ${quantity} exceeds limit of ${MAX_QUANTITY}`
        }
      };
    }

    return {
      success: true,
      data: {
        approved: true,
        riskScore: 0.1
      }
    };
  }
}
