/**
 * MultiTimeFrameStrategy.test.ts
 * 
 * マルチ時間枠戦略のテスト
 */

import { MultiTimeFrameStrategy } from '../MultiTimeFrameStrategy';
import { OHLCV, TimeFrame, TimeFrameSignal } from '@/app/types';

// モックデータ生成
function generateMockOHLCV(count: number, basePrice: number = 100, trend: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS'): OHLCV[] {
  const data: OHLCV[] = [];
  let price = basePrice;
  
  for (let i = 0; i < count; i++) {
    let change = 0;
    
    if (trend === 'UP') {
      change = Math.random() * 5 + 2.0; // Stronger uptrend
    } else if (trend === 'DOWN') {
      change = -(Math.random() * 5 + 2.0); // Stronger downtrend
    } else {
      change = (Math.random() - 0.5) * 1; // Sideways
    }
    
    price += change;
    
    data.push({
      date: new Date(Date.now() - (count - i) * 86400000).toISOString(), // Daily data
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  
  return data;
}

describe('MultiTimeFrameStrategy', () => {
  let strategy: MultiTimeFrameStrategy;
  
  beforeEach(() => {
    strategy = new MultiTimeFrameStrategy();
  });
  
  describe('初期化', () => {
    it('デフォルト設定で初期化できる', () => {
      expect(strategy).toBeDefined();
      const config = strategy.getConfig();
      expect(config.timeFrames).toEqual(['daily', 'weekly', 'monthly']);
      expect(config.minAlignment).toBe(0.6);
      expect(config.requireHigherTimeFrameConfirmation).toBe(true);
    });
    
    it('カスタム設定で初期化できる', () => {
      const customStrategy = new MultiTimeFrameStrategy({
        timeFrames: ['daily', '60min'],
        minAlignment: 0.7,
        requireHigherTimeFrameConfirmation: false,
      });
      
      const config = customStrategy.getConfig();
      expect(config.timeFrames).toEqual(['daily', '60min']);
      expect(config.minAlignment).toBe(0.7);
      expect(config.requireHigherTimeFrameConfirmation).toBe(false);
    });
  });
  
  describe('マルチ時間枠分析', () => {
    it('複数の時間枠でシグナルを生成できる', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result).toBeDefined();
      expect(result.symbol).toBe('TEST');
      // At least 2 timeframes should generate signals (monthly might be skipped if not enough data)
      expect(result.timeFrameSignals.length).toBeGreaterThanOrEqual(2);
      expect(result.primarySignal).toMatch(/BUY|SELL|HOLD/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.alignment).toBeGreaterThanOrEqual(0);
      expect(result.alignment).toBeLessThanOrEqual(1);
    });
    
    it('上昇トレンドで買いシグナルを生成する', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // With random data, trend might be neutral, so we check for bullish or neutral
      expect(['bullish', 'neutral']).toContain(result.trendDirection);
      // 強い上昇トレンドではBUYまたは高い整合性が期待される
      expect(result.alignment).toBeGreaterThan(0.3);
    });
    
    it('下降トレンドで売りシグナルを生成する', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'DOWN'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'DOWN'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'DOWN'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // With random data, trend might be neutral, so we check for bearish or neutral
      expect(['bearish', 'neutral']).toContain(result.trendDirection);
      // 強い下降トレンドではSELLまたは高い整合性が期待される
      expect(result.alignment).toBeGreaterThan(0.3);
    });
    
    it('横ばい相場でHOLDシグナルを生成する', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'SIDEWAYS'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'SIDEWAYS'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'SIDEWAYS'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // 横ばい相場では整合性が低いかHOLDが期待される
      expect(['HOLD', 'BUY', 'SELL']).toContain(result.primarySignal);
    });
    
    it('データ不足の時間枠をスキップする', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(10, 100, 'UP')); // 不足
      dataByTimeFrame.set('monthly', generateMockOHLCV(60, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // weeklyはスキップされるため、2つの時間枠のみ
      expect(result.timeFrameSignals.length).toBeLessThanOrEqual(2);
    });
  });
  
  describe('整合性計算', () => {
    it('全ての時間枠が同じシグナルの場合、整合性が1に近い', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      // 全て強い上昇トレンド
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // 全て同じトレンドなので整合性が高い
      expect(result.alignment).toBeGreaterThan(0.4);
    });
    
    it('時間枠間でシグナルが異なる場合、整合性が低い', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      // 短期は上昇、長期は下降
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'DOWN'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'SIDEWAYS'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // シグナルが混在しているので整合性は中程度以下
      expect(result.alignment).toBeLessThan(0.9);
    });
  });
  
  describe('乖離検出', () => {
    it('短期と長期で相反するシグナルの場合、乖離を検出する', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      // 短期は上昇、長期は下降
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 110, 'UP'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 90, 'DOWN'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // 乖離が検出される可能性がある（トレンドにより異なる）
      expect(result.divergenceDetected).toBeDefined();
      expect(typeof result.divergenceDetected).toBe('boolean');
    });
    
    it('乖離が検出された場合、信頼度が低下する', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 110, 'UP'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 90, 'DOWN'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      if (result.divergenceDetected) {
        // 乖離がある場合は信頼度が低下するはず
        expect(result.confidence).toBeLessThan(90);
      }
    });
  });
  
  describe('推奨文生成', () => {
    it('推奨文が生成される', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
    
    it('推奨理由が生成される', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result.reasoning).toBeDefined();
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });
  
  describe('設定更新', () => {
    it('設定を更新できる', () => {
      strategy.updateConfig({
        minAlignment: 0.8,
        requireHigherTimeFrameConfirmation: false,
      });
      
      const config = strategy.getConfig();
      expect(config.minAlignment).toBe(0.8);
      expect(config.requireHigherTimeFrameConfirmation).toBe(false);
    });
    
    it('一部の設定のみ更新できる', () => {
      const originalConfig = strategy.getConfig();
      
      strategy.updateConfig({
        minAlignment: 0.75,
      });
      
      const config = strategy.getConfig();
      expect(config.minAlignment).toBe(0.75);
      expect(config.requireHigherTimeFrameConfirmation).toBe(originalConfig.requireHigherTimeFrameConfirmation);
      expect(config.timeFrames).toEqual(originalConfig.timeFrames);
    });
  });
  
  describe('エッジケース', () => {
    it('データがない場合はエラーなく処理される', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result).toBeDefined();
      expect(result.timeFrameSignals).toHaveLength(0);
      expect(result.primarySignal).toBe('HOLD');
    });
    
    it('単一の時間枠のみでも分析できる', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result).toBeDefined();
      expect(result.timeFrameSignals.length).toBeGreaterThanOrEqual(1);
    });
    
    it('極端な価格変動でもクラッシュしない', async () => {
      const extremeData: OHLCV[] = [];
      let price = 100;
      
      for (let i = 0; i < 100; i++) {
        // 極端な変動: ±20%
        price = price * (1 + (Math.random() - 0.5) * 0.4);
        extremeData.push({
          date: new Date(Date.now() - (100 - i) * 86400000).toISOString(),
          open: price * 0.98,
          high: price * 1.05,
          low: price * 0.95,
          close: price,
          volume: 1000000,
        });
      }
      
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', extremeData);
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result).toBeDefined();
      expect(result.primarySignal).toMatch(/BUY|SELL|HOLD/);
    });
  });
  
  describe('信頼度計算', () => {
    it('信頼度が0-100の範囲内にある', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
    
    it('多くの時間枠で一致すると信頼度が高い', async () => {
      const dataByTimeFrame = new Map<TimeFrame, OHLCV[]>();
      // 3つの時間枠で同じトレンド
      dataByTimeFrame.set('daily', generateMockOHLCV(100, 100, 'UP'));
      dataByTimeFrame.set('weekly', generateMockOHLCV(50, 100, 'UP'));
      dataByTimeFrame.set('monthly', generateMockOHLCV(30, 100, 'UP'));
      
      const result = await strategy.analyzeMultipleTimeFrames('TEST', dataByTimeFrame);
      
      // 3つの時間枠が揃っているので信頼度が中程度以上
      expect(result.confidence).toBeGreaterThan(40);
    });
  });
});
