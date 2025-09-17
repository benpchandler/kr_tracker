declare module 'jest-axe' {
  export interface AxeViolation {
    id: string
    impact?: string
    description: string
    help: string
    helpUrl: string
    nodes: Array<Record<string, unknown>>
  }

  export interface AxeResults {
    violations: AxeViolation[]
    passes: AxeViolation[]
    incomplete: AxeViolation[]
    inapplicable: AxeViolation[]
  }

  export interface AxeConfigureOptions {
    rules?: Record<string, unknown>
    checks?: Record<string, unknown>
    branding?: Record<string, unknown>
  }

  export type AxeRunOptions = Record<string, unknown>

  export function axe(node?: unknown, options?: AxeRunOptions): Promise<AxeResults>
  export function configureAxe(config?: AxeConfigureOptions): typeof axe
}

declare module 'jest-axe/extend-expect'

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): void
  }
  interface AsymmetricMatchers<T = any> {
    toHaveNoViolations(): void
  }
}
