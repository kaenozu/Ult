import { RiskManagementService } from '../RiskManagementService';
import { OrderRequest } from '@/app/types/order';
import { Portfolio } from '@/app/types';

describe('RiskManagementService - FINAL TDD Verification', () => {
  let riskService: RiskManagementService;
  
  const getMockPortfolio = (): Portfolio => ({
    positions: [],
    orders: [],
    totalValue: 0, // Market value of positions
    totalProfit: 0,
    dailyPnL: 0,
    cash: 100000, // Total equity = 100k
  });

  beforeEach(() => {
    riskService = new RiskManagementService({
      maxRiskPerTrade: 1.0, 
      enablePositionSizing: false,
      enableAutoStopLoss: false,
      enableCircuitBreaker: false,
      maxPositionPercent: 100,
    });
  });

  test('should strictly apply maxRiskPerTrade override', () => {
    // Equity = 100k. maxRiskPerTrade = 5% -> 5000 max loss.
    // Price = 100, SL = 80 -> 20 risk per unit.
    // Result = 5000 / 20 = 250 units.
    
    const order: OrderRequest = {
      symbol: 'TEST', name: 'Test', market: 'usa', side: 'LONG',
      quantity: 1000, price: 100, orderType: 'MARKET', stopLoss: 80,
      riskConfig: {
        maxRiskPerTrade: 5.0,
        enableDynamicPositionSizing: false,
        maxPositionPercent: 100,
        enableTrailingStop: false,
        trailingStopATRMultiple: 2,
        trailingStopMinPercent: 1,
        enableVolatilityAdjustment: false,
        volatilityMultiplier: 1,
        minRiskRewardRatio: 2.0
      }
    };

    const result = riskService.validateOrder(order, getMockPortfolio());
    
    expect(result.stopLossPrice).toBe(80);
    expect(result.adjustedQuantity).toBe(250);
  });
});
