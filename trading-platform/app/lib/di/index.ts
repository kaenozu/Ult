/**
 * DI Registration
 * 
 * すべてのサービスをDIコンテナに登録
 */

import { container } from './container';
import { TOKENS } from './tokens';
import { MockApiClient } from '../testing/mock-api-client';
import { TestPredictionService } from '../testing/test-prediction-service';

// テスト環境での登録
export function registerTestServices(): void {
  container.registerSingleton(TOKENS.ApiClient, () => new MockApiClient());
  container.registerSingleton(TOKENS.PredictionService, () => new TestPredictionService());
}

// 本番環境での登録（実際のサービスを登録）
export function registerProductionServices(): void {
  // 実際のサービス実装をここで登録
  // container.registerSingleton(TOKENS.ApiClient, () => new RealApiClient());
  // container.registerSingleton(TOKENS.PredictionService, () => new AdvancedPredictionService());
}

export { container, TOKENS };
export * from './container';
export * from './tokens';
