import { File, FileText, Folder, Image } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fileKind, formatSize } from '#/lib/fs'
import type { DirEntry } from '#/lib/fs'
import { cn } from '#/lib/utils'

type Props = {
  entries: DirEntry[]
  showHidden: boolean
  onOpen: (e: DirEntry) => void
  onUp?: () => void // parent folder; undefined at the root
  fill?: boolean // cap at the bottom of the page instead of a fixed height
}

const when = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export const isDotfile = (e: DirEntry) => e.name.startsWith('.')

/** Keys that mean "typing", where the listing must not react. */
const TYPING = 'input, textarea, select, [contenteditable="true"], [role="slider"], [role="dialog"]'

/**
 * Folder listing: folders first, Markdown files highlighted, dotfiles hidden unless asked for.
 * Keyboard (as on gitlip, plus vi keys): ↑/↓ or k/j move, PageUp/PageDown page, Home/End or g/G jump,
 * Enter/→/l open, Backspace/←/h go up, Esc clears. The active row takes focus.
 */
export function DirView({ entries, showHidden, onOpen, onUp, fill }: Props) {
  const visible = showHidden ? entries : entries.filter((e) => !isDotfile(e))
  const [active, setActive] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const rows = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => setActive(null), [entries, showHidden]) // new folder or filter: nothing selected

  useEffect(() => {
    if (active == null) return
    const el = rows.current[active]
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  useEffect(() => {
    const last = visible.length - 1
    const pageSize = () => {
      const row = rows.current.find(Boolean)
      const h = row?.offsetHeight ?? 0
      return h && listRef.current ? Math.max(1, Math.floor(listRef.current.clientHeight / h) - 1) : 10
    }
    const move = (to: number) => setActive(Math.max(0, Math.min(last, to)))
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target instanceof Element ? ev.target : null
      if (t?.closest(TYPING) || ev.ctrlKey || ev.metaKey || ev.altKey) return // Alt+↑ is handled by the page
      if (last < 0 && !['Backspace', 'ArrowLeft', 'h'].includes(ev.key)) return
      switch (ev.key) {
        case 'ArrowDown':
        case 'j':
          move(active == null ? 0 : active + 1)
          break
        case 'ArrowUp':
        case 'k':
          move(active == null ? last : active - 1)
          break
        case 'PageDown':
          move((active ?? -1) + pageSize())
          break
        case 'PageUp':
          move((active ?? last + 1) - pageSize())
          break
        case 'Home':
        case 'g':
          move(0)
          break
        case 'End':
        case 'G':
          move(last)
          break
        case 'Enter':
        case 'ArrowRight':
        case 'l':
          if (active == null || (ev.key === 'Enter' && t?.closest('button, a, summary'))) return
          onOpen(visible[active]!)
          break
        case 'Backspace':
        case 'ArrowLeft':
        case 'h':
          if (!onUp) return
          onUp()
          break
        case 'Escape':
          setActive(null)
          ;(document.activeElement as HTMLElement | null)?.blur()
          break
        default:
          return
      }
      ev.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, active, onOpen, onUp])

  return (
    <div className={cn('mt-3', fill && 'flex min-h-0 flex-1 flex-col')}>
      {visible.length === 0 ? (
        <p className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">Empty folder</p>
      ) : (
        <ul
          ref={listRef}
          className={cn(
            'divide-y overflow-y-scroll rounded-md border', // always-on scrollbar gutter, so rows do not shift when it appears
            fill ? 'min-h-0' : 'max-h-72', // content-sized; shrinks and scrolls only when it hits the page bottom
          )}
        >
          {visible.map((e, i) => {
            const kind = e.kind === 'file' ? fileKind(e.name) : null
            const md = kind === 'markdown'
            const inApp = kind !== 'binary' // everything but binary opens here
            const Icon = e.kind === 'directory' ? Folder : md ? FileText : kind === 'image' || kind === 'svg' ? Image : kind === 'pdf' ? FileText : File
            return (
              <li
                key={e.name}
                ref={(el) => {
                  rows.current[i] = el
                }}
                tabIndex={-1}
                onClick={() => setActive(i)}
                className={cn(
                  // first/last radii match the frame (4px minus its 1px border) so the ring is not clipped
                  'flex h-10 items-center gap-3 px-4 text-sm outline-none first:rounded-t-[3px] last:rounded-b-[3px] hover:bg-muted',
                  active === i && 'bg-muted ring-2 ring-ring ring-inset',
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground',
                    e.kind === 'directory' && 'fill-current', // filled folders, as on GitHub
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onOpen(e)}
                  className={cn(
                    'min-w-0 flex-1 truncate text-left hover:text-(--gh-accent) hover:underline',
                    !md && e.kind === 'file' && 'text-muted-foreground',
                  )}
                  title={!inApp ? 'Opens in a new tab' : undefined}
                >
                  {e.name}
                </button>
                {e.size != null && (
                  <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                    {formatSize(e.size)}
                  </span>
                )}
                {e.lastModified != null && (
                  <span className="hidden w-28 text-right text-xs text-muted-foreground sm:block">
                    {when(e.lastModified)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
