import type { Element } from 'hast'
import { toText } from 'hast-util-to-text'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { PluggableList } from 'unified'
import type { LanguageFn } from 'highlight.js'
import { CodeBlock } from '#/components/code-block'
import { LocalImage } from '#/components/local-image'
import { isExternalHref } from '#/lib/fs'
import { Mermaid } from '#/components/mermaid'
import { cn } from '#/lib/utils'

// Default schema keeps `language-*` on <code>; also keep math-* (for rehype-katex) and hljs classes.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^(language-|math-|hljs)/]],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', /^hljs-/]],
    pre: [...(defaultSchema.attributes?.pre ?? []), ['className', /^hljs/]],
  },
}

const remarkPlugins: PluggableList = [remarkGfm, remarkMath]

type Languages = Record<string, LanguageFn>
let allLanguages: Languages | null = null

/** All ~190 highlight.js languages, lazy-loaded as a separate chunk; lowlight's common set until then. */
function useLanguages(): Languages | undefined {
  const [langs, setLangs] = useState<Languages | undefined>(allLanguages ?? undefined)
  useEffect(() => {
    if (langs) return
    let cancelled = false
    import('highlight.js').then(({ default: hljs }) => {
      const all: Languages = {}
      for (const name of hljs.listLanguages()) {
        const fn = hljs.getLanguage(name)?.rawDefinition
        if (fn) all[name] = fn
      }
      allLanguages = all
      if (!cancelled) setLangs(all)
    })
    return () => {
      cancelled = true
    }
  }, [langs])
  return langs
}

function mermaidSource(node: Element | undefined): string | null {
  const code = node?.children[0]
  if (!code || code.type !== 'element' || code.tagName !== 'code') return null
  const cls = code.properties.className
  return Array.isArray(cls) && cls.includes('language-mermaid') ? toText(code, { whitespace: 'pre' }) : null
}

type Nav = {
  onLink?: (href: string) => void // relative links to files/folders in the root
  resolveUrl?: (src: string) => Promise<string | null> // relative images
}

function scrollToId(id: string) {
  const el = document.getElementById(id) ?? document.getElementById(`user-content-${id}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const baseComponents: Components = {
  pre({ node, children, ...props }) {
    const src = mermaidSource(node)
    if (src != null) return <Mermaid code={src} />
    const code = node ? toText(node, { whitespace: 'pre' }).replace(/\n$/, '') : ''
    return (
      <CodeBlock code={code} {...props}>
        {children}
      </CodeBlock>
    )
  },
}

type Props = Nav & { source: string; className?: string; style?: React.CSSProperties }

function useComponents({ onLink, resolveUrl }: Nav): Components {
  return useMemo<Components>(
    () => ({
      ...baseComponents,
      a({ node, href = '', children, ...props }) {
        if (href.startsWith('#'))
          return (
            <a
              href={href}
              {...props}
              onClick={(e) => {
                e.preventDefault()
                scrollToId(decodeURIComponent(href.slice(1)))
              }}
            >
              {children}
            </a>
          )
        if (isExternalHref(href) || !onLink)
          return (
            <a href={href} target="_blank" rel="noreferrer" {...props}>
              {children}
            </a>
          )
        return (
          <a
            href={href}
            {...props}
            onClick={(e) => {
              e.preventDefault()
              onLink(href)
            }}
          >
            {children}
          </a>
        )
      },
      img({ node, src = '', ...props }) {
        if (isExternalHref(src) || src.startsWith('data:') || !resolveUrl) return <img src={src} {...props} />
        return <LocalImage src={src} resolve={resolveUrl} {...props} />
      },
    }),
    [onLink, resolveUrl],
  )
}

export function Markdown({ source, className, style, onLink, resolveUrl }: Props) {
  const languages = useLanguages()
  const components = useComponents({ onLink, resolveUrl })
  // raw HTML -> sanitize -> slug/katex/highlight, so their output is not stripped
  const rehypePlugins = useMemo<PluggableList>(
    () => [rehypeRaw, [rehypeSanitize, schema], rehypeSlug, rehypeKatex, [rehypeHighlight, languages ? { languages } : {}]],
    [languages],
  )
  return (
    <article className={cn('prose prose-neutral dark:prose-invert mt-6 max-w-none', className)} style={style}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {source}
      </ReactMarkdown>
    </article>
  )
}
