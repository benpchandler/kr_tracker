import React from 'react'
import { createPortal } from 'react-dom'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const dialogStyle: React.CSSProperties = {
  width: 'min(420px, 90vw)',
  background: 'var(--panel, #ffffff)',
  color: 'var(--text-primary, #0f172a)',
  borderRadius: 12,
  padding: '24px',
  boxShadow: 'var(--shadow-lg, 0 20px 45px rgba(15, 23, 42, 0.2))',
  display: 'grid',
  gap: 16,
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const node = React.useMemo(() => (typeof document !== 'undefined' ? document.createElement('div') : null), [])
  const dialogRef = React.useRef<HTMLDivElement | null>(null)
  const cancelRef = React.useRef<HTMLButtonElement | null>(null)
  const confirmRef = React.useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!node || typeof document === 'undefined') return
    document.body.appendChild(node)
    return () => {
      document.body.removeChild(node)
    }
  }, [node])

  React.useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  React.useEffect(() => {
    if (!open) return
    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusTarget = cancelRef.current ?? confirmRef.current ?? dialogRef.current
    focusTarget?.focus()
    return () => {
      const previous = previouslyFocusedElement.current
      if (previous && typeof previous.focus === 'function') {
        previous.focus()
      }
    }
  }, [open])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
      return
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    }
  }

  if (!open || !node) return null

  const confirmStyle: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    background: destructive ? 'var(--danger, #dc2626)' : 'var(--accent, #2563eb)',
    color: '#ffffff',
    cursor: 'pointer',
  }

  const cancelStyle: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
    background: 'transparent',
    color: 'var(--text-primary, #0f172a)',
    cursor: 'pointer',
  }

  const content = (
    <div style={overlayStyle} role="presentation" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-confirm-title"
        aria-describedby={description ? 'wizard-confirm-description' : undefined}
        style={dialogStyle}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div>
          <h3 id="wizard-confirm-title" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
          {description && (
            <p id="wizard-confirm-description" style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary, #475569)' }}>
              {description}
            </p>
          )}
        </div>
        <div style={buttonRowStyle}>
          <button ref={cancelRef} type="button" onClick={onCancel} style={cancelStyle}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              onConfirm()
            }}
            style={confirmStyle}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, node)
}
