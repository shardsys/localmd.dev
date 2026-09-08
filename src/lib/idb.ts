// IndexedDB: "kv" holds the root directory handle, "history" the opened file handles.
// (localStorage cannot hold FileSystemHandles.)
const DB = 'localmd'
const KV = 'kv'
const HISTORY = 'history'
const HISTORY_MAX = 50

export type HistoryEntry = {
  id?: number
  handle: FileSystemFileHandle
  name: string
  path: string[] | null // relative to the root folder, null if outside it
  openedAt: number
  favorite?: boolean // pinned above the rest, never trimmed
}

function db(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore(KV)
      r.result.createObjectStore(HISTORY, { keyPath: 'id', autoIncrement: true })
    }
    r.onsuccess = () => ok(r.result)
    r.onerror = () => no(r.error)
  })
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((ok, no) => {
    const q = fn(d.transaction(store, mode).objectStore(store))
    q.onsuccess = () => ok(q.result)
    q.onerror = () => no(q.error)
  })
}

export const getRoot = () => run(KV, 'readonly', (s) => s.get('root') as IDBRequest<FileSystemDirectoryHandle | undefined>)
export const putRoot = (h: FileSystemDirectoryHandle) => run(KV, 'readwrite', (s) => s.put(h, 'root'))
export const deleteRoot = () => run(KV, 'readwrite', (s) => s.delete('root'))

/** Favorites first, then most recently opened. */
export const sortHistory = (all: HistoryEntry[]) =>
  [...all].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || b.openedAt - a.openedAt)

export async function listHistory(): Promise<HistoryEntry[]> {
  return sortHistory(await run(HISTORY, 'readonly', (s) => s.getAll() as IDBRequest<HistoryEntry[]>))
}

/** Insert or bump an entry; dedupes by handle identity, keeps the newest HISTORY_MAX non-favorites. Returns its id. */
export async function addHistory(handle: FileSystemFileHandle, path: string[] | null): Promise<number> {
  const all = await listHistory()
  let prev: HistoryEntry | undefined
  for (const e of all) if (await handle.isSameEntry(e.handle)) prev = e
  const entry: HistoryEntry = { handle, name: handle.name, path, openedAt: Date.now(), favorite: prev?.favorite }
  if (prev?.id != null) entry.id = prev.id // omit id so the key generator assigns one
  const key = await run(HISTORY, 'readwrite', (s) => s.put(entry))
  const stale = all.filter((e) => e.id !== prev?.id && !e.favorite).slice(HISTORY_MAX - 1)
  for (const e of stale) await run(HISTORY, 'readwrite', (s) => s.delete(e.id!))
  return key as number
}

export async function setFavorite(id: number, favorite: boolean): Promise<void> {
  const e = await run(HISTORY, 'readonly', (s) => s.get(id) as IDBRequest<HistoryEntry | undefined>)
  if (e) await run(HISTORY, 'readwrite', (s) => s.put({ ...e, favorite }))
}

export const removeHistory = (id: number) => run(HISTORY, 'readwrite', (s) => s.delete(id))
