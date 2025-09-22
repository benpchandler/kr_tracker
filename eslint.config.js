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
      // Enforce console usage policy: allow warn and error only.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Allow transitional any but encourage reduction later.
      '@typescript-eslint/no-explicit-any': 'off',

      // Warn on unused vars, ignore underscore-prefixed.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Enforce no magic numbers with practical exceptions.
      'no-magic-numbers': ['error', {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false,
      }],

      // Duplicate strings allowed up to threshold of 3.
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],

      'no-empty': ['error', { allowEmptyCatch: false }],
      'prefer-const': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-restricted-properties': 'off',
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
    rules: {
      'no-unexpected-multiline': 'off',
      // Allow console in tests for debugging output
      'no-console': 'off',
      // Looser stance on magic numbers in tests
      'no-magic-numbers': 'warn',
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
    },
  },
]
