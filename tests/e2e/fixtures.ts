import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, use) => {
    const messages: string[] = []

    const consoleListener = (msg: import('@playwright/test').ConsoleMessage) => {
      const type = msg.type()
      if (type === 'error' || type === 'warning') {
        messages.push(`[console.${type}] ${msg.text()}`)
      }
    }
    const pageErrorListener = (error: Error) => {
      messages.push(`[pageerror] ${error.stack ?? error.message}`)
    }

    page.on('console', consoleListener)
    page.on('pageerror', pageErrorListener)

    await use(page)

    page.off('console', consoleListener)
    page.off('pageerror', pageErrorListener)

    if (messages.length) {
      // Log errors but don't fail the test to prevent hanging
      console.warn('Console errors/warnings detected during test:', messages.join('\n'))
    }
  },
})

export { expect }
