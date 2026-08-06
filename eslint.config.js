const nodeGlobals = {
  AbortSignal: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
};

export default [
  {
    files: ['src/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
];
