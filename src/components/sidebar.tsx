import { FolderOpen, FolderTree, Minus, Pencil, Plus, Star, X } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { useFlip } from '#/hooks/use-flip'
import { SettingsMenu } from '#/components/settings-menu'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import type { Settings } from '#/hooks/use-settings'
import type { HistoryEntry } from '#/lib/idb'
import { cn } from '#/lib/utils'

type Props = {
  supported: boolean | null
  name: string | null
  lastModified: number
  error: string | null
  rootName: string | null
  history: HistoryEntry[]
  activeId: number | null
  settings: Settings
  onHome: () => void
  onOpen: () => void
  onOpenRoot: () => void
  onChooseRoot: () => void
  onClearRoot: () => void
  onOpenEntry: (e: HistoryEntry) => void
  onRemoveEntry: (id: number) => void
  onToggleFavorite: (id: number) => void
  onSettings: (patch: Partial<Settings>) => void
}

const COLLAPSED_KEY = 'localmd-collapsed'

/** Side panel on large screens, collapsible top bar on small ones. */
export function Sidebar(p: Props) {
  // SSR renders expanded; until hydration the `html.collapsed` class set by the init script in __root
  // keeps it collapsed via CSS. State takes over before paint, then the class is dropped.
  const [collapsed, setCollapsed] = useState(false)
  useLayoutEffect(() => {
    const html = document.documentElement
    setCollapsed(html.classList.contains('collapsed'))
    html.classList.remove('collapsed')
  }, [])
  const toggle = () => {
    const next = !collapsed
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    setCollapsed(next)
  }
  return (
    <aside className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex items-center gap-1 px-3 py-2 lg:px-5 lg:py-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={toggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <Plus className="size-4" /> : <Minus className="size-4" />}
        </Button>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault() // soft navigation: reset state, no reload
            p.onHome()
          }}
          className="font-title text-2xl font-bold tracking-wide uppercase lg:text-3xl"
        >
          localmd
          <span className="ml-0.5 text-sm font-medium tracking-normal normal-case text-muted-foreground lg:text-base">.dev</span>
        </a>
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <SettingsMenu settings={p.settings} onChange={p.onSettings} side="bottom" align="end" />
          <ThemeToggle />
        </div>
      </div>
      {/* small: grid-rows animates the collapse; large: both wrappers are `contents` */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out max-lg:[.collapsed_&]:grid-rows-[0fr] lg:contents',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden lg:contents">
          <div
            className={cn(
              'flex flex-col gap-3 px-3 pb-3 transition-opacity duration-300 max-lg:[.collapsed_&]:opacity-0 lg:min-h-0 lg:flex-1 lg:px-5 lg:pb-5 lg:opacity-100',
              collapsed && 'opacity-0',
            )}
          >
            <div className="flex flex-col gap-1.5">
              <Button className="justify-start" onClick={p.onOpen} disabled={p.supported === false}>
                <FolderOpen />
                Open file…
              </Button>
              <RootFolder {...p} />
            </div>
            <Status {...p} />
            {p.history.length > 0 && (
              <>
                <div className="mt-2 -mb-1 text-sm text-muted-foreground lg:-mb-2">Recent</div>
                <Recent {...p} />
              </>
            )}
            <div className="hidden items-center justify-center gap-1 lg:mt-auto lg:flex">
              <SettingsMenu settings={p.settings} onChange={p.onSettings} side="top" align="center" />
              <ThemeToggle />
            </div>
            <a
              href="https://x.com/nataliemarleny"
              target="_blank"
              rel="noreferrer"
              className="hidden text-center text-xs text-muted-foreground hover:text-foreground lg:block"
            >
              Follow me <span className="font-medium">@nataliemarleny</span>
            </a>
          </div>
        </div>
      </div>
    </aside>
  )
}

