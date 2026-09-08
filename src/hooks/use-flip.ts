import { useLayoutEffect, useRef } from 'react'

const MS = 250
type Pos = { left: number; top: number }

/**
 * FLIP-animates the children of the returned ref's element when they move between renders.
 * Children are tracked by their `data-key` attribute; new ones fade in.
 */
export function useFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const prev = useRef(new Map<string, Pos>())
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const seen = new Map<string, Pos>()
    const started: Animation[] = []
    for (const child of el.children) {
      const it = child as HTMLElement
      const key = it.dataset.key
      if (!key) continue
      // Resting position = measured rect minus the offset of any in-flight translate animation.
      const m = new DOMMatrixReadOnly(getComputedStyle(it).transform)
      const r = it.getBoundingClientRect()
      const pos = { left: r.left - m.e, top: r.top - m.f }
      seen.set(key, pos)
      const old = prev.current.get(key)
      if (!old) {
        if (prev.current.size)
          started.push(it.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MS, easing: 'ease-out' }))
        continue
      }
      const dx = old.left - pos.left
      const dy = old.top - pos.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue // unchanged (ignore subpixel noise): let a running animation finish
      for (const a of it.getAnimations()) a.cancel()
      started.push(
        it.animate([{ transform: `translate(${dx + m.e}px,${dy + m.f}px)` }, { transform: 'none' }], {
          duration: MS,
          easing: 'ease-out',
        }),
      )
    }
    prev.current = seen
    if (!started.length) return
    // No hover flashes while rows slide under the pointer.
    el.style.pointerEvents = 'none'
    void Promise.allSettled(started.map((a) => a.finished)).then(() => {
      if (!el.getAnimations({ subtree: true }).length) el.style.pointerEvents = ''
    })
  })
  return ref
}
