import React from 'react'
import clsx from 'clsx'
import { useDispatch, useStoreSelector } from '../state/store'
import { selectNavigationSnapshot, selectNavigationUIState } from '../state/selectors'
import type { NavigationItem, NavigationSection } from '../config/navigationMap'

// Navigation layout reference
// ┌────────────────────────────┐
// │ Primary quick links       │
// ├────────────────────────────┤
// │ Accordion workspace stack │
// └────────────────────────────┘
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
export function UnifiedNavigation() {
  const dispatch = useDispatch()
  const { sections, primaryItems, phase, currentView, match } = useStoreSelector(selectNavigationSnapshot)
  const navigationState = useStoreSelector(selectNavigationUIState)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const prefersReducedMotion = usePrefersReducedMotion()

  const headerRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const drawerRef = React.useRef<HTMLDivElement | null>(null)
  const lastFocusRef = React.useRef<HTMLElement | null>(null)
  const focusRestoreRef = React.useRef(true)

  const accordionSectionIds = React.useMemo(() => new Set(sections.map(section => section.id)), [sections])

  const activeSectionId = match?.sectionId ?? navigationState.activeSectionId ?? sections[0]?.id
  const [focusedHeaderIndex, setFocusedHeaderIndex] = React.useState(() => {
    if (!sections.length) return 0
    const idx = sections.findIndex(section => section.id === activeSectionId)
    return idx >= 0 ? idx : 0
  })

  React.useEffect(() => {
    if (!sections.length) return
    const idx = sections.findIndex(section => section.id === activeSectionId)
    if (idx >= 0 && idx !== focusedHeaderIndex) {
      setFocusedHeaderIndex(idx)
    }
  }, [sections, activeSectionId, focusedHeaderIndex])
  React.useEffect(() => {
    if (!activeSectionId) return
    if (!accordionSectionIds.has(activeSectionId)) return

    const filteredExpanded = navigationState.expandedSectionIds.filter(id => accordionSectionIds.has(id))
    const hasActiveExpanded = filteredExpanded.includes(activeSectionId)
    const isActiveAligned = navigationState.activeSectionId === activeSectionId
    if (hasActiveExpanded && isActiveAligned && filteredExpanded.length === 1) return

    const nextExpanded = hasActiveExpanded && filteredExpanded.length === 1 ? filteredExpanded : [activeSectionId]
    dispatch({
      type: 'SET_NAVIGATION_UI_STATE',
      navigation: {
        activeSectionId,
        expandedSectionIds: nextExpanded,
      },
    })
  }, [
    activeSectionId,
    accordionSectionIds,
    navigationState.expandedSectionIds,
    navigationState.activeSectionId,
    dispatch,
  ])
  React.useEffect(() => {
    if (!isDesktop || !navigationState.drawerOpen) return
    dispatch({ type: 'SET_NAVIGATION_UI_STATE', navigation: { drawerOpen: false } })
  }, [isDesktop, navigationState.drawerOpen, dispatch])
  const drawerOpen = !isDesktop && navigationState.drawerOpen
  const activeItemId = match?.item.id
  const closeDrawer = React.useCallback(
    (options?: { restoreFocus?: boolean }) => {
      focusRestoreRef.current = options?.restoreFocus ?? true
      dispatch({ type: 'SET_NAVIGATION_UI_STATE', navigation: { drawerOpen: false } })
    },
    [dispatch]
  )
  React.useEffect(() => {
    if (!drawerOpen) return
    focusRestoreRef.current = true
    const drawer = drawerRef.current
    if (!drawer) return

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    lastFocusRef.current = previouslyFocused

    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && focusable.length > 0) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer({ restoreFocus: true })
      }
    }

    drawer.addEventListener('keydown', handleKeyDown)
    first?.focus()

    return () => {
      drawer.removeEventListener('keydown', handleKeyDown)
      if (focusRestoreRef.current && lastFocusRef.current) {
        lastFocusRef.current.focus()
      }
    }
  }, [drawerOpen, closeDrawer])
  React.useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const main = document.querySelector<HTMLElement>('[data-app-shell-main]')
    const previousAriaHidden = main?.getAttribute('aria-hidden') ?? null
    const hadInert = main ? (main as any).inert : undefined
    if (main) {
      main.setAttribute('aria-hidden', 'true')
      try {
        ;(main as any).inert = true
      } catch {}
    }

    return () => {
      document.body.style.overflow = previousOverflow
      if (main) {
        if (previousAriaHidden) {
          main.setAttribute('aria-hidden', previousAriaHidden)
        } else {
          main.removeAttribute('aria-hidden')
        }
        try {
          if (hadInert === undefined) {
            delete (main as any).inert
          } else {
            ;(main as any).inert = hadInert
          }
        } catch {}
      }
    }
  }, [drawerOpen])
  const focusHeader = React.useCallback(
    (index: number) => {
      if (!sections.length) return
      const safeIndex = ((index % sections.length) + sections.length) % sections.length
      setFocusedHeaderIndex(safeIndex)
      const ref = headerRefs.current[safeIndex]
      ref?.focus()
    },
    [sections.length]
  )
  const handleSectionToggle = React.useCallback(
    (sectionId: string, isExpanded: boolean) => {
      const nextExpanded = isExpanded ? [] : [sectionId]
      dispatch({
        type: 'SET_NAVIGATION_UI_STATE',
        navigation: {
          expandedSectionIds: nextExpanded,
          activeSectionId: sectionId,
        },
      })
    },
    [dispatch]
  )

  const handleSectionKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number, sectionId: string, isExpanded: boolean) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          focusHeader(index + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          focusHeader(index - 1)
          break
        case 'Home':
          event.preventDefault()
          focusHeader(0)
          break
        case 'End':
          event.preventDefault()
          focusHeader(sections.length - 1)
          break
        case ' ':
        case 'Enter':
          event.preventDefault()
          handleSectionToggle(sectionId, isExpanded)
          break
      }
    },
    [focusHeader, handleSectionToggle, sections.length]
  )
  const handleItemSelect = React.useCallback(
    (item: NavigationItem, sectionId: string, options?: { restoreFocus?: boolean }) => {
      dispatch({ type: 'SET_VIEW_FILTER', filter: item.filter })
      if (item.phase) {
        dispatch({ type: 'SET_PHASE', phase: item.phase })
      }

      const isAccordionSection = accordionSectionIds.has(sectionId)
      const nextExpanded = isAccordionSection
        ? [sectionId]
        : navigationState.expandedSectionIds.filter(id => accordionSectionIds.has(id))
      const nextActiveSectionId = isAccordionSection ? sectionId : navigationState.activeSectionId

      dispatch({
        type: 'SET_NAVIGATION_UI_STATE',
        navigation: {
          activeSectionId: nextActiveSectionId,
          lastFocusedItemId: item.id,
          expandedSectionIds: nextExpanded,
        },
      })
      if (!isDesktop) {
        closeDrawer({ restoreFocus: options?.restoreFocus ?? false })
      }
    },
    [
      accordionSectionIds,
      closeDrawer,
      dispatch,
      isDesktop,
      navigationState.activeSectionId,
      navigationState.expandedSectionIds,
    ]
  )
  React.useEffect(() => {
    headerRefs.current = headerRefs.current.slice(0, sections.length)
  }, [sections.length])
  React.useEffect(() => {
    sections.forEach(section => {
      const el = sectionRefs.current[section.id]
      if (!el) return
      const isExpanded = navigationState.expandedSectionIds.includes(section.id) || section.id === activeSectionId
      if (isExpanded) {
        el.style.maxHeight = `${el.scrollHeight}px`
      } else {
        el.style.maxHeight = '0px'
      }
    })
  }, [sections, navigationState.expandedSectionIds, activeSectionId])
  const renderNavItem = (item: NavigationItem, sectionId: string, depth = 0): React.ReactNode => {
    const isFilterActive = activeItemId === item.id
    const isPhaseActive = item.phase ? item.phase === phase : false
    const isDashboardActive =
      !item.phase && item.id === 'primary-dashboard' && navigationState.lastFocusedItemId === item.id
    const isActive = isFilterActive || isPhaseActive || isDashboardActive
    const itemTransition = prefersReducedMotion ? '' : 'transition-colors duration-200 ease-in-out'
    const indicatorTransition = prefersReducedMotion ? '' : 'transition-opacity duration-200 ease-in-out'
    const style: React.CSSProperties | undefined = depth > 0
      ? { paddingInlineStart: `${16 + depth * 28}px` }
      : undefined
    const badge = typeof item.badge === 'number' ? item.badge : undefined

    return (
      <li key={item.id} className="list-none unified-navigation__item">
        <button
          type="button"
          onClick={() => handleItemSelect(item, sectionId, { restoreFocus: false })}
          className={clsx(
            'unified-navigation__item-button relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-[color:var(--text)] opacity-70 hover:opacity-100 focus-visible:opacity-100',
            itemTransition,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--panel)]',
            'hover:bg-[color:var(--nav-hover-bg)]',
            isActive && 'is-active bg-[color:var(--accent-50)] font-semibold opacity-100'
          )}
          aria-current={isActive ? 'page' : undefined}
          style={style}
        >
          <span
            aria-hidden
            className={clsx(
              'unified-navigation__item-indicator pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full',
              indicatorTransition,
              isActive ? 'bg-[color:var(--accent)] opacity-100' : 'bg-transparent opacity-0'
            )}
          />
          <span aria-hidden className="unified-navigation__item-icon flex w-5 shrink-0 items-center justify-center text-base">
            {item.icon ?? '📁'}
          </span>
          <span className="unified-navigation__item-copy flex min-w-0 flex-1 flex-col">
            <span className="truncate" title={item.label}>{item.label}</span>
            {item.meta?.subtitle && (
              <span className="truncate text-xs text-[color:var(--text-secondary)]">{item.meta.subtitle}</span>
            )}
          </span>
          {typeof badge === 'number' && (
            <span
              className={clsx(
                'unified-navigation__item-badge ms-auto inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
                isActive
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'bg-[color:var(--nav-badge-bg)] text-[color:var(--text-secondary)]'
              )}
              aria-label={`${badge} key result${badge === 1 ? '' : 's'}`}
            >
              {badge}
            </span>
          )}
        </button>
        {item.children?.length ? (
          <ul className="unified-navigation__child-list mt-3 space-y-3">
            {item.children.map(child => renderNavItem(child, sectionId, depth + 1))}
          </ul>
        ) : null}
      </li>
    )
  }
  const renderSection = (section: NavigationSection, index: number) => {
    const isExpanded = navigationState.expandedSectionIds.includes(section.id) || section.id === activeSectionId
    const sectionId = `nav-section-${section.id}`
    const buttonId = `${sectionId}-header`
    const rotationClass = prefersReducedMotion ? '' : 'transition-transform duration-200 ease-in-out'

    return (
      <div key={section.id} className="unified-navigation__section border-b border-[color:var(--border)] pb-3 last:border-b-0 last:pb-0">
        <button
          ref={el => {
            headerRefs.current[index] = el
          }}
          id={buttonId}
          type="button"
          className={clsx(
            'unified-navigation__section-header flex w-full items-center gap-3 rounded-md px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]',
            prefersReducedMotion ? '' : 'transition-colors duration-200 ease-in-out',
            isExpanded && 'is-active text-[color:var(--text)]'
          )}
          aria-expanded={isExpanded}
          aria-controls={sectionId}
          onClick={() => handleSectionToggle(section.id, isExpanded)}
          onKeyDown={event => handleSectionKeyDown(event, index, section.id, isExpanded)}
          onFocus={() => setFocusedHeaderIndex(index)}
          tabIndex={focusedHeaderIndex === index ? 0 : -1}
        >
          <span aria-hidden className="unified-navigation__section-icon flex w-5 shrink-0 items-center justify-center text-base">
            {section.icon ?? '📁'}
          </span>
          <span className="truncate">{section.label}</span>
          <span
            aria-hidden
            className={clsx(
              'unified-navigation__section-caret ml-auto text-base text-[color:var(--muted)]',
              rotationClass,
              isExpanded ? 'rotate-180' : 'rotate-0'
            )}
          >
            ▾
          </span>
        </button>
        <div
          id={sectionId}
          role="region"
          aria-labelledby={buttonId}
          aria-hidden={!isExpanded}
          ref={el => {
            sectionRefs.current[section.id] = el
            if (el) {
              el.style.maxHeight = isExpanded ? `${el.scrollHeight}px` : '0px'
            }
          }}
          className={clsx(
            'unified-navigation__section-body overflow-hidden',
            prefersReducedMotion ? '' : 'transition-[max-height] duration-200 ease-in-out'
          )}
        >
          <div
            className={clsx(
              'unified-navigation__section-content mt-3 space-y-3',
              prefersReducedMotion ? '' : 'transition-opacity duration-200 ease-in-out',
              isExpanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            <ul className="unified-navigation__item-list space-y-3">
              {section.items.map(item => renderNavItem(item, section.id))}
            </ul>
          </div>
        </div>
      </div>
    )
  }
  const renderNavigationContent = (variant: 'desktop' | 'mobile') => (
    <nav aria-label="Workspace navigation" className="unified-navigation__container flex h-full flex-col">
      <div
        className={clsx(
          'unified-navigation__scroll flex-1 overflow-y-auto',
          variant === 'mobile' ? 'px-4 pb-8 pt-4' : 'px-3 pb-6 pt-3'
        )}
      >
        {primaryItems.length > 0 && (
          <div className={clsx('unified-navigation__primary', variant === 'desktop' ? 'px-1' : undefined)}>
            <ul className="flex flex-col gap-3">
              {primaryItems.map(item => renderNavItem(item, item.sectionId))}
            </ul>
          </div>
        )}
        <div className="unified-navigation__sections flex flex-col gap-5">
          {sections.map((section, index) => renderSection(section, index))}
        </div>
      </div>
    </nav>
  )
  return (
    <>
      {drawerOpen && (
        <div className="unified-navigation__drawer" role="presentation">
          <div
            className={clsx(
              'unified-navigation__backdrop',
              prefersReducedMotion ? '' : 'transition-opacity duration-200 ease-in-out',
              drawerOpen ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => closeDrawer({ restoreFocus: true })}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            id="unified-navigation-drawer"
            className={clsx(
              'unified-navigation__drawer-panel',
              prefersReducedMotion ? 'is-static' : 'is-entering'
            )}
            data-motion={prefersReducedMotion ? 'static' : 'enter'}
          >
            <div className="unified-navigation__drawer-header">
              <span className="unified-navigation__drawer-title">Navigation</span>
              <button
                type="button"
                className="unified-navigation__drawer-close"
                onClick={() => closeDrawer({ restoreFocus: true })}
              >
                <span aria-hidden>✕</span>
                <span className="sr-only">Close navigation</span>
              </button>
            </div>
            {renderNavigationContent('mobile')}
          </div>
        </div>
      )}

      <aside className="unified-navigation hidden lg:flex lg:h-screen lg:w-[240px] lg:flex-col lg:border-r lg:border-[color:var(--border)] lg:bg-[color:var(--panel)] lg:px-4 lg:py-5">
        {renderNavigationContent('desktop')}
      </aside>
    </>
  )
}
type NavigationToggleProps = {
  className?: string
  label?: string
}

export function UnifiedNavigationToggle({ className, label = 'Open navigation' }: NavigationToggleProps) {
  const dispatch = useDispatch()
  const navigationState = useStoreSelector(selectNavigationUIState)

  return (
    <button
      type="button"
      className={clsx(
        'navigation-toggle inline-flex min-h-[44px] min-w-[44px] items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] shadow-sm hover:bg-[color:var(--nav-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--panel)] lg:hidden',
        className
      )}
      aria-haspopup="dialog"
      aria-controls="unified-navigation-drawer"
      aria-expanded={navigationState.drawerOpen}
      onClick={() => dispatch({ type: 'SET_NAVIGATION_UI_STATE', navigation: { drawerOpen: true } })}
    >
      <span aria-hidden className="flex h-11 w-11 items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}

function useMediaQuery(query: string) {
  const getMatches = React.useCallback(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(query).matches
  }, [query])

  const [matches, setMatches] = React.useState(getMatches)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(query)
    const listener = () => setMatches(media.matches)
    listener()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
    media.addListener(listener)
    return () => media.removeListener(listener)
  }, [query])

  return matches
}

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => setPrefers(media.matches)
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
    media.addListener(listener)
    return () => media.removeListener(listener)
  }, [])

  return prefers
}
