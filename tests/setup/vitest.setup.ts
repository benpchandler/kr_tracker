import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

process.env.TZ = 'UTC'

type ConsoleMethod = 'error' | 'warn'

const consoleMessages: Record<ConsoleMethod, string[]> = {
  error: [],
  warn: [],
}
const listeners: (() => void)[] = []
let consoleSpies: Partial<Record<ConsoleMethod, ReturnType<typeof vi.spyOn>>> = {}
const unhandledErrors: string[] = []

function pushConsoleMessage(kind: ConsoleMethod, args: unknown[]) {
  const serialized = args
    .map(arg => {
      if (arg instanceof Error) return arg.stack ?? arg.message
      if (typeof arg === 'object') return JSON.stringify(arg)
      return String(arg)
    })
    .join(' ')
  consoleMessages[kind].push(serialized)
}

function registerGlobalGuards() {
  const rejectHandler = (event: PromiseRejectionEvent | PromiseRejectionEventInit | Error) => {
    const reason = (event as PromiseRejectionEvent).reason ?? event
    if (reason instanceof Error) {
      unhandledErrors.push(`[unhandledrejection] ${reason.stack ?? reason.message}`)
    } else {
      unhandledErrors.push(`[unhandledrejection] ${String(reason)}`)
    }
  }

  const errorHandler = (event: ErrorEvent | Event) => {
    if ('error' in event && event.error instanceof Error) {
      unhandledErrors.push(`[error] ${event.error.stack ?? event.error.message}`)
    } else if ('message' in event) {
      unhandledErrors.push(`[error] ${(event as ErrorEvent).message}`)
    }
  }

  process.on('unhandledRejection', rejectHandler)
  listeners.push(() => process.off('unhandledRejection', rejectHandler))

  if (typeof window !== 'undefined') {
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectHandler as EventListener)
    listeners.push(() => {
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', rejectHandler as EventListener)
    })
  }
}

beforeAll(() => {
  consoleSpies = {
    error: vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => pushConsoleMessage('error', args)),
    warn: vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => pushConsoleMessage('warn', args)),
  }
  registerGlobalGuards()
})

afterEach(() => {
  const failures: string[] = []
  if (consoleMessages.error.length) failures.push(...consoleMessages.error.map(msg => `console.error: ${msg}`))
  if (consoleMessages.warn.length) failures.push(...consoleMessages.warn.map(msg => `console.warn: ${msg}`))
  if (unhandledErrors.length) failures.push(...unhandledErrors)

  consoleMessages.error.length = 0
  consoleMessages.warn.length = 0
  unhandledErrors.length = 0

  if (failures.length) {
    throw new Error(failures.join('\n'))
  }
})

afterAll(() => {
  (consoleSpies.error)?.mockRestore();
  (consoleSpies.warn)?.mockRestore();
  listeners.forEach(dispose => dispose());
  listeners.length = 0
})

if (!('useFakeTimers' in globalThis)) {
  Object.defineProperty(globalThis, 'useFakeTimers', {
    configurable: false,
    enumerable: false,
    value: (dateISO?: string) => {
      vi.useFakeTimers()
      if (dateISO) vi.setSystemTime(new Date(dateISO))
    },
  })
}

if (!('useRealTimers' in globalThis)) {
  Object.defineProperty(globalThis, 'useRealTimers', {
    configurable: false,
    enumerable: false,
    value: () => {
      vi.useRealTimers()
    },
  })
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error assign stub
  globalThis.ResizeObserver = ResizeObserverStub
}

declare global {
  // Simple helpers to make timer usage less verbose in specs
  // eslint-disable-next-line no-var
  var useFakeTimers: (dateISO?: string) => void
  // eslint-disable-next-line no-var
  var useRealTimers: () => void
}
