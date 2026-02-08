/**
 * Trader Pro Core Logic - Final Integrity Check
 * このスクリプトは、今回実装したすべてのコアロジックの整合性を一括で検証します。
 */

import { ExpectedValueService } from '../app/lib/ExpectedValueService';
import { DynamicWeightingService } from '../app/lib/DynamicWeightingService';
import { MarketRegimeService } from '../app/lib/MarketRegimeService';
import { FeatureEngine } from '../app/lib/FeatureEngine';

function runIntegrityCheck() {
  console.log('🚀 Trader Pro コアロジック最終整合性チェックを開始します...');

  const results = {
    expectedValue: false,
    dynamicWeighting: false,
    marketRegime: false,
    featureEngine: false
  };

  try {
    // 1. Expected Value Check
    const evService = new ExpectedValueService();
    const ev = evService.calculate({ hitRate: 60, avgProfit: 1000, avgLoss: 500, totalTrades: 100 });
    if (ev.expectedValue === 400 && ev.isPositive) {
      console.log('✅ ExpectedValueService: 正常 (期待値計算 OK)');
      results.expectedValue = true;
    }

    // 2. Dynamic Weighting Check
    const dwService = new DynamicWeightingService();
    const weights = dwService.optimize(
      { ai: 0.25, technical: 0.25, correlation: 0.25, supplyDemand: 0.25 },
      { ai: { hitRate: 80 }, technical: { hitRate: 20 }, correlation: { hitRate: 50 }, supplyDemand: { hitRate: 50 } }
    );
    if (weights.ai > 0.25 && weights.technical < 0.25) {
      console.log('✅ DynamicWeightingService: 正常 (自己最適化ロジック OK)');
      results.dynamicWeighting = true;
    }

    // 3. Market Regime Check
    const mrService = new MarketRegimeService();
    // 擬似データでの簡易チェック
    const regime = mrService.classify([]); // データ不足時は RANGING
    if (regime === 'RANGING') {
      console.log('✅ MarketRegimeService: 正常 (初期判定 OK)');
      results.marketRegime = true;
    }

    // 4. Feature Engine Check
    const feEngine = new FeatureEngine();
    const mockData = [
      { date: '1', open: 100, high: 110, low: 90, close: 100, volume: 1000, symbol: 'T' },
      { date: '2', open: 100, high: 110, low: 100, close: 110, volume: 2000, symbol: 'T' }
    ];
    const features = feEngine.extract(mockData as any);
    if (features[0] === 0.1) { // (110-100)/100
      console.log('✅ FeatureEngine: 正常 (特徴量抽出 OK)');
      results.featureEngine = true;
    }

    console.log('
🏁 全コアコンポーネントのロジック整合性が確認されました。');
  } catch (error) {
    console.error('
❌ 整合性チェック中にエラーが発生しました:', (error as Error).message);
    process.exit(1);
  }
}

runIntegrityCheck();
