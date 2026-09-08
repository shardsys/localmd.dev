import { useCallback, useEffect, useRef, useState } from 'react'
import { addHistory, deleteRoot, getRoot, listHistory, putRoot, removeHistory, setFavorite, sortHistory } from '#/lib/idb'
import type { HistoryEntry } from '#/lib/idb'
import {
  TEXT_MAX,
  fileKind,
  getDir,
  getFile,
  hashToPath,
  isReadmeName,
  listDir,
  looksLikeText,
  pathToHash,
  resolveHref,
} from '#/lib/fs'
import type { DirEntry, FileKind, Segs } from '#/lib/fs'

const POLL_MS = 250
const PICKER = {
  types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.txt', '.html'] } }],
}
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

async function granted(h: FileSystemHandle): Promise<boolean> {
  if ((await h.queryPermission({ mode: 'read' })) === 'granted') return true
  return (await h.requestPermission({ mode: 'read' })) === 'granted'
}

const rawFromUrl = () => new URLSearchParams(location.search).get('view') === 'raw'

/** Path lives in the hash, the non-default view in `?view=raw`. */
function setUrl(h: string, push: boolean, raw = false) {
  const url = location.pathname + (raw ? '?view=raw' : '') + h
  if (url === location.pathname + location.search + location.hash) return
  if (push) window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}

export type Readme = { name: string; text: string }

/**
 * Picks a local file via the File System Access API and re-reads it whenever it changes on disk.
 * Browsers never expose absolute paths, so `path` is relative to a user-chosen root folder; with a
 * root, relative links and directory listings resolve through it, and the URL hash mirrors the path.
 */
