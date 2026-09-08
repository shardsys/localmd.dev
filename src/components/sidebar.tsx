import { FileText, FolderOpen, FolderTree, Minus, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
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
  onOpen: () => void
  onOpenRoot: () => void
  onChooseRoot: () => void
  onClearRoot: () => void
  onOpenEntry: (e: HistoryEntry) => void
  onRemoveEntry: (id: number) => void
  onSettings: (patch: Partial<Settings>) => void
}

/** Side panel on large screens, collapsible top bar on small ones. */
export function Sidebar(p: Props) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <aside className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex items-center gap-1 px-3 py-2 lg:px-5 lg:py-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <Plus className="size-4" /> : <Minus className="size-4" />}
        </Button>
        <span className="font-title text-2xl font-bold tracking-wide uppercase lg:text-3xl">localmd</span>
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <SettingsMenu settings={p.settings} onChange={p.onSettings} side="bottom" align="end" />
          <ThemeToggle />
        </div>
      </div>
      {/* small: grid-rows animates the collapse; large: both wrappers are `contents` */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out lg:contents',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden lg:contents">
          <div
            className={cn(
              'flex flex-col gap-3 px-3 pb-3 transition-opacity duration-300 lg:min-h-0 lg:flex-1 lg:px-5 lg:pb-5 lg:opacity-100',
              collapsed && 'opacity-0',
            )}
          >
            <Button className="justify-start" onClick={p.onOpen} disabled={p.supported === false}>
              <FolderOpen />
              Open file…
            </Button>
            <RootFolder {...p} />
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
      <Button
        variant="outline"
        className="justify-start"
        onClick={p.onChooseRoot}
        title="Enables folder listings, breadcrumbs and relative links"
      >
        <FolderTree />
        Set root folder…
      </Button>
    )
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={p.onOpenRoot}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
        title="Browse the root folder"
      >
        <FolderTree className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{p.rootName}</span>
      </button>
      <Button variant="ghost" size="icon-sm" onClick={p.onChooseRoot} title="Change root folder">
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        onClick={p.onClearRoot}
        title="Clear root folder"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

function Status(p: Props) {
  if (p.supported === false)
    return <p className="text-xs text-muted-foreground">Needs a Chromium browser (File System Access API).</p>
  if (!p.name)
    return (
      <p className="text-[11px] leading-snug text-muted-foreground/70">
        Pick a Markdown or .md.html file; it re-renders on every save.
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
  return (
    <ul
      ref={ref}
      className="-m-1 flex min-w-0 flex-1 gap-1 overflow-x-auto p-1 [scrollbar-width:none] lg:min-h-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      {p.history.map((e) => {
        const active = e.id === p.activeId
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
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left focus-visible:outline-hidden"
              onClick={() => p.onOpenEntry(e)}
              title={e.path ? e.path.join('/') : e.name}
            >
              <FileText className={cn('size-3.5 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
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
            <button
              type="button"
              className="mr-1 rounded p-1 text-muted-foreground/50 hover:text-foreground focus-visible:text-foreground focus-visible:outline-hidden"
              onClick={() => p.onRemoveEntry(e.id!)}
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
