import React from 'react'

export interface KeyboardNavigationOptions {
  items: Array<{ id: string; element?: HTMLElement | null }>
  onSelect?: (id: string) => void
  onToggle?: (id: string) => void
  onNavigate?: (id: string, direction: 'up' | 'down' | 'home' | 'end') => void
  enabled?: boolean
  wrap?: boolean
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onToggle,
  onNavigate,
  enabled = true,
  wrap = false,
}: KeyboardNavigationOptions) {
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = React.useState(0)

  // Update focused index when focused ID changes
  React.useEffect(() => {
    if (!focusedId) return
    const index = items.findIndex(item => item.id === focusedId)
    if (index >= 0) {
      setFocusedIndex(index)
    }
  }, [focusedId, items])

  const moveFocus = React.useCallback(
    (direction: 'up' | 'down' | 'home' | 'end') => {
      if (!items.length) return

      let newIndex: number
      switch (direction) {
        case 'up':
          newIndex = focusedIndex - 1
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0
          }
          break
        case 'down':
          newIndex = focusedIndex + 1
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1
          }
          break
        case 'home':
          newIndex = 0
          break
        case 'end':
          newIndex = items.length - 1
          break
      }

      const newItem = items[newIndex]
      if (newItem) {
        setFocusedIndex(newIndex)
        setFocusedId(newItem.id)

        // Focus the element if available
        if (newItem.element) {
          newItem.element.focus()
        }

        // Callback for navigation
        onNavigate?.(newItem.id, direction)
      }
    },
    [focusedIndex, items, onNavigate, wrap]
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent | KeyboardEvent) => {
      if (!enabled || !items.length) return

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          moveFocus('up')
          break
        case 'ArrowDown':
          event.preventDefault()
          moveFocus('down')
          break
        case 'Home':
          event.preventDefault()
          moveFocus('home')
          break
        case 'End':
          event.preventDefault()
          moveFocus('end')
          break
        case 'Enter':
          if (focusedId && onSelect) {
            event.preventDefault()
            onSelect(focusedId)
          }
          break
        case ' ':
        case 'Space':
          if (focusedId && onToggle) {
            event.preventDefault()
            onToggle(focusedId)
          }
          break
        case 'Escape':
          // Let parent handle escape
          break
      }
    },
    [enabled, items, focusedId, moveFocus, onSelect, onToggle]
  )

  const setFocus = React.useCallback((id: string) => {
    const index = items.findIndex(item => item.id === id)
    if (index >= 0) {
      setFocusedId(id)
      setFocusedIndex(index)
      const item = items[index]
      if (item.element) {
        item.element.focus()
      }
    }
  }, [items])

  return {
    focusedId,
    focusedIndex,
    handleKeyDown,
    setFocus,
    moveFocus,
  }
}