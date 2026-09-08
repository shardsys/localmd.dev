import { createFileRoute } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Breadcrumbs } from '#/components/breadcrumbs'
import { DirView, isDotfile } from '#/components/dir-view'
import { FileView, ViewToggle, hasRawView } from '#/components/file-view'
import { Markdown } from '#/components/markdown'
import { Sidebar } from '#/components/sidebar'
import { Splash } from '#/components/splash'
import { useLocalFile } from '#/hooks/use-local-file'
import { FONTS, useSettings } from '#/hooks/use-settings'
import { isReadmeName } from '#/lib/fs'
import type { DirEntry } from '#/lib/fs'
import { extractBody } from '#/lib/markdown'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({ component: Page })

function Page() {
  const f = useLocalFile()
  const { settings, update } = useSettings()
  const [showHidden, setShowHidden] = useState(false) // dotfiles in folder listings
  const readme = useMemo(() => (f.readme ? extractBody(f.readme.text) : null), [f.readme])

  // breadcrumb items: root + segments; a file outside the root shows just its name
  const segs = f.path ?? f.dirPath
  const resolved = f.rootName != null && segs != null
  const items = resolved ? [f.rootName!, ...segs] : f.name ? [f.name] : []

  useEffect(() => {
    if (f.dirPath) {
      document.title = (f.dirPath.length ? f.dirPath[f.dirPath.length - 1] + '/' : f.rootName + '/') + ' – localmd'
      return
    }
    if (!f.name) {
      document.title = 'localmd'
      return
    }
    const h1 = document.querySelector('main h1')?.textContent
    document.title = (h1 ? `${h1} – ` : '') + f.name
  }, [f.text, f.name, f.dirPath, f.rootName])

  // Alt+↑ opens the containing folder from anywhere, file or listing (as on gitlip)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'ArrowUp' || !ev.altKey || ev.ctrlKey || ev.metaKey) return
      const segs = f.path ?? f.dirPath
      if (!segs?.length) return
      ev.preventDefault()
      f.openAt(segs.length - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [f.path, f.dirPath, f.openAt])

  // scroll to the heading from a followed link once the target has rendered
  useEffect(() => {
    if (!f.hash || f.text == null) return
    const id = decodeURIComponent(f.hash)
    ;(document.getElementById(id) ?? document.getElementById(`user-content-${id}`))?.scrollIntoView({ block: 'start' })
  }, [f.text, f.hash])

  // source views are capped at the viewport (large screens) and scroll inside their box
  const fillsScreen = f.kind === 'text' || (hasRawView(f.kind) && f.raw)
  // a listing without a README may grow down to the page bottom; decided from the entries so it does not jump once the README text loads
  const fillsListing = f.entries != null && !f.entries.some((e) => e.kind === 'file' && isReadmeName(e.name))

  const article = {
    className: FONTS[settings.font],
    style: { fontSize: `${settings.size}px`, lineHeight: settings.leading, letterSpacing: `${settings.tracking}em` },
    onLink: f.openLink,
    resolveUrl: f.resolveUrl,
  }

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar
        supported={f.supported}
        name={f.name}
        rootName={f.rootName}
        lastModified={f.lastModified}
        error={f.error}
        history={f.history}
        activeId={f.activeId}
        settings={settings}
        onHome={f.goHome}
        onOpen={() => f.open()}
        onOpenRoot={() => f.openDir([])}
        onChooseRoot={() => f.chooseRoot()}
        onClearRoot={() => f.clearRoot()}
        onOpenEntry={f.openEntry}
        onRemoveEntry={f.removeEntry}
        onToggleFavorite={f.toggleFavorite}
        onSettings={update}
      />
      <main className="min-w-0 flex-1">
        {f.dirPath && f.entries ? (
          <div
            className={cn('mx-auto px-6 py-6 lg:px-10 lg:py-8', fillsListing && 'flex flex-col lg:max-h-dvh')}
            style={{ maxWidth: `${settings.width}rem` }}
          >
            <div className="flex min-h-7 shrink-0 items-center gap-2">
              <Breadcrumbs items={items} resolved onCrumb={f.openAt} onChooseRoot={() => f.chooseRoot()} />
              <ItemCount entries={f.entries} showHidden={showHidden} onToggle={() => setShowHidden((v) => !v)} />
            </div>
            <DirView
              entries={f.entries}
              showHidden={showHidden}
              onOpen={f.openDirEntry}
              onUp={f.dirPath.length ? () => f.openAt(f.dirPath!.length - 1) : undefined}
              fill={fillsListing}
            />
            {readme != null && f.readme && (
              <section className="mt-6 overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => f.openPath([...f.dirPath!, f.readme!.name])}
                  className="flex w-full items-center gap-2 border-b bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                  title="Open this file"
                >
                  <FileText className="size-3.5" />
                  {f.readme.name}
                </button>
                <div className="px-6 pb-8">
                  <Markdown source={readme} {...article} />
                </div>
              </section>
            )}
          </div>
        ) : f.name ? (
          <div
            className={cn('mx-auto px-6 py-6 lg:px-10 lg:py-8', fillsScreen && 'flex flex-col lg:max-h-dvh')}
            style={{ maxWidth: `${settings.width}rem` }}
          >
            <div className="flex min-h-7 shrink-0 items-center gap-3">
              <Breadcrumbs items={items} resolved={resolved} onCrumb={f.openAt} onChooseRoot={() => f.chooseRoot()} />
              {hasRawView(f.kind) && f.text != null && (
                <ViewToggle raw={f.raw} onChange={f.setView} className="ml-auto shrink-0" />
              )}
            </div>
            {f.kind && <FileView kind={f.kind} name={f.name} file={f.file} text={f.text} raw={f.raw} markdown={article} />}
          </div>
        ) : (
          <Splash
            supported={f.supported}
            pending={f.pending}
            onOpen={() => f.open()}
            onChooseRoot={() => f.chooseRoot()}
            onResume={f.resume}
          />
        )}
      </main>
    </div>
  )
}

type CountProps = { entries: DirEntry[]; showHidden: boolean; onToggle: () => void }

/** "(N items · M hidden)" next to the breadcrumbs; the dotfile part toggles them. Inline text, so the row keeps its height. */
function ItemCount({ entries, showHidden, onToggle }: CountProps) {
  const dotfiles = entries.filter(isDotfile).length
  const shown = showHidden ? entries.length : entries.length - dotfiles
  return (
    <span className="font-mono text-xs text-muted-foreground/60">
      ({shown} {shown === 1 ? 'item' : 'items'}
      {dotfiles > 0 && (
        <>
          {' · '}
          <button type="button" className="hover:text-foreground hover:underline" onClick={onToggle}>
            {showHidden ? `${dotfiles} extra showing` : `${dotfiles} hidden`}
          </button>
        </>
      )}
      )
    </span>
  )
}
