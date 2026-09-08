import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'

const COPIED_MS = 1500

/** Whole-file source view: highlight.js (lazy-loaded) with a line-number gutter and a copy button. Shrinks to fit a flex column parent. */
export function CodeView({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

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

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  const lines = code.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()

  return (
    <div className="group relative mt-3 flex min-h-0 flex-col overflow-hidden rounded-sm border border-foreground/20 bg-background font-mono text-[0.8125rem] leading-[1.55]">
      {/* this box, not the page, scrolls the file */}
      <div className="min-h-0 overflow-auto">
        {/* content-sized row, so the gutter spans the whole file and not just the visible height */}
        <div className="flex w-max min-w-full">
          <div
            aria-hidden
            className="sticky left-0 z-10 shrink-0 border-r border-foreground/10 bg-[color-mix(in_oklch,var(--muted)_40%,var(--background))] py-3 pr-2.5 pl-3 text-right tabular-nums text-muted-foreground/50 select-none"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="m-0 min-w-0 flex-1 py-3 pr-12 pl-3">
            {html == null ? (
              <code className="hljs">{code}</code>
            ) : (
              <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </pre>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        title={copied ? 'Copied' : 'Copy'}
        className="absolute top-2 right-3 border border-foreground/20 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="size-4 text-green-600 dark:text-green-400" /> : <Copy className="size-4" />}
        <span className="sr-only">{copied ? 'Copied' : 'Copy code'}</span>
      </Button>
    </div>
  )
}
