import { ServiceContainer, TOKENS } from './ServiceContainer';
import { MarketDataService } from '../MarketDataService';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { analysisService } from '../AnalysisService';
import { MarketDataHub } from '../data/MarketDataHub';

/**
 * サービスコンテナの初期化
 * すべての主要サービスを登録します。
 */
export function initializeContainer(): void {
  // Data Pipeline
  ServiceContainer.register(TOKENS.MarketDataHub, new MarketDataHub());

  // MarketDataService
  ServiceContainer.register(TOKENS.MarketDataService, new MarketDataService());
  
  // 他のサービスも同様に登録
  // ServiceContainer.register(TOKENS.TechnicalIndicatorService, technicalIndicatorService);
  // ServiceContainer.register(TOKENS.AnalysisService, analysisService);
  
  console.log('[DI] ServiceContainer initialized');
}
