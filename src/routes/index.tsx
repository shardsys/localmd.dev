import { createFileRoute } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Breadcrumbs } from '#/components/breadcrumbs'
import { DirView } from '#/components/dir-view'
import { Markdown } from '#/components/markdown'
import { Sidebar } from '#/components/sidebar'
import { Splash } from '#/components/splash'
import { useLocalFile } from '#/hooks/use-local-file'
import { FONTS, useSettings } from '#/hooks/use-settings'
import { extractBody } from '#/lib/markdown'

export const Route = createFileRoute('/')({ component: Page })

function Page() {
  const f = useLocalFile()
  const { settings, update } = useSettings()
  const source = useMemo(() => (f.text == null ? null : extractBody(f.text)), [f.text])
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
  }, [source, f.name, f.dirPath, f.rootName])

  // scroll to the heading from a followed link once the target has rendered
  useEffect(() => {
    if (!f.hash || source == null) return
    const id = decodeURIComponent(f.hash)
    ;(document.getElementById(id) ?? document.getElementById(`user-content-${id}`))?.scrollIntoView({ block: 'start' })
  }, [source, f.hash])

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
        onOpen={() => f.open()}
        onOpenRoot={() => f.openDir([])}
        onChooseRoot={() => f.chooseRoot()}
        onClearRoot={() => f.clearRoot()}
        onOpenEntry={f.openEntry}
        onRemoveEntry={f.removeEntry}
        onSettings={update}
      />
      <main className="min-w-0 flex-1">
        {f.dirPath && f.entries ? (
          <div className="mx-auto px-6 py-6 lg:px-10 lg:py-8" style={{ maxWidth: `${settings.width}rem` }}>
            <Breadcrumbs items={items} resolved onCrumb={f.openAt} onChooseRoot={() => f.chooseRoot()} />
            <DirView
              name={f.dirPath.length ? f.dirPath[f.dirPath.length - 1]! : f.rootName!}
              entries={f.entries}
              onOpen={f.openDirEntry}
            />
            {readme != null && f.readme && (
              <section className="mt-8 overflow-hidden rounded-lg border">
                <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 font-mono text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  {f.readme.name}
                </div>
                <div className="px-6 pb-8">
                  <Markdown source={readme} {...article} />
                </div>
              </section>
            )}
          </div>
        ) : f.name ? (
          <div className="mx-auto px-6 py-6 lg:px-10 lg:py-8" style={{ maxWidth: `${settings.width}rem` }}>
            <Breadcrumbs items={items} resolved={resolved} onCrumb={f.openAt} onChooseRoot={() => f.chooseRoot()} />
            {source != null && <Markdown source={source} {...article} />}
          </div>
        ) : (
          <Splash supported={f.supported} pending={f.pending} onOpen={() => f.open()} onResume={f.resume} />
        )}
      </main>
    </div>
  )
}
