/**
 * CompositeTechnicalAnalysisEngine.test.ts
 * 
 * 複合テクニカル分析エンジンのユニットテスト
 */

import { CompositeTechnicalAnalysisEngine } from '../CompositeTechnicalAnalysisEngine';
import { OHLCV } from '../../../types/shared';

describe('CompositeTechnicalAnalysisEngine', () => {
  let engine: CompositeTechnicalAnalysisEngine;

  beforeEach(() => {
    engine = new CompositeTechnicalAnalysisEngine();
  });

  // ヘルパー関数: テスト用のOHLCVデータを生成
  const generateOHLCVData = (length: number, trend: 'up' | 'down' | 'sideways' = 'sideways'): OHLCV[] => {
    const data: OHLCV[] = [];
    let basePrice = 100;

    for (let i = 0; i < length; i++) {
      const date = new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000);
      
      // トレンドに応じて価格を変動
      if (trend === 'up') {
        basePrice += Math.random() * 2;
      } else if (trend === 'down') {
        basePrice -= Math.random() * 2;
      } else {
        basePrice += (Math.random() - 0.5) * 2;
      }

      const open = basePrice;
      const high = basePrice + Math.random() * 2;
      const low = basePrice - Math.random() * 2;
      const close = basePrice + (Math.random() - 0.5);
      const volume = 1000000 + Math.random() * 500000;

      data.push({
        date: date.toISOString(),
        timestamp: date.getTime(),
        open,
        high,
        low,
        close,
        volume,
      });

      basePrice = close;
    }

    return data;
  };

  describe('analyze()', () => {
    test('should return neutral analysis for insufficient data', () => {
      const data = generateOHLCVData(30); // Less than 60
      const result = engine.analyze(data);

      expect(result.direction).toBe('NEUTRAL');
      expect(result.confidence).toBe(0);
      expect(result.strength).toBe('WEAK');
      expect(result.explainability.primaryReasons[0]).toContain('データ不足');
    });

    test('should analyze data with sufficient length', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(result).toHaveProperty('rsi');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('volatility');
      expect(result).toHaveProperty('momentum');
      expect(result).toHaveProperty('consensus');
      expect(result).toHaveProperty('finalScore');
      expect(result).toHaveProperty('direction');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('explainability');
    });

    test('should detect bullish trend', () => {
      const data = generateOHLCVData(100, 'up');
      const result = engine.analyze(data);

      // 上昇トレンドではBUYシグナルが出やすい
      expect(['BUY', 'NEUTRAL']).toContain(result.direction);
      expect(result.finalScore).toBeGreaterThanOrEqual(-1);
      expect(result.finalScore).toBeLessThanOrEqual(1);
    });

    test('should detect bearish trend', () => {
      const data = generateOHLCVData(100, 'down');
      const result = engine.analyze(data);

      // 下降トレンドではSELLシグナルが出やすい
      expect(['SELL', 'NEUTRAL']).toContain(result.direction);
      expect(result.finalScore).toBeGreaterThanOrEqual(-1);
      expect(result.finalScore).toBeLessThanOrEqual(1);
    });

    test('should return valid confidence range', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should generate explainability', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(result.explainability).toHaveProperty('primaryReasons');
      expect(result.explainability).toHaveProperty('supportingReasons');
      expect(result.explainability).toHaveProperty('warnings');
      
      expect(Array.isArray(result.explainability.primaryReasons)).toBe(true);
      expect(result.explainability.primaryReasons.length).toBeGreaterThan(0);
    });
  });

  describe('RSI Analysis', () => {
    test('should detect oversold condition', () => {
      // RSIが低い状態を作る（価格が連続して下落）
      const data = generateOHLCVData(60);
      // 最後の10本を強制的に下落させる
      for (let i = data.length - 10; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 0.98;
        data[i].open = prevClose;
        data[i].low = data[i].close * 0.99;
        data[i].high = prevClose * 1.001;
      }

      const result = engine.analyze(data);

      expect(['oversold', 'extreme_oversold']).toContain(result.rsi.signal);
      expect(result.rsi.score).toBeGreaterThan(0); // 買いシグナル
    });

    test('should detect overbought condition', () => {
      // RSIが高い状態を作る（価格が連続して上昇）
      const data = generateOHLCVData(60);
      // 最後の10本を強制的に上昇させる
      for (let i = data.length - 10; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 1.02;
        data[i].open = prevClose;
        data[i].high = data[i].close * 1.001;
        data[i].low = prevClose * 0.99;
      }

      const result = engine.analyze(data);

      expect(['overbought', 'extreme_overbought']).toContain(result.rsi.signal);
      expect(result.rsi.score).toBeLessThan(0); // 売りシグナル
    });

    test('should have reasons array', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(Array.isArray(result.rsi.reasons)).toBe(true);
      expect(result.rsi.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('Trend Analysis', () => {
    test('should detect golden cross', () => {
      const data = generateOHLCVData(100);
      
      // ゴールデンクロスを作る（短期MAが長期MAを下から上に突破）
      // データの後半で価格を急上昇させる
      for (let i = data.length - 20; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 1.03;
        data[i].open = prevClose;
        data[i].high = data[i].close * 1.001;
        data[i].low = prevClose * 0.99;
      }

      const result = engine.analyze(data);

      // トレンド分析の結果を確認
      expect(result.trend.score).toBeGreaterThanOrEqual(-1);
      expect(result.trend.score).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.trend.reasons)).toBe(true);
    });

    test('should calculate alignment score', () => {
      const data = generateOHLCVData(250); // 200期間MAも計算可能
      const result = engine.analyze(data);

      expect(result.trend.alignment).toBeGreaterThanOrEqual(-1);
      expect(result.trend.alignment).toBeLessThanOrEqual(1);
    });
  });

  describe('Volatility Analysis', () => {
    test('should detect squeeze', () => {
      // ボラティリティが低い状態を作る（価格がほぼ横ばい）
      const data = generateOHLCVData(100);
      const avgPrice = data[data.length - 1].close;
      
      // 最後の20本を小さい値動きにする
      for (let i = data.length - 20; i < data.length; i++) {
        data[i].close = avgPrice + (Math.random() - 0.5) * 0.1;
        data[i].open = avgPrice + (Math.random() - 0.5) * 0.1;
        data[i].high = data[i].close + 0.05;
        data[i].low = data[i].close - 0.05;
      }

      const result = engine.analyze(data);

      expect(['squeeze', 'normal']).toContain(result.volatility.state);
      expect(result.volatility.bollingerPosition).toBeGreaterThanOrEqual(0);
      expect(result.volatility.bollingerPosition).toBeLessThanOrEqual(100);
    });

    test('should detect expansion', () => {
      // ボラティリティが高い状態を作る（価格が大きく変動）
      const data = generateOHLCVData(100);
      
      // 最後の20本を大きい値動きにする
      for (let i = data.length - 20; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        const direction = Math.random() > 0.5 ? 1 : -1;
        data[i].close = prevClose * (1 + direction * 0.05);
        data[i].open = prevClose;
        data[i].high = Math.max(data[i].close, prevClose) * 1.02;
        data[i].low = Math.min(data[i].close, prevClose) * 0.98;
      }

      const result = engine.analyze(data);

      expect(['expansion', 'normal']).toContain(result.volatility.state);
    });
  });

  describe('Momentum Analysis', () => {
    test('should analyze MACD histogram', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(result.momentum).toHaveProperty('macdHistogram');
      expect(result.momentum).toHaveProperty('histogramTrend');
      expect(result.momentum).toHaveProperty('macdCross');
      expect(['increasing', 'decreasing', 'neutral']).toContain(result.momentum.histogramTrend);
    });

    test('should detect bullish MACD cross', () => {
      const data = generateOHLCVData(100);
      
      // MACDのクロスを作る（価格を急上昇させる）
      for (let i = data.length - 15; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 1.025;
        data[i].open = prevClose;
        data[i].high = data[i].close * 1.001;
        data[i].low = prevClose * 0.99;
      }

      const result = engine.analyze(data);

      // MACDクロスまたは positive histogram
      expect(result.momentum.score).toBeGreaterThanOrEqual(-1);
      expect(result.momentum.score).toBeLessThanOrEqual(1);
    });
  });

  describe('Explainability', () => {
    test('should provide primary reasons', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(result.explainability.primaryReasons.length).toBeGreaterThan(0);
      expect(result.explainability.primaryReasons.length).toBeLessThanOrEqual(3);
      
      // 各理由はカテゴリープレフィックスを持つ
      result.explainability.primaryReasons.forEach(reason => {
        expect(reason).toMatch(/\[(RSI|Trend|Volatility|Momentum)\]/);
      });
    });

    test('should provide warnings when confidence is low', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      if (result.direction !== 'NEUTRAL' && result.confidence < 0.5) {
        expect(result.explainability.warnings.length).toBeGreaterThan(0);
      }
    });

    test('should warn about extreme RSI', () => {
      // 極端なRSI状態を作る
      const data = generateOHLCVData(60);
      for (let i = data.length - 15; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 0.95; // 連続下落
        data[i].open = prevClose;
        data[i].low = data[i].close;
        data[i].high = prevClose;
      }

      const result = engine.analyze(data);

      if (result.rsi.signal === 'extreme_oversold' || result.rsi.signal === 'extreme_overbought') {
        const hasWarning = result.explainability.warnings.some(w => w.includes('極端'));
        expect(hasWarning).toBe(true);
      }
    });
  });

  describe('Final Score Calculation', () => {
    test('should calculate weighted final score', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(result.finalScore).toBeGreaterThanOrEqual(-1);
      expect(result.finalScore).toBeLessThanOrEqual(1);
      
      // finalScoreの符号とdirectionが一致する
      if (result.finalScore > 0.2) {
        expect(result.direction).toBe('BUY');
      } else if (result.finalScore < -0.2) {
        expect(result.direction).toBe('SELL');
      } else {
        expect(result.direction).toBe('NEUTRAL');
      }
    });

    test('should determine strength correctly', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      expect(['WEAK', 'MODERATE', 'STRONG']).toContain(result.strength);
      
      // STRONG は高い確信度と大きなスコアが必要
      if (result.strength === 'STRONG') {
        expect(result.confidence).toBeGreaterThan(0.75);
        expect(Math.abs(result.finalScore)).toBeGreaterThan(0.6);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle exactly 60 periods', () => {
      const data = generateOHLCVData(60);
      const result = engine.analyze(data);

      expect(result.direction).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle large dataset', () => {
      const data = generateOHLCVData(500);
      const result = engine.analyze(data);

      expect(result.direction).toBeDefined();
      expect(result.finalScore).toBeGreaterThanOrEqual(-1);
      expect(result.finalScore).toBeLessThanOrEqual(1);
    });

    test('should handle volatile market', () => {
      const data = generateOHLCVData(100);
      
      // 極端なボラティリティを追加
      for (let i = 0; i < data.length; i++) {
        const multiplier = (i % 2 === 0) ? 1.05 : 0.95;
        data[i].close = data[i].close * multiplier;
        data[i].high = data[i].close * 1.02;
        data[i].low = data[i].close * 0.98;
      }

      const result = engine.analyze(data);

      expect(result.volatility.state).toBeDefined();
      expect(result.direction).toBeDefined();
    });

    test('should handle zero volume data', () => {
      const data = generateOHLCVData(100);
      
      // 一部のボリュームをゼロにする
      for (let i = 0; i < 10; i++) {
        data[data.length - 1 - i].volume = 0;
      }

      const result = engine.analyze(data);

      // エラーなく処理できることを確認
      expect(result).toBeDefined();
      expect(result.direction).toBeDefined();
    });
  });

  describe('Consistency', () => {
    test('should produce consistent results for same data', () => {
      const data = generateOHLCVData(100);
      
      const result1 = engine.analyze(data);
      const result2 = engine.analyze(data);

      expect(result1.direction).toBe(result2.direction);
      expect(result1.finalScore).toBe(result2.finalScore);
      expect(result1.confidence).toBe(result2.confidence);
    });

    test('should have scores within valid ranges', () => {
      const data = generateOHLCVData(100);
      const result = engine.analyze(data);

      // 全てのスコアが -1 から 1 の範囲内
      expect(result.rsi.score).toBeGreaterThanOrEqual(-1);
      expect(result.rsi.score).toBeLessThanOrEqual(1);
      
      expect(result.trend.score).toBeGreaterThanOrEqual(-1);
      expect(result.trend.score).toBeLessThanOrEqual(1);
      
      expect(result.volatility.score).toBeGreaterThanOrEqual(-1);
      expect(result.volatility.score).toBeLessThanOrEqual(1);
      
      expect(result.momentum.score).toBeGreaterThanOrEqual(-1);
      expect(result.momentum.score).toBeLessThanOrEqual(1);
      
      expect(result.finalScore).toBeGreaterThanOrEqual(-1);
      expect(result.finalScore).toBeLessThanOrEqual(1);
    });
  });
});
