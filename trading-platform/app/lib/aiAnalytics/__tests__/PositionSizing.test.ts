/**
 * PredictiveAnalyticsEngine Position Sizing Tests
 * 
 * Tests for the position sizing calculator functionality
 */

import PredictiveAnalyticsEngine, { PositionSizingInput } from '../PredictiveAnalyticsEngine';

describe('PredictiveAnalyticsEngine - Position Sizing', () => {
  let engine: PredictiveAnalyticsEngine;

  beforeEach(() => {
    engine = new PredictiveAnalyticsEngine();
  });

  describe('calculatePositionSize', () => {
    it('should calculate basic position size correctly', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,  // 100万円
        riskPerTrade: 2,          // 2%
        entryPrice: 1500,         // 1500円
        stopLossPrice: 1450,      // 1450円 (50円の損切り)
      };

      const result = engine.calculatePositionSize(input);

      // リスク金額 = 1,000,000 * 0.02 = 20,000円
      // 1株あたりリスク = 50円
      // 推奨株数 = 20,000 / 50 = 400株
      expect(result.recommendedShares).toBe(400);
      expect(result.maxLossAmount).toBe(20000);
      expect(result.stopLossDistance).toBe(50);
      expect(result.stopLossPercent).toBeCloseTo(3.33, 1);
      expect(result.positionValue).toBe(600000);
      expect(result.riskPercent).toBe(2);
    });

    it('should apply confidence adjustment when confidence < 70%', () => {
      const highConfidence: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1000,
        stopLossPrice: 950,
        confidence: 80,
      };

      const lowConfidence: PositionSizingInput = {
        ...highConfidence,
        confidence: 50,
      };

      const highResult = engine.calculatePositionSize(highConfidence);
      const lowResult = engine.calculatePositionSize(lowConfidence);

      // 信頼度が低い場合は株数が減少する
      expect(lowResult.recommendedShares).toBeLessThan(highResult.recommendedShares);
      expect(lowResult.recommendedShares).toBeCloseTo(highResult.recommendedShares * 0.5, -1);
    });

    it('should not adjust for high confidence (>= 70%)', () => {
      const normalInput: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1000,
        stopLossPrice: 950,
      };

      const highConfidenceInput: PositionSizingInput = {
        ...normalInput,
        confidence: 90,
      };

      const normalResult = engine.calculatePositionSize(normalInput);
      const highConfidenceResult = engine.calculatePositionSize(highConfidenceInput);

      // 高信頼度では調整されない（同じ株数）
      expect(highConfidenceResult.recommendedShares).toBe(normalResult.recommendedShares);
    });

    it('should handle small stop loss distances', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1000,
        stopLossPrice: 995,  // わずか5円の損切り
      };

      const result = engine.calculatePositionSize(input);

      // リスク金額 = 20,000円
      // 1株あたりリスク = 5円
      // 推奨株数 = 20,000 / 5 = 4,000株
      expect(result.recommendedShares).toBe(4000);
      expect(result.stopLossDistance).toBe(5);
    });

    it('should handle large stop loss distances', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1000,
        stopLossPrice: 800,  // 200円の大きな損切り
      };

      const result = engine.calculatePositionSize(input);

      // リスク金額 = 20,000円
      // 1株あたりリスク = 200円
      // 推奨株数 = 20,000 / 200 = 100株
      expect(result.recommendedShares).toBe(100);
      expect(result.stopLossDistance).toBe(200);
      expect(result.stopLossPercent).toBe(20);
    });

    it('should calculate correctly for different risk percentages', () => {
      const baseInput: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 1,  // 1%
        entryPrice: 1000,
        stopLossPrice: 950,
      };

      const result1 = engine.calculatePositionSize(baseInput);
      
      const result2 = engine.calculatePositionSize({
        ...baseInput,
        riskPerTrade: 3,  // 3%
      });

      // 3%リスクは1%リスクの3倍の株数になる
      expect(result2.recommendedShares).toBe(result1.recommendedShares * 3);
    });

    it('should include proper reasoning in the result', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1500,
        stopLossPrice: 1450,
        confidence: 60,
      };

      const result = engine.calculatePositionSize(input);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some(r => r.includes('エントリー価格'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('損切り価格'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('許容リスク額'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('信頼度'))).toBe(true);
    });

    it('should warn about low share counts', () => {
      const input: PositionSizingInput = {
        accountEquity: 100000,  // 10万円の少額資金
        riskPerTrade: 1,
        entryPrice: 5000,      // 高額株
        stopLossPrice: 4900,
      };

      const result = engine.calculatePositionSize(input);

      expect(result.recommendedShares).toBeLessThan(100);
      expect(result.reasoning.some(r => r.includes('⚠️'))).toBe(true);
      expect(result.reasoning.some(r => r.includes('100株未満'))).toBe(true);
    });

    it('should warn about high position concentration', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 5,  // 高めのリスク
        entryPrice: 1000,
        stopLossPrice: 950,
      };

      const result = engine.calculatePositionSize(input);

      const positionPercent = (result.positionValue / input.accountEquity) * 100;
      
      if (positionPercent > 20) {
        expect(result.reasoning.some(r => r.includes('⚠️'))).toBe(true);
        expect(result.reasoning.some(r => r.includes('口座資金の'))).toBe(true);
      }
    });

    it('should handle edge case: zero stop loss distance', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1000,
        stopLossPrice: 1000,  // 同じ価格（ゼロリスク）
      };

      const result = engine.calculatePositionSize(input);

      // ゼロ除算を避けるため、無限大にならないこと
      expect(result.recommendedShares).toBeDefined();
      expect(isFinite(result.recommendedShares)).toBe(true);
    });

    it('should calculate position value correctly', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1500,
        stopLossPrice: 1450,
      };

      const result = engine.calculatePositionSize(input);

      // ポジション価値 = 推奨株数 × エントリー価格
      expect(result.positionValue).toBe(result.recommendedShares * input.entryPrice);
    });

    it('should maintain risk percentage accuracy', () => {
      const input: PositionSizingInput = {
        accountEquity: 1000000,
        riskPerTrade: 2,
        entryPrice: 1234,
        stopLossPrice: 1180,
      };

      const result = engine.calculatePositionSize(input);

      // 実際のリスク率が設定値に近いこと（端数処理の影響で完全一致しない場合がある）
      expect(result.riskPercent).toBeCloseTo(input.riskPerTrade, 0);
    });
  });
});
