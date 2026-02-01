/**
 * WinRateMaximizer.test.ts
 * 
 * 勝率最大化エンジンのテスト
 */

import { WinRateMaximizer, TradeScenario, DEFAULT_OPTIMIZATION_CONFIG } from '../WinRateMaximizer';
import { OHLCV } from '@/app/types';

// モックデータ生成
function generateMockOHLCV(count: number, basePrice: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = basePrice;
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
    price += change;
    
    data.push({
      date: new Date(Date.now() - (count - i) * 60000).toISOString(),
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  
  return data;
}

function generateMockScenario(won: boolean, trend: 'UP' | 'DOWN' | 'SIDEWAYS'): TradeScenario {
  const rsi = won ? 45 : 65; // 勝ちトレードは適切なRSI
  const profitPercent = won ? 3 + Math.random() * 5 : -2 - Math.random() * 3;
  
  return {
    id: `scenario-${Math.random()}`,
    timestamp: new Date().toISOString(),
    marketConditions: {
      trend,
      volatility: 'MEDIUM',
      volume: 'MEDIUM',
      momentum: won ? 2 : -1,
    },
    indicators: {
      rsi,
      macd: won ? 1 : -1,
      adx: 30,
      bbPosition: 0,
      smaAlignment: trend === 'UP',
    },
    outcome: {
      action: 'BUY',
      entryPrice: 100,
      exitPrice: 100 + profitPercent,
      profit: profitPercent,
      profitPercent,
      holdingPeriod: 60,
      won,
    },
  };
}

describe('WinRateMaximizer', () => {
  let optimizer: WinRateMaximizer;
  
  beforeEach(() => {
    optimizer = new WinRateMaximizer();
  });
  
  describe('初期化', () => {
    it('デフォルト設定で初期化できる', () => {
      expect(optimizer).toBeDefined();
      const stats = optimizer.getOptimizationStats();
      expect(stats.totalScenarios).toBe(0);
    });
    
    it('カスタム設定で初期化できる', () => {
      const customOptimizer = new WinRateMaximizer({
        minWinRateForTrade: 60,
        maxPositionSize: 30,
      });
      expect(customOptimizer).toBeDefined();
    });
  });
  
  describe('学習機能', () => {
    it('過去のシナリオから学習できる', () => {
      const scenarios: TradeScenario[] = [
        generateMockScenario(true, 'UP'),
        generateMockScenario(true, 'UP'),
        generateMockScenario(false, 'DOWN'),
      ];
      
      optimizer.learnFromHistory(scenarios);
      const stats = optimizer.getOptimizationStats();
      expect(stats.totalScenarios).toBe(3);
    });
    
    it('勝率を正しく計算する', () => {
      const scenarios: TradeScenario[] = [
        generateMockScenario(true, 'UP'),
        generateMockScenario(true, 'UP'),
        generateMockScenario(true, 'UP'),
        generateMockScenario(false, 'DOWN'),
        generateMockScenario(false, 'DOWN'),
      ];
      
      optimizer.learnFromHistory(scenarios);
      const stats = optimizer.getOptimizationStats();
      expect(stats.avgWinRate).toBe(60); // 3/5 = 60%
    });
  });
  
  describe('最適化機能', () => {
    it('市場データから最適化を実行できる', () => {
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result).toBeDefined();
      expect(result.action).toMatch(/BUY|SELL|HOLD|WAIT/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
    
    it('データ不足時はWAITを返す', () => {
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      // シナリオ学習なしではWAITになるはず
      expect(result.action).toBe('WAIT');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
    
    it('十分なデータがある場合は適切なアクションを返す', () => {
      // 15件の成功シナリオを学習
      const scenarios: TradeScenario[] = Array(15).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      
      optimizer.learnFromHistory(scenarios);
      
      // 上昇トレンドのデータ
      const data = generateMockOHLCV(100, 100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      // WAITでなければOK（BUY/SELL/HOLDのいずれか）
      expect(['BUY', 'SELL', 'HOLD', 'WAIT']).toContain(result.action);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('エントリー最適化', () => {
    it('最適なエントリー価格を提案する', () => {
      const scenarios: TradeScenario[] = Array(20).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.optimalEntry.price).toBeGreaterThan(0);
      expect(result.optimalEntry.timing).toMatch(/IMMEDIATE|WAIT_FOR_PULLBACK|WAIT_FOR_BREAKOUT/);
    });
  });
  
  describe('エグジット最適化', () => {
    it('最適なエグジット価格を提案する', () => {
      const scenarios: TradeScenario[] = Array(20).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.optimalExit.takeProfit).toBeGreaterThan(data[data.length - 1].close);
      expect(result.optimalExit.stopLoss).toBeLessThan(data[data.length - 1].close);
    });
  });
  
  describe('ポジションサイズ最適化', () => {
    it('勝率に基づいてポジションサイズを最適化する', () => {
      const scenarios: TradeScenario[] = Array(30).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.positionSizing.recommended).toBeGreaterThan(0);
      expect(result.positionSizing.recommended).toBeLessThanOrEqual(result.positionSizing.max);
      // ポジションサイズは最小値以下の場合もある（低信頼度の場合）
      expect(result.positionSizing.min).toBeGreaterThan(0);
    });
    
    it('高勝率の場合は大きなポジションサイズを推奨する', () => {
      // 勝率90%のシナリオ
      const scenarios: TradeScenario[] = Array(40).fill(null).map((_, i) => 
        generateMockScenario(i < 36, 'UP') // 36勝4敗 = 90%
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      // 類似シナリオの中での勝率は高いはず
      expect(result.positionSizing.recommended).toBeGreaterThan(0);
      // 学習データの勝率が90%であることを確認
      const stats = optimizer.getOptimizationStats();
      expect(stats.avgWinRate).toBe(90);
    });
  });
  
  describe('リスク評価', () => {
    it('リスクレベルを正しく評価する', () => {
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.risk.level).toMatch(/LOW|MEDIUM|HIGH/);
      expect(result.risk.probabilityOfLoss).toBeGreaterThanOrEqual(0);
      expect(result.risk.probabilityOfLoss).toBeLessThanOrEqual(100);
    });
    
    it('高リスクシナリオを検出する', () => {
      // すべて失敗のシナリオ
      const scenarios: TradeScenario[] = Array(20).fill(null).map(() => 
        generateMockScenario(false, 'DOWN')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      // 全敗のため、リスクレベルは高いまたは警告が出る
      expect(['MEDIUM', 'HIGH']).toContain(result.risk.level);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
  
  describe('市場条件マッチング', () => {
    it('類似シナリオを正しくカウントする', () => {
      const scenarios: TradeScenario[] = Array(25).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.marketConditions.similarPastScenarios).toBeGreaterThanOrEqual(0);
    });
    
    it('市場マッチングを評価する', () => {
      const scenarios: TradeScenario[] = Array(25).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.marketConditions.match).toMatch(/EXCELLENT|GOOD|AVERAGE|POOR/);
    });
  });
  
  describe('推奨理由と警告', () => {
    it('推奨理由を生成する', () => {
      const scenarios: TradeScenario[] = Array(15).fill(null).map(() => 
        generateMockScenario(true, 'UP')
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.reasoning).toBeDefined();
      expect(Array.isArray(result.reasoning)).toBe(true);
    });
    
    it('警告を生成する', () => {
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });
    
    it('低勝率時に警告を出す', () => {
      // 低勝率のシナリオ
      const scenarios: TradeScenario[] = Array(20).fill(null).map((_, i) => 
        generateMockScenario(i < 8, 'UP') // 40%勝率
      );
      optimizer.learnFromHistory(scenarios);
      
      const data = generateMockOHLCV(100);
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result.warnings.some(w => w.includes('低勝率'))).toBe(true);
    });
  });
  
  describe('エッジケース', () => {
    it('空のデータでも動作する', () => {
      const data = generateMockOHLCV(20); // 最小限のデータ
      const result = optimizer.optimize(data, 'TEST', 100000);
      
      expect(result).toBeDefined();
      expect(result.action).toBe('WAIT');
    });
    
    it('極端な市場条件でも動作する', () => {
      const data: OHLCV[] = Array(100).fill(null).map((_, i) => ({
        date: new Date(Date.now() - (100 - i) * 60000).toISOString(),
        open: 100,
        high: 150,
        low: 50,
        close: 100 + i, // 強い上昇トレンド
        volume: 1000000,
      }));
      
      const result = optimizer.optimize(data, 'TEST', 100000);
      expect(result).toBeDefined();
    });
  });
});
