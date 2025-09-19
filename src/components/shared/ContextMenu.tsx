import React from 'react'
import { MoreVertical, Edit2, Trash2, Copy, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  action: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  onAction: (action: string) => void
  triggerIcon?: React.ReactNode
  className?: string
}

export function ContextMenu({ items, onAction, triggerIcon, className = '' }: ContextMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  const navigationItems = React.useMemo(
    () => items.filter(item => !item.separator).map(item => ({
      id: item.id,
      element: itemRefs.current[item.id],
    })),
    [items]
  )

  const { focusedId, handleKeyDown, setFocus } = useKeyboardNavigation({
    items: navigationItems,
    onSelect: (id) => {
      const item = items.find(i => i.id === id)
      if (item && !item.disabled) {
        onAction(item.action)
        setIsOpen(false)
      }
    },
    enabled: isOpen,
    wrap: true,
  })

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Focus first item when menu opens
  React.useEffect(() => {
    if (isOpen && items.length > 0) {
      const firstItem = items.find(item => !item.separator && !item.disabled)
      if (firstItem) {
        setTimeout(() => setFocus(firstItem.id), 0)
      }
    }
  }, [isOpen, items, setFocus])

  const handleTriggerClick = () => {
    setIsOpen(!isOpen)
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && !item.separator) {
      onAction(item.action)
      setIsOpen(false)
    }
  }

  return (
    <div className={`context-menu ${className}`} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        className="grid-row-menu-button"
        onClick={handleTriggerClick}
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {triggerIcon || <MoreVertical size={16} />}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="context-menu-dropdown"
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown as any}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 200,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-panel)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div
                  key={`separator-${index}`}
                  className="context-menu-separator"
                  style={{
                    height: 1,
                    background: 'var(--border)',
                    margin: '4px 0',
                  }}
                />
              )
            }

            const isActive = focusedId === item.id

            return (
              <button
                key={item.id}
                ref={el => { itemRefs.current[item.id] = el }}
                role="menuitem"
                tabIndex={isActive ? 0 : -1}
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
                className="context-menu-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 12px',
                  background: isActive ? 'var(--panel-2)' : 'transparent',
                  border: 'none',
                  color: item.danger ? 'var(--danger)' : item.disabled ? 'var(--muted)' : 'var(--text)',
                  fontSize: 14,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease-in-out',
                  textAlign: 'left',
                }}
                onMouseEnter={() => !item.disabled && setFocus(item.id)}
              >
                {item.icon && (
                  <span style={{ display: 'flex', alignItems: 'center', width: 16 }}>
                    {item.icon}
                  </span>
                )}
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Common context menu actions for KR rows
export const createKrContextMenuItems = (krId: string, options?: {
  canEdit?: boolean
  canDelete?: boolean
  hasInitiatives?: boolean
}): ContextMenuItem[] => {
  const { canEdit = true, canDelete = true, hasInitiatives = false } = options || {}

  const items: ContextMenuItem[] = [
    {
      id: 'edit',
      label: 'Edit KR',
      icon: <Edit2 size={14} />,
      action: `edit-kr-${krId}`,
      disabled: !canEdit,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy size={14} />,
      action: `duplicate-kr-${krId}`,
    },
    {
      id: 'sep1',
      separator: true,
      label: '',
      action: '',
    },
    {
      id: 'view-trends',
      label: 'View Trends',
      icon: <TrendingUp size={14} />,
      action: `view-trends-${krId}`,
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: <ExternalLink size={14} />,
      action: `export-kr-${krId}`,
    },
  ]

  if (hasInitiatives) {
    items.push({
      id: 'initiatives',
      label: 'Manage Initiatives',
      icon: <TrendingDown size={14} />,
      action: `manage-initiatives-${krId}`,
    })
  }

  if (canDelete) {
    items.push(
      {
        id: 'sep2',
        separator: true,
        label: '',
        action: '',
      },
      {
        id: 'delete',
        label: 'Delete KR',
        icon: <Trash2 size={14} />,
        action: `delete-kr-${krId}`,
        danger: true,
      }
    )
  }

  return items
}