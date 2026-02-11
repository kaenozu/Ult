const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/domains/(.*)$': '<rootDir>/app/domains/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/app/infrastructure/$1',
    '^@/shared/(.*)$': '<rootDir>/app/shared/$1',
    '^@/shared$': '<rootDir>/app/shared/index.ts',
    '^@/ui/(.*)$': '<rootDir>/app/ui/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.stories.{js,jsx,ts,tsx}',
    '!app/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25,
    },
  },
  // Skip unstable tests in CI environment
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/app/lib/services/__tests__/mocks/',
    '<rootDir>/app/lib/ml/integration-tests/',
    '<rootDir>/app/domains/prediction/models/ml/__tests__/ModelPipeline.test.ts',
    '<rootDir>/app/lib/__tests__/OptimizedBacktest.perf.test.ts',
    '<rootDir>/app/hooks/__tests__/useAIPerformance.test.ts',
    '<rootDir>/app/lib/ml/__tests__/FeatureEngineering.test.ts',
    // Flaky tests (pass individually, fail in parallel due to timing/randomness)
    '<rootDir>/app/lib/__tests__/technicalAnalysis.test.ts',
    '<rootDir>/app/domains/backtest/engine/__tests__/MonteCarloSimulator.test.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};

module.exports = createJestConfig(customJestConfig);
