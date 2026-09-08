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
