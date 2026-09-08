import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Button } from '#/components/ui/button'

const COPIED_MS = 1500

/** Fenced code block with a copy-to-clipboard button in the top-right corner. */
export function CodeBlock({ code, children, ...props }: { code: string } & ComponentProps<'pre'>) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <div className="group relative">
      <pre {...props}>{children}</pre>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        title={copied ? 'Copied' : 'Copy'}
        className="absolute top-2 right-2 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 hover:bg-background hover:text-foreground"
      >
        {copied ? <Check className="size-4 text-green-600 dark:text-green-400" /> : <Copy className="size-4" />}
        <span className="sr-only">{copied ? 'Copied' : 'Copy code'}</span>
      </Button>
    </div>
  )
}
