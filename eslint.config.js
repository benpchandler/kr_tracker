import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: new URL('.', import.meta.url),
      },
    },
    plugins: {
      sonarjs,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-magic-numbers': ['error', {
        ignoreArrayIndexes: true,
        ignore: [0, 1, -1, 2, 7, 24, 60, 100, 120, 320],
        ignoreDefaultValues: true,
        enforceConst: true,
      }],
      'sonarjs/no-duplicate-string': ['error', {
        threshold: 3,
      }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^https?:\\/\\//]",
          message: 'Move raw URL literals into src/config.ts',
        },
        {
          selector: "Literal[value=/kr-tracker-state-v[0-9]+/i]",
          message: 'Use STORAGE_KEY from src/config.ts instead of duplicating the storage key literal.',
        },
        {
          selector: "Literal[value=/0\\.99|0\\.95/]/",
          message: 'Use HEALTH_THRESHOLDS from src/config.ts for health bands.',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use deterministic helpers or inject randomness for testability.',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        expect: true,
        test: true,
      },
    },
  },
]
