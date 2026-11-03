import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const COPIED_MS = 1500

/** Copies `text` to the clipboard; `copied` stays true briefly afterwards. */
export function useCopy(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }
  return [copied, copy]
}

/** Fenced code block with a copy button in the top-right corner, shown on hover (as on GitHub). */
export function CodeBlock({ code, children, ...props }: { code: string } & ComponentProps<'pre'>) {
  const [copied, copy] = useCopy(code)
  return (
    <div className="code-block group">
      <pre {...props}>{children}</pre>
      <CopyButton copied={copied} onClick={copy} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" />
    </div>
  )
}

type CopyProps = { copied: boolean; onClick: () => void; className?: string; label?: string }

/** GitHub-style square copy button; shows a check once copied. */
export function CopyButton({ copied, onClick, className, label = 'Copy' }: CopyProps) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={onClick}
      title={copied ? 'Copied!' : label}
      className={cn(
        'size-7 rounded-md border-border bg-muted text-muted-foreground shadow-none transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 dark:border-border dark:bg-secondary dark:hover:bg-accent',
        className,
      )}
    >
      {copied ? <Check className="size-4 text-(--gh-success)" /> : <Copy className="size-4" />}
      <span className="sr-only">{copied ? 'Copied' : label}</span>
    </Button>
  )
}
