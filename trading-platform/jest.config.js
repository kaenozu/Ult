const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  // transform: {
  //   '^.+\\.(ts|tsx)$': 'babel-jest',
  // },
  moduleNameMapper: {
    // Handle module aliases
    '^@/domains/(.*)$': '<rootDir>/app/domains/$1',
    '^@/infrastructure/(.*)$': '<rootDir>/app/infrastructure/$1',
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
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/app/lib/services/__tests__/mocks/',
    '<rootDir>/app/lib/ml/integration-tests/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(lightweight-charts)/)',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
