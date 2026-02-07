import nextBase from 'eslint-config-next';

export default [
  {
    ignores: [
      "**/example*.ts",
      "**/example*.tsx",
      "**/examples/**",
      "**/Demo*.ts",
      "**/Demo*.tsx",
      "**/demo/**",
      "**/template/**",
      "**/fixtures.ts",
      "**/mock-*.ts",
      "**/test-*.ts",
      "app/strategy-optimization-example.ts",
      "app/performance-examples.ts",
      "app/performance-quickstart.ts",
      "app/WinningTradingSystem.ts",
      "coverage/**",
      "eslint.config.*",
      "playwright-report/**"
    ]
  },
  ...nextBase,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "prefer-const": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/ban-ts-comment": "error"
    }
  },
];
