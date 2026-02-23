export * from './types';
export * from './analyzer';

import { createSingleton } from '../../utils/singleton';
import { WalkForwardAnalyzer } from './analyzer';

const { getInstance, resetInstance } = createSingleton(
  (config?: Parameters<typeof WalkForwardAnalyzer>[0]) => new WalkForwardAnalyzer(config)
);

export const getGlobalWalkForwardAnalyzer = getInstance;
export const resetGlobalWalkForwardAnalyzer = resetInstance;

export default WalkForwardAnalyzer;
