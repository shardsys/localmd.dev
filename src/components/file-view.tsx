import { Code, Eye, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import { CodeView } from '#/components/code-view'
import { Markdown } from '#/components/markdown'
import { Button } from '#/components/ui/button'
import { formatSize, languageFor } from '#/lib/fs'
import type { FileKind } from '#/lib/fs'
import { extractBody } from '#/lib/markdown'
import { cn } from '#/lib/utils'

/** Kinds that have both a rendered and a source view. */
export const hasRawView = (kind: FileKind | null) => kind === 'markdown' || kind === 'svg'

type ToggleProps = { raw: boolean; onChange: (raw: boolean) => void; className?: string }

/** Rendered / source switch, icon-only (as on gitlip). */
export function ViewToggle({ raw, onChange, className }: ToggleProps) {
  const item = (active: boolean) =>
    cn(
      'flex size-7 items-center justify-center transition-colors',
      active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
    )
  return (
    <div className={cn('isolate inline-flex overflow-hidden rounded-md border', className)} role="group">
      <button type="button" className={item(!raw)} onClick={() => onChange(false)} title="Rendered" aria-pressed={!raw}>
        <Eye className="size-4" />
        <span className="sr-only">Rendered</span>
      </button>
      <button type="button" className={cn(item(raw), 'border-l')} onClick={() => onChange(true)} title="Raw" aria-pressed={raw}>
        <Code className="size-4" />
        <span className="sr-only">Raw</span>
      </button>
    </div>
  )
}

type Props = {
  kind: FileKind
  name: string
  file: File | null
  text: string | null
  raw: boolean
  markdown: Omit<ComponentProps<typeof Markdown>, 'source'>
}

/** Shows the open file according to its kind and the chosen view. */
export function FileView({ kind, name, file, text, raw, markdown }: Props) {
  if (kind === 'image') return file ? <ImageView file={file} /> : null
  if (text == null) return file ? <Unreadable file={file} /> : null
  if (kind === 'markdown' && !raw) return <Markdown source={extractBody(text)} {...markdown} />
  if (kind === 'svg' && !raw) return <SvgView text={text} name={name} />
  return <CodeView code={text} language={languageFor(name)} />
}

function Frame({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="mt-3">
      <div className="flex justify-center overflow-auto rounded-lg border bg-muted/40 p-6">{children}</div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  )
}

/** SVG shown as an <img> from a data URL: it displays but cannot run scripts. */
function SvgView({ text, name }: { text: string; name: string }) {
  const src = useMemo(() => {
    if (!text.includes('<svg')) return null
    const withNs = text.includes('xmlns=') ? text : text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withNs)
  }, [text])
  const [dims, setDims] = useState('')
  if (!src) return <p className="mt-3 text-sm text-muted-foreground">Not an SVG document; switch to the raw view.</p>
  return (
    <Frame caption={[name, dims].filter(Boolean).join(' · ')}>
      <img
        src={src}
        alt={name}
        className="max-h-[70vh] max-w-full"
        onLoad={(e) => setDims(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)}
      />
    </Frame>
  )
}

function ImageView({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)
  const [dims, setDims] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) return null
  return (
    <Frame caption={[file.name, dims, formatSize(file.size)].filter(Boolean).join(' · ')}>
      <img
        src={url}
        alt={file.name}
        className="max-h-[70vh] max-w-full"
        onLoad={(e) => setDims(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)}
      />
    </Frame>
  )
}

/** Binary content or a file too large to show inline. */
function Unreadable({ file }: { file: File }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-3 rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
      <p>
        {file.name} · {formatSize(file.size)}
        <br />
        Binary or too large to show here.
      </p>
      <Button variant="outline" size="sm" onClick={() => window.open(URL.createObjectURL(file), '_blank', 'noopener')}>
        <ExternalLink />
        Open in new tab
      </Button>
    </div>
  )
}
