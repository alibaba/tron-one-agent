module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'off', // Webpack project, not Vite
    // Defer unused variable enforcement to TypeScript (noUnusedLocals / noUnusedParameters)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    // Existing codebase uses `any` extensively; type safety is enforced by tsc strict mode
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
