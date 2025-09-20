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
        project: true,
        tsconfigRootDir,
      },
    },
    plugins: {
      sonarjs,
    },
    rules: {
      // Temporarily loosen strict rules until legacy code is cleaned up.
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-magic-numbers': 'off',
      'sonarjs/no-duplicate-string': 'off',
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
