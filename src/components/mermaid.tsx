import { useEffect, useState } from 'react'
import { useTheme } from '#/components/theme-provider'

let seq = 0

/** Renders a ```mermaid block client-side; mermaid is loaded on first use. */
export function Mermaid({ code }: { code: string }) {
  const { theme } = useTheme()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default' })
      try {
        await mermaid.parse(code) // throws without touching the DOM
        const r = await mermaid.render(`mermaid-${++seq}`, code)
        if (cancelled) return
        setSvg(r.svg)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })
    return () => {
      cancelled = true
    }
  }, [code, theme])

  if (error) return <pre className="whitespace-pre-wrap text-sm text-destructive">{error}</pre>
  return <div className="not-prose my-6 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
}
