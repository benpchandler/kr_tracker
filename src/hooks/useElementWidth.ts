import React from 'react'

export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = React.useRef<T>(null)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setWidth(e.contentRect.width)
      }
    })
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