export function useLocalFile() {
  const [supported, setSupported] = useState<boolean | null>(null) // null until hydrated
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null)
  const [root, setRoot] = useState<FileSystemDirectoryHandle | null>(null)
  const [path, setPath] = useState<Segs | null>(null) // open file, relative to root
  const [dirPath, setDirPath] = useState<Segs | null>(null) // listing shown instead of a file
  const [entries, setEntries] = useState<DirEntry[] | null>(null)
  const [readme, setReadme] = useState<Readme | null>(null)
  const [hash, setHash] = useState('') // heading to scroll to after render
  const [pending, setPending] = useState<string | null>(null) // path from the URL awaiting permission
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null) // latest snapshot of the open file
  const [text, setText] = useState<string | null>(null) // its contents, for text kinds that are displayable
  const [raw, setRaw] = useState(false) // source view instead of rendered; mirrored in the URL
  const [lastModified, setLastModified] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const lastRef = useRef(0)
  const rootRef = useRef<FileSystemDirectoryHandle | null>(null)
  rootRef.current = root
  const baseRef = useRef<Segs | null>(null) // directory that relative links resolve against
  baseRef.current = path ? path.slice(0, -1) : dirPath
  const handleRef = useRef<FileSystemFileHandle | null>(null)
  handleRef.current = handle

  const fail = useCallback((e: unknown) => {
    if (!isAbort(e)) setError(msg(e))
  }, [])

  const select = useCallback(async (h: FileSystemFileHandle, known?: Segs, push = true) => {
    if (!(await granted(h))) return
    const r = rootRef.current
    const p = known ?? (r ? await r.resolve(h).catch(() => null) : null)
    setHandle(h)
    setPath(p)
    setDirPath(null)
    setEntries(null)
    setReadme(null)
    setError(null)
    setPending(null)
    setRaw(false)
    setUrl(p ? pathToHash(p, 'file') : '', push)
    setActiveId(await addHistory(h, p))
    setHistory(await listHistory())
  }, [])

  const openDir = useCallback(
    async (segs: Segs, push = true) => {
      const r = rootRef.current
      if (!r) return
      try {
        if (!(await granted(r))) return
        const d = await getDir(r, segs)
        const list = await listDir(d)
        setHandle(null)
        setFile(null)
        setText(null)
        setActiveId(null)
        setPath(null)
        setDirPath(segs)
        setEntries(list)
        setError(null)
        setPending(null)
        setUrl(pathToHash(segs, 'directory'), push)
        const rm = list.find((e) => e.kind === 'file' && isReadmeName(e.name))
        setReadme(
          rm ? { name: rm.name, text: await (await (rm.handle as FileSystemFileHandle).getFile()).text() } : null,
        )
      } catch (e) {
        fail(e)
      }
    },
    [fail],
  )

  /** Open a root-relative path: a Markdown file renders, a directory lists, anything else opens in a new tab. */
  const openPath = useCallback(
    async (segs: Segs, push = true) => {
      const r = rootRef.current
      if (!r) return
      try {
        if (!(await granted(r))) return
        if (!segs.length) return openDir(segs, push)
        let file: FileSystemFileHandle | null = null
        try {
          file = await getFile(r, segs)
        } catch (e) {
          if (!(e instanceof DOMException && (e.name === 'TypeMismatchError' || e.name === 'NotFoundError'))) throw e
        }
        if (!file) return openDir(segs, push)
        if (fileKind(file.name) !== 'binary') return select(file, segs, push)
        window.open(URL.createObjectURL(await file.getFile()), '_blank', 'noopener')
      } catch (e) {
        fail(e)
      }
    },
    [openDir, select, fail],
  )

  // Restore root + history; open the path from the URL if permission is already granted.
  useEffect(() => {
    const ok = 'showOpenFilePicker' in window
    setSupported(ok)
    if (!ok) return
    const initialRaw = rawFromUrl()
    listHistory()
      .then(setHistory)
      .catch(() => {})
    getRoot()
      .then(async (r) => {
        if (!r) return
        setRoot(r)
        rootRef.current = r
        const target = hashToPath(location.hash)
        if (!target) return
        if ((await r.queryPermission({ mode: 'read' })) === 'granted') {
          await openPath(target.segs, false)
          if (initialRaw) {
            setRaw(true)
            setUrl(location.hash, false, true)
          }
        } else setPending(location.hash.slice(1))
      })
      .catch(() => {})
  }, [openPath])

  // Back/forward: follow the URL hash.
  useEffect(() => {
    const onPop = () => {
      const target = hashToPath(location.hash)
      const r = rawFromUrl()
      if (target) void openPath(target.segs, false).then(() => setRaw(r))
      else setRaw(r)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [openPath])

  useEffect(() => {
    if (!handle) return
    let cancelled = false
    let busy = false
    lastRef.current = 0
    const kind = fileKind(handle.name)
    const tick = async () => {
      if (busy) return
      busy = true
      try {
        const f = await handle.getFile()
        if (cancelled || f.lastModified === lastRef.current) return
        lastRef.current = f.lastModified
        // images and PDFs are shown from the File itself; text is read unless it is huge or not actually text
        const readable = kind !== 'image' && kind !== 'pdf' && f.size <= TEXT_MAX && (kind !== 'text' || (await looksLikeText(f)))
        const t = readable ? await f.text() : null
        if (cancelled) return
        setFile(f)
        setText(t)
        setLastModified(f.lastModified)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(msg(e))
      } finally {
        busy = false
      }
    }
    void tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [handle])

  const open = useCallback(
    async (startIn?: FileSystemHandle) => {
      try {
        const [h] = await window.showOpenFilePicker({ ...PICKER, startIn: startIn ?? rootRef.current ?? undefined })
        await select(h)
      } catch (e) {
        fail(e)
      }
    },
    [select, fail],
  )

  const openEntry = useCallback(
    (e: HistoryEntry) => {
      // optimistic: bump (below favorites) and highlight now, persist after
      setActiveId(e.id ?? null)
      setHistory((h) => sortHistory([{ ...e, openedAt: Date.now() }, ...h.filter((x) => x.id !== e.id)]))
      return select(e.handle).catch(fail)
    },
    [select, fail],
  )

  /** Pick the root folder; keeps the open file (re-resolving its path) or lists the root. Returns the new base. */
  const chooseRoot = useCallback(async (): Promise<Segs | null> => {
    try {
      const r = await window.showDirectoryPicker({ mode: 'read', startIn: rootRef.current ?? undefined })
      await putRoot(r)
      setRoot(r)
      rootRef.current = r
      const h = handleRef.current
      if (!h) {
        await openDir([])
        return []
      }
      const p = await r.resolve(h).catch(() => null)
      setPath(p)
      setUrl(p ? pathToHash(p, 'file') : '', false)
      setActiveId(await addHistory(h, p))
      setHistory(await listHistory())
      return p ? p.slice(0, -1) : null
    } catch (e) {
      fail(e)
      return null
    }
  }, [openDir, fail])

  /** Forget the root folder; an open file stays open (without a path), a listing goes back to the splash. */
  const clearRoot = useCallback(async () => {
    try {
      await deleteRoot()
      setRoot(null)
      rootRef.current = null
      setPath(null)
      setDirPath(null)
      setEntries(null)
      setReadme(null)
      setPending(null)
      setUrl('', false)
      const h = handleRef.current
      if (h) {
        setActiveId(await addHistory(h, null))
        setHistory(await listHistory())
      }
    } catch (e) {
      fail(e)
    }
  }, [fail])

  /** Follow a relative link from the current document; asks for a root folder first if there is none. */
  const openLink = useCallback(
    async (href: string) => {
      const base = baseRef.current ?? (await chooseRoot())
      if (base == null) return
      const target = resolveHref(base, href)
      if (!target) return setError(`Link leaves the root folder: ${href}`)
      setHash(target.hash)
      await openPath(target.segs)
    },
    [chooseRoot, openPath],
  )

  /** Blob URL for a relative image/asset, or null if it can't be resolved. */
  const resolveUrl = useCallback(async (src: string): Promise<string | null> => {
    const r = rootRef.current
    const base = baseRef.current
    if (!r || base == null) return null
    const target = resolveHref(base, src)
    if (!target) return null
    try {
      return URL.createObjectURL(await (await getFile(r, target.segs)).getFile())
    } catch {
      return null
    }
  }, [])

  /** Open the folder `depth` levels below the root (0 = root) as a listing. */
  const openAt = useCallback(
    (depth: number) => {
      const segs = path ?? dirPath
      if (segs) void openDir(segs.slice(0, depth))
    },
    [path, dirPath, openDir],
  )

  const openDirEntry = useCallback(
    (e: DirEntry) => {
      if (dirPath) void openPath([...dirPath, e.name])
    },
    [dirPath, openPath],
  )

  /** Back to the splash: closes the file or listing, keeps root and history. */
  const goHome = useCallback(() => {
    setHandle(null)
    setFile(null)
    setText(null)
    setPath(null)
    setDirPath(null)
    setEntries(null)
    setReadme(null)
    setActiveId(null)
    setError(null)
    setRaw(false)
    setUrl('', true)
  }, [])

  /** Switch between the rendered and the source view of the open file. */
  const setView = useCallback((r: boolean) => {
    setRaw(r)
    setUrl(location.hash, false, r)
  }, [])

  const resume = useCallback(() => {
    const target = hashToPath('#' + (pending ?? ''))
    if (target) void openPath(target.segs, false)
  }, [pending, openPath])

  /** Pin/unpin a recent entry; optimistic, persisted after. */
  const toggleFavorite = useCallback(
    (id: number) => {
      const next = !history.find((x) => x.id === id)?.favorite
      setHistory((h) => sortHistory(h.map((x) => (x.id === id ? { ...x, favorite: next } : x))))
      return setFavorite(id, next).catch(fail)
    },
    [history, fail],
  )

  const remove = useCallback(
    (id: number) =>
      removeHistory(id)
        .then(() => {
          setHistory((h) => h.filter((e) => e.id !== id))
          setActiveId((a) => (a === id ? null : a))
        })
        .catch(fail),
    [fail],
  )

  return {
    supported,
    name: handle?.name ?? null,
    kind: (handle ? fileKind(handle.name) : null) as FileKind | null,
    file,
    raw,
    setView,
    rootName: root?.name ?? null,
    path,
    dirPath,
    entries,
    readme,
    hash,
    pending,
    history,
    activeId,
    text,
    lastModified,
    error,
    open,
    openAt,
    openDir,
    openDirEntry,
    openEntry,
    goHome,
    openLink,
    openPath,
    resolveUrl,
    resume,
    chooseRoot,
    clearRoot,
    removeEntry: remove,
    toggleFavorite,
  }
}
