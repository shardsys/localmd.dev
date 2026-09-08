// Path helpers over the root FileSystemDirectoryHandle. Paths are segment arrays relative to the root.
export type Segs = string[]

export const MD_RE = /\.(md|markdown|mdown|mkd|txt|md\.html)$/i
export const isMarkdownName = (name: string) => MD_RE.test(name)
const README_NAMES = ['readme.md', 'index.md', 'readme.markdown', 'readme.md.html']
export const isReadmeName = (name: string) => README_NAMES.includes(name.toLowerCase())

/** Absolute URL, protocol-relative, or in-page anchor: not something we resolve on disk. */
export const isExternalHref = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')

/**
 * Resolve a link relative to `base` (a directory path); a leading "/" means the root.
 * Returns null if it climbs above the root.
 */
export function resolveHref(base: Segs, href: string): { segs: Segs; hash: string } | null {
  const [pathPart, hash = ''] = href.split('#', 2)
  const clean = pathPart.split('?')[0]
  const out = clean.startsWith('/') ? [] : [...base]
  for (const raw of clean.split('/')) {
    let part: string
    try {
      part = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (!out.length) return null
      out.pop()
      continue
    }
    out.push(part)
  }
  return { segs: out, hash }
}

export async function getDir(root: FileSystemDirectoryHandle, segs: Segs): Promise<FileSystemDirectoryHandle> {
  let d = root
  for (const s of segs) d = await d.getDirectoryHandle(s)
  return d
}

export async function getFile(root: FileSystemDirectoryHandle, segs: Segs): Promise<FileSystemFileHandle> {
  const d = await getDir(root, segs.slice(0, -1))
  return d.getFileHandle(segs[segs.length - 1]!)
}

export type DirEntry = {
  kind: 'file' | 'directory'
  name: string
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
  lastModified?: number
  size?: number
}

const STAT_MAX = 500 // getFile() per entry; skip stats in huge folders

/** Entries of a directory: folders first, natural name order, with file stats. */
export async function listDir(dir: FileSystemDirectoryHandle): Promise<DirEntry[]> {
  const out: DirEntry[] = []
  for await (const [name, handle] of dir.entries()) out.push({ kind: handle.kind, name, handle })
  out.sort((a, b) =>
    a.kind === b.kind
      ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      : a.kind === 'directory'
        ? -1
        : 1,
  )
  const files = out.filter((e) => e.kind === 'file')
  if (files.length <= STAT_MAX)
    await Promise.all(
      files.map(async (e) => {
        try {
          const f = await (e.handle as FileSystemFileHandle).getFile()
          e.lastModified = f.lastModified
          e.size = f.size
        } catch {}
      }),
    )
  return out
}

/** URL hash <-> path. Files: "#/a/b.md", directories: "#/a/b/" (root: "#/"). */
export function pathToHash(segs: Segs, kind: 'file' | 'directory'): string {
  const p = segs.map(encodeURIComponent).join('/')
  return '#/' + p + (kind === 'directory' && p ? '/' : '')
}

export function hashToPath(hash: string): { segs: Segs; kind: 'file' | 'directory' } | null {
  if (!hash.startsWith('#/')) return null
  const body = hash.slice(2)
  const kind = body === '' || body.endsWith('/') ? 'directory' : 'file'
  try {
    return { segs: body.split('/').filter(Boolean).map(decodeURIComponent), kind }
  } catch {
    return null
  }
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} kB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** How a file is shown: Markdown renders, SVG/images display, PDF previews in a frame, text gets highlighted, binary opens in a tab. */
export type FileKind = 'markdown' | 'svg' | 'image' | 'pdf' | 'text' | 'binary'

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i
const BINARY_RE =
  /\.(zip|gz|tgz|bz2|xz|7z|rar|tar|jar|war|exe|dll|so|dylib|bin|dmg|iso|img|wasm|class|o|a|pyc|woff2?|ttf|otf|eot|mp[34]|m4[av]|wav|ogg|flac|webm|mkv|mov|avi|psd|ai|sketch|fig|sqlite|db|parquet|doc|docx|xls|xlsx|ppt|pptx|heic|tiff?)$/i

export function fileKind(name: string): FileKind {
  if (isMarkdownName(name)) return 'markdown'
  if (/\.svg$/i.test(name)) return 'svg'
  if (IMAGE_RE.test(name)) return 'image'
  if (/\.pdf$/i.test(name)) return 'pdf'
  if (BINARY_RE.test(name)) return 'binary'
  return 'text' // anything else is treated as text; the viewer sniffs for binary content
}

export const TEXT_MAX = 2 * 1024 * 1024 // larger text files open in a new tab instead

/** True if the first bytes contain no NUL and decode as UTF-8. */
export async function looksLikeText(file: File): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
  if (buf.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(0, buf.length - 3)) // trailing bytes may cut a sequence
    return true
  } catch {
    return false
  }
}

// extension -> highlight.js language, where the extension is not already an hljs alias
const LANG_BY_EXT: Record<string, string> = {
  h: 'c',
  hh: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsonc: 'json',
  json5: 'json',
  lock: 'json',
  vue: 'xml',
  svelte: 'xml',
  astro: 'xml',
  htm: 'xml',
  env: 'bash',
  csv: 'plaintext',
  log: 'plaintext',
  cfg: 'ini',
  conf: 'ini',
  service: 'ini',
  tf: 'ini',
  hcl: 'ini',
  gradle: 'groovy',
  mdx: 'markdown',
  rst: 'plaintext',
  tex: 'latex',
  pl: 'perl',
  pm: 'perl',
  m: 'objectivec',
  mm: 'objectivec',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  cljs: 'clojure',
  hs: 'haskell',
  ml: 'ocaml',
  mli: 'ocaml',
  jl: 'julia',
  fs: 'fsharp',
  fsx: 'fsharp',
}
const LANG_BY_NAME: Record<string, string> = {
  dockerfile: 'dockerfile',
  containerfile: 'dockerfile',
  makefile: 'makefile',
  gnumakefile: 'makefile',
  'cmakelists.txt': 'cmake',
  license: 'plaintext',
  '.gitignore': 'bash',
  '.gitattributes': 'bash',
  '.dockerignore': 'bash',
  '.npmrc': 'ini',
  '.editorconfig': 'ini',
}

/** highlight.js language hint for a file name; the extension itself is a fine guess for most hljs aliases. */
export function languageFor(name: string): string {
  const lower = name.toLowerCase()
  if (LANG_BY_NAME[lower]) return LANG_BY_NAME[lower]
  if (lower.startsWith('.env')) return 'bash'
  if (lower.startsWith('dockerfile.')) return 'dockerfile'
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : ''
  return LANG_BY_EXT[ext] ?? ext
}
