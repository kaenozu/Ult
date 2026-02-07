import { DynamicWeightingService, ComponentPerformance } from '../DynamicWeightingService';

describe('DynamicWeightingService', () => {
  let service: DynamicWeightingService;

  beforeEach(() => {
    service = new DynamicWeightingService();
  });

  test('的中率が高いコンポーネントの重みが自動的に引き上げられること', () => {
    const baseWeights = { ai: 0.25, technical: 0.25, correlation: 0.25, supplyDemand: 0.25 };

    // AIの的中率が非常に高く、テクニカルが低いケース
    const performance: ComponentPerformance = {
      ai: { hitRate: 80 },        // 高精度
      technical: { hitRate: 20 }, // 低精度
      correlation: { hitRate: 50 },
      supplyDemand: { hitRate: 50 }
    };

    const optimized = service.optimize(baseWeights, performance);

    // AIの重みがベース(0.25)より増え、テクニカルが減っていることを確認
    expect(optimized.ai).toBeGreaterThan(0.25);
    expect(optimized.technical).toBeLessThan(0.25);

    // 合計が1.0であることを確認
    const sum = optimized.ai + optimized.technical + optimized.correlation + optimized.supplyDemand;
    expect(sum).toBeCloseTo(1.0);
  });

  test('パフォーマンスが未知(データ不足)の場合はベースの重みが維持されること', () => {
    const baseWeights = { ai: 0.4, technical: 0.2, correlation: 0.2, supplyDemand: 0.2 };
    const performance: ComponentPerformance = {
      ai: { hitRate: 0 },
      technical: { hitRate: 0 },
      correlation: { hitRate: 0 },
      supplyDemand: { hitRate: 0 }
    };

    const optimized = service.optimize(baseWeights, performance);
    expect(optimized).toEqual(baseWeights);
  });

  test('相場環境(Regime)に応じて、特定のコンポーネントにバイアスをかけられること', () => {
    const baseWeights = { ai: 0.25, technical: 0.25, correlation: 0.25, supplyDemand: 0.25 };
    const performance: ComponentPerformance = {
      ai: { hitRate: 50 },
      technical: { hitRate: 50 },
      correlation: { hitRate: 50 },
      supplyDemand: { hitRate: 50 }
    };

    // CRASH モードの時
    const optimized = service.optimize(baseWeights, performance, 'CRASH');

    // 期待値: 需給(supplyDemand)の重みが大幅に引き上げられていること
    expect(optimized.supplyDemand).toBeGreaterThan(0.4);
    // AIなどのトレンド追随型は抑制されていること
    expect(optimized.ai).toBeLessThan(0.2);
  });
});
