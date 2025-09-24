import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import globals from 'globals'
import { fileURLToPath } from 'node:url'

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/build/**',
      '**/public/**',
      'tailwind.config.js',
      'postcss.config.js',
      'vite.config.ts',
      'playwright.config.ts',
      'scripts/check-literals.mjs',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir,
      },
    },
    plugins: {
      sonarjs,
    },
    rules: {
      // CRITICAL: Catch real bugs LLMs might introduce
      'no-unused-vars': 'off', // Use TypeScript's version
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'array-callback-return': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'require-await': 'warn',

      // CONSOLE: Warn but allow for development
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // MAGIC NUMBERS: Be pragmatic - add more common numbers
      'no-magic-numbers': ['warn', {
        ignore: [-6, -5, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 20, 24, 25, 30, 36, 40, 50, 60, 75, 90, 95, 100, 120, 200, 300, 365, 1000, 2018, 2024, 3600, 86400, 86400000], // Common safe values including dates, UI, time constants
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        enforceConst: false,
        detectObjects: false,
      }],

      // CODE QUALITY: Important but not blocking
      'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'warn',

      // TYPE SAFETY: Flexible for rapid development
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // SECURITY: Always error
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // TURNED OFF: Too strict for LLM development
      'no-restricted-properties': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        expect: true,
        test: true,
        describe: true,
        it: true,
        beforeEach: true,
        afterEach: true,
        vi: true,
      },
    },
    rules: {
      // Very relaxed in tests
      'no-console': 'off',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['server/**/*.{js,cjs,mjs}', 'scripts/**/*.{js,cjs,mjs}'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-console': 'off',
      'no-magic-numbers': 'off',
    },
  },
]