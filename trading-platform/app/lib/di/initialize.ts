import { ServiceContainer, TOKENS } from './ServiceContainer';
import { MarketDataService } from '../MarketDataService';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { analysisService } from '../AnalysisService';
import { MarketDataHub } from '../data/MarketDataHub';
import { AutoScreener } from '../universe/AutoScreener';
import { DriftDetector } from '../ml/DriftDetector';
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';

/**
 * サービスコンテナの初期化
 * すべての主要サービスを登録します。
 */
export function initializeContainer(): void {
  // Data Pipeline
  const dataHub = new MarketDataHub();
  ServiceContainer.register(TOKENS.MarketDataHub, dataHub);

  // Analysis & Intelligence
  ServiceContainer.register(TOKENS.AutoScreener, new AutoScreener(dataHub));
  ServiceContainer.register(TOKENS.DriftDetector, new DriftDetector({ threshold: 0.1, minWindowSize: 10 }));

  // MarketDataService
  ServiceContainer.register(TOKENS.MarketDataService, new MarketDataService());
  
  // 他のサービスも同様に登録
  // ServiceContainer.register(TOKENS.TechnicalIndicatorService, technicalIndicatorService);
  // ServiceContainer.register(TOKENS.AnalysisService, analysisService);
  
  devLog('[DI] ServiceContainer initialized');
}
