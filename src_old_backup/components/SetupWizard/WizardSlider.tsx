import React from 'react'

export type WizardSliderProps = {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  ariaLabel?: string
  unitLabel?: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function WizardSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  ariaLabel,
  unitLabel,
}: WizardSliderProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const activePointer = React.useRef<number | null>(null)
  const percent = ((value - min) / (max - min)) * 100
  const roundedPercent = Number.isFinite(percent) ? clamp(percent, 0, 100) : 0

  const updateFromClientX = React.useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width
      const nextValue = clamp(min + ratio * (max - min), min, max)
      const snapped = Math.round(nextValue / step) * step
      onChange(clamp(snapped, min, max))
    },
    [min, max, step, onChange],
  )

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      activePointer.current = event.pointerId
      updateFromClientX(event.clientX)
      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== activePointer.current) return
        updateFromClientX(moveEvent.clientX)
      }
      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== activePointer.current) return
        activePointer.current = null
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleUp)
      }
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
    },
    [updateFromClientX],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let delta = 0
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = step
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -step
      if (!delta) return
      event.preventDefault()
      const multiplier = event.shiftKey ? 10 : 1
      const next = clamp(value + delta * multiplier, min, max)
      onChange(next)
    },
    [value, min, max, step, onChange],
  )

  return (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={unitLabel ? `${value} ${unitLabel}` : String(value)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', padding: '12px 0', outline: 'none' }}
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        style={{
          position: 'relative',
          height: 6,
          borderRadius: 999,
          cursor: 'pointer',
          background: 'linear-gradient(90deg, #dc2626 0%, #d97706 50%, #16a34a 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -34,
            left: `${roundedPercent}%`,
            transform: 'translate(-50%, -100%)',
            background: 'var(--panel, rgba(17, 24, 39, 0.92))',
            color: 'var(--text-primary, #fff)',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 12,
            boxShadow: 'var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.1))',
            pointerEvents: 'none',
          }}
        >
          {Math.round(value)}{unitLabel ? ` ${unitLabel}` : ''}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${roundedPercent}%`,
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.25)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${roundedPercent}%`,
            transform: 'translate(-50%, -50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.24)',
          }}
        />
      </div>
    </div>
  )
}
