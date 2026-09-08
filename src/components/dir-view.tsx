import { File, FileText, Folder } from 'lucide-react'
import { useState } from 'react'
import { formatSize, isMarkdownName } from '#/lib/fs'
import type { DirEntry } from '#/lib/fs'
import { cn } from '#/lib/utils'

type Props = { name: string; entries: DirEntry[]; onOpen: (e: DirEntry) => void }

const when = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/** Folder listing: folders first, Markdown files highlighted, dotfiles hidden by default. */
export function DirView({ name, entries, onOpen }: Props) {
  const [showHidden, setShowHidden] = useState(false)
  const visible = showHidden ? entries : entries.filter((e) => !e.name.startsWith('.'))
  const hidden = entries.length - visible.length
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Folder className="size-6" />
          {name}/
        </h1>
        <span className="text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">Empty folder</p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
          {visible.map((e) => {
            const md = e.kind === 'file' && isMarkdownName(e.name)
            const openable = e.kind === 'directory' || e.kind === 'file'
            const Icon = e.kind === 'directory' ? Folder : md ? FileText : File
            return (
              <li key={e.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    md || e.kind === 'directory' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                />
                <button
                  type="button"
                  onClick={() => onOpen(e)}
                  disabled={!openable}
                  className={cn(
                    'min-w-0 flex-1 truncate text-left hover:underline',
                    !md && e.kind === 'file' && 'text-muted-foreground',
                  )}
                  title={e.kind === 'file' && !md ? 'Opens in a new tab' : undefined}
                >
                  {e.name}
                  {e.kind === 'directory' && '/'}
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
      {hidden > 0 && (
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowHidden((s) => !s)}
        >
          {showHidden ? 'Hide dotfiles' : `${hidden} hidden`}
        </button>
      )}
    </div>
  )
}
