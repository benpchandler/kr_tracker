import '@testing-library/jest-dom/vitest'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = any> extends TestingLibraryMatchers<T, any> {}
  interface AsymmetricMatchers<T = any> extends TestingLibraryMatchers<T, any> {}
}
