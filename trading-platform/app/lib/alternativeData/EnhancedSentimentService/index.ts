export * from './types';
export * from './service';

import { createSingleton } from '../../utils/singleton';
import { getGlobalDataCollector } from '../DataCollector';
import { getGlobalSentimentEngine } from '../../sentiment/SentimentAnalysisEngine';
import { EnhancedSentimentService } from './service';
import { EnhancedSentimentConfig } from './types';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<EnhancedSentimentConfig>) => {
    const collector = getGlobalDataCollector();
    const engine = getGlobalSentimentEngine();
    return new EnhancedSentimentService(collector, engine, config);
  }
);

export const getGlobalEnhancedSentimentService = getInstance;
export const resetGlobalEnhancedSentimentService = resetInstance;

export default EnhancedSentimentService;
