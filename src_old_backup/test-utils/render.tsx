import React from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { StoreProvider } from '../state/store'

expect.extend(toHaveNoViolations)

type RenderOptions = {
  ui: React.ReactElement
  withStore?: boolean
  storeWrapper?: React.ComponentType<{ children: React.ReactNode }>
}

export async function renderWithProviders({ ui, withStore = true, storeWrapper: StoreWrapper }: RenderOptions) {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (withStore) {
      if (StoreWrapper) {
        return <StoreWrapper>{children}</StoreWrapper>
      }
      return <StoreProvider>{children}</StoreProvider>
    }
    return <>{children}</>
  }

  const utils = render(ui, { wrapper: Wrapper })
  const user = userEvent.setup()

  async function checkA11y(container: HTMLElement) {
    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  }

  return { ...utils, user, checkA11y }
}
