import { useEffect, useState } from 'react'

/** Whole-file source view: highlight.js (lazy-loaded) with a line-number gutter. Shrinks to fit a flex column parent. `isolate` keeps the sticky gutter's z-index inside this box. */
export function CodeView({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('highlight.js').then(({ default: hljs }) => {
      if (cancelled) return
      const lang = hljs.getLanguage(language) ? language : 'plaintext'
      try {
        setHtml(hljs.highlight(code, { language: lang, ignoreIllegals: true }).value)
      } catch {
        setHtml(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [code, language])

  const lines = code.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()

  return (
    <div className="isolate flex min-h-0 flex-col font-mono text-xs leading-5">
      {/* this box, not the page, scrolls the file */}
      <div className="min-h-0 overflow-auto">
        {/* content-sized row, so the gutter spans the whole file and not just the visible height */}
        <div className="flex w-max min-w-full py-2">
          <div
            aria-hidden
            className="sticky left-0 z-10 shrink-0 bg-background pr-4 pl-4 text-right tabular-nums text-muted-foreground select-none"
          >
            {lines.map((_, i) => (
              <div key={i} className="min-w-[3ch]">
                {i + 1}
              </div>
            ))}
          </div>
          <pre className="m-0 min-w-0 flex-1 pr-4 pl-2">
            {html == null ? (
              <code className="hljs">{code}</code>
            ) : (
              <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}
