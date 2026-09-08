import { ChevronRight, Folder } from 'lucide-react'

type Props = {
  items: string[] // root folder, ancestors, then the current file or folder
  resolved: boolean // false when the file is outside the root (or there is no root)
  onCrumb: (depth: number) => void // 0 = root
  onChooseRoot: () => void
}

/** Path of what's shown; every crumb but the last opens that folder's listing. */
export function Breadcrumbs({ items, resolved, onCrumb, onChooseRoot }: Props) {
  const crumb = 'rounded px-1 py-0.5 hover:bg-muted hover:text-foreground'
  const sep = <ChevronRight className="size-3 shrink-0" />
  return (
    <nav className="flex flex-wrap items-center gap-0.5 font-mono text-xs text-muted-foreground">
      {!resolved && (
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            className={`${crumb} flex items-center gap-1`}
            onClick={onChooseRoot}
            title="Pick a root folder to show the path"
          >
            <Folder className="size-3" /> folder…
          </button>
          {sep}
        </span>
      )}
      {items.map((it, i) =>
        i < items.length - 1 ? (
          <span key={i} className="flex items-center gap-0.5">
            <button type="button" className={crumb} onClick={() => onCrumb(i)} title="Open this folder">
              {it}
            </button>
            {sep}
          </span>
        ) : (
          <span key={i} className="px-1 text-foreground">
            {it}
          </span>
        ),
      )}
    </nav>
  )
}
