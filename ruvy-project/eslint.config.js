export default [
  {
    files: ['app.js', 'scripts/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: Object.fromEntries(
        [
          'document',
          'window',
          'matchMedia',
          'innerHeight',
          'requestAnimationFrame',
          'scrollY',
          'IntersectionObserver',
          'URL',
          'console',
          'process',
        ].map((name) => [name, 'readonly']),
      ),
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'valid-typeof': 'error',
      eqeqeq: 'error',
    },
  },
];
