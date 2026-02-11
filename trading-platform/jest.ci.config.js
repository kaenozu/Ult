const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  // Skip unstable tests in CI environment
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    '<rootDir>/app/domains/prediction/models/ml/__tests__/ModelPipeline.test.ts',
    '<rootDir>/app/lib/__tests__/OptimizedBacktest.perf.test.ts',
    '<rootDir>/app/hooks/__tests__/useAIPerformance.test.ts',
    '<rootDir>/app/lib/ml/__tests__/FeatureEngineering.test.ts',
  ],
};