function RootFolder(p: Props) {
  if (p.supported === false) return null
  if (!p.rootName)
    return (
      <Button className="justify-start" onClick={p.onChooseRoot} title="Enables folder listings, breadcrumbs and relative links">
        <FolderTree />
        Set root folder…
      </Button>
    )
  // styled like the button above (same colors, height and padding); icon actions sit inside it
  const action = 'size-7 text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground'
  return (
    <div className="flex h-9 items-center gap-0.5 rounded-md bg-primary pr-1 text-sm font-medium text-primary-foreground">
      <button
        type="button"
        onClick={p.onOpenRoot}
        className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-3 outline-none hover:bg-primary-foreground/10 focus-visible:bg-primary-foreground/10"
        title="Browse the root folder"
      >
        <FolderTree className="size-4 shrink-0" />
        <span className="truncate">{p.rootName}</span>
      </button>
      <Button variant="ghost" size="icon-sm" className={action} onClick={p.onChooseRoot} title="Change root folder">
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" className={action} onClick={p.onClearRoot} title="Clear root folder">
        <X className="size-4" />
      </Button>
    </div>
  )
}

function Status(p: Props) {
  if (p.supported === false)
    return <p className="text-xs text-muted-foreground">Needs a Chromium browser (File System Access API).</p>
  if (!p.name && !p.rootName)
    return (
      <p className="text-[11px] leading-snug text-muted-foreground/70">
        Pick a Markdown, text or code file; it re-renders on every save.
      </p>
    )
  if (p.error) return <p className="text-xs text-destructive">{p.error}</p>
  return null
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
function when(ts: number): string {
  const d = new Date(ts)
  return sameDay(d, new Date()) ? d.toLocaleTimeString() : d.toLocaleString()
}

function Recent(p: Props) {
  const ref = useFlip<HTMLUListElement>()
  const [confirmId, setConfirmId] = useState<number | null>(null) // favorite awaiting removal confirmation
  return (
    <ul
      ref={ref}
      className="-m-1 flex min-w-0 flex-1 gap-1 overflow-x-auto p-1 [scrollbar-width:none] lg:min-h-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      {p.history.map((e) => {
        const active = e.id === p.activeId
        const confirming = confirmId === e.id
        return (
          <li
            key={e.id}
            data-key={e.id}
            className={cn(
              'group flex w-48 shrink-0 items-center rounded-md transition-colors hover:bg-muted has-focus-visible:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring/60 lg:w-auto',
              active && 'bg-muted',
            )}
          >
            <button
              type="button"
              className={cn(
                'ml-1 rounded p-1 focus-visible:outline-hidden',
                e.favorite
                  ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground/40 hover:text-foreground focus-visible:text-foreground',
              )}
              onClick={() => p.onToggleFavorite(e.id!)}
              title={e.favorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star className={cn('size-3.5', e.favorite && 'fill-current')} />
            </button>
            {confirming ? (
              // buttons cannot nest, so the confirmation replaces the open button
              <div className="min-w-0 flex-1 px-1.5 py-1.5 text-left">
                <span className="block truncate text-sm">{e.name}</span>
                <span className="block text-xs text-muted-foreground">
                  Remove favorite?{' '}
                  <button
                    type="button"
                    className="font-medium text-destructive-foreground hover:underline"
                    onClick={() => {
                      setConfirmId(null)
                      p.onRemoveEntry(e.id!)
                    }}
                  >
                    Remove
                  </button>
                  {' · '}
                  <button type="button" className="hover:underline" onClick={() => setConfirmId(null)}>
                    Keep
                  </button>
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 text-left focus-visible:outline-hidden"
                onClick={() => p.onOpenEntry(e)}
                title={e.path ? e.path.join('/') : e.name}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm decoration-2 underline-offset-2 group-has-focus-visible:underline',
                      active && 'font-medium',
                    )}
                  >
                    {e.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {active ? `updated ${when(p.lastModified)}` : `opened ${when(e.openedAt)}`}
                  </span>
                </span>
              </button>
            )}
            <button
              type="button"
              className="mr-1 rounded p-1 text-muted-foreground/50 hover:text-foreground focus-visible:text-foreground focus-visible:outline-hidden"
              onClick={() => (e.favorite ? setConfirmId(confirming ? null : e.id!) : p.onRemoveEntry(e.id!))}
              title="Remove from list"
            >
              <X className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
