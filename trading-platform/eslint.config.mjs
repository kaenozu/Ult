import nextBase from 'eslint-config-next';

export default [
  ...nextBase,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "prefer-const": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "warn",
    }
  },
];
