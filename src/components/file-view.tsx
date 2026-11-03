import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import { CopyButton, useCopy } from '#/components/code-block'
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

/** Preview / Code segmented control (as on GitHub). */
export function ViewToggle({ raw, onChange, className }: ToggleProps) {
  const item = (active: boolean) =>
    cn(
      'h-full rounded-md border px-3 font-medium transition-colors',
      active
        ? 'border-border bg-background text-foreground shadow-xs'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    )
  return (
    <div className={cn('inline-flex h-7 rounded-md bg-secondary text-xs', className)} role="group">
      <button type="button" className={item(!raw)} onClick={() => onChange(false)} aria-pressed={!raw}>
        Preview
      </button>
      <button type="button" className={item(raw)} onClick={() => onChange(true)} aria-pressed={raw}>
        Code
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
  onView: (raw: boolean) => void
  fill?: boolean // shrink to the column height and scroll inside (source views, PDFs)
  markdown: Omit<ComponentProps<typeof Markdown>, 'source'>
}

/** The open file in a bordered box with a header bar (view switch, stats, copy), as on GitHub. */
export function FileView({ kind, name, file, text, raw, onView, fill, markdown }: Props) {
  const [dims, setDims] = useState('')
  useEffect(() => setDims(''), [file])
  const stats = [text != null && !(kind === 'svg' && !raw) ? lineStats(text) : dims, file && formatSize(file.size)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={cn('mt-3 rounded-md border', fill && 'flex min-h-0 flex-1 flex-col')}>
      <div className="z-10 flex min-h-12 shrink-0 items-center gap-3 rounded-t-md border-b bg-muted px-2 py-2 lg:sticky lg:top-0">
        {hasRawView(kind) && text != null && <ViewToggle raw={raw} onChange={onView} />}
        <span className={cn('min-w-0 truncate text-xs text-muted-foreground', !hasRawView(kind) && 'pl-2')}>{stats}</span>
        {text != null && <CopyRaw text={text} />}
      </div>
      <Body kind={kind} name={name} file={file} text={text} raw={raw} markdown={markdown} onDims={setDims} />
    </div>
  )
}

/** "194 lines (185 loc)": loc counts the non-blank lines. */
function lineStats(text: string): string {
  const lines = text.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  const loc = lines.filter((l) => l.trim()).length
  return `${lines.length} ${lines.length === 1 ? 'line' : 'lines'} (${loc} loc)`
}

function CopyRaw({ text }: { text: string }) {
  const [copied, copy] = useCopy(text)
  return <CopyButton copied={copied} onClick={copy} label="Copy raw file" className="ml-auto shrink-0" />
}

type BodyProps = Omit<Props, 'onView' | 'fill'> & { onDims: (d: string) => void }

function Body({ kind, name, file, text, raw, markdown, onDims }: BodyProps) {
  if (kind === 'image') return file ? <ImageView file={file} onDims={onDims} /> : null
  if (kind === 'pdf') return file ? <PdfView file={file} /> : null
  if (text == null) return file ? <Unreadable file={file} /> : null
  if (kind === 'markdown' && !raw)
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <Markdown source={extractBody(text)} {...markdown} />
      </div>
    )
  if (kind === 'svg' && !raw) return <SvgView text={text} name={name} onDims={onDims} />
  return <CodeView code={text} language={languageFor(name)} />
}

const dimsOf = (img: HTMLImageElement) => `${img.naturalWidth} × ${img.naturalHeight}`

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center overflow-auto p-6">{children}</div>
}

/** SVG shown as an <img> from a data URL: it displays but cannot run scripts. */
function SvgView({ text, name, onDims }: { text: string; name: string; onDims: (d: string) => void }) {
  const src = useMemo(() => {
    if (!text.includes('<svg')) return null
    const withNs = text.includes('xmlns=') ? text : text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withNs)
  }, [text])
  if (!src) return <p className="p-6 text-sm text-muted-foreground">Not an SVG document; switch to the code view.</p>
  return (
    <Frame>
      <img src={src} alt={name} className="max-h-[70vh] max-w-full" onLoad={(e) => onDims(dimsOf(e.currentTarget))} />
    </Frame>
  )
}

function ImageView({ file, onDims }: { file: File; onDims: (d: string) => void }) {
  const url = useObjectUrl(file)
  if (!url) return null
  return (
    <Frame>
      <img src={url} alt={file.name} className="max-h-[70vh] max-w-full" onLoad={(e) => onDims(dimsOf(e.currentTarget))} />
    </Frame>
  )
}

/** Object URL for a File, revoked when it changes. */
function useObjectUrl(file: File): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

/** PDF in the browser's viewer; fills the column on large screens (see `fillsScreen` in the route). */
function PdfView({ file }: { file: File }) {
  const url = useObjectUrl(file)
  if (!url) return null
  return <iframe src={url} title={file.name} className="h-[75vh] w-full rounded-b-md lg:h-auto lg:min-h-0 lg:flex-1" />
}

/** Binary content or a file too large to show inline. */
function Unreadable({ file }: { file: File }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted-foreground">
      <p>Binary or too large to show here.</p>
      <Button variant="outline" size="sm" onClick={() => window.open(URL.createObjectURL(file), '_blank', 'noopener')}>
        <ExternalLink />
        Open in new tab
      </Button>
    </div>
  )
}
