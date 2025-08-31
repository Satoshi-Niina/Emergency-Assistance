module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true, ignoreRestArgs: true }],
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }]
  },
};
