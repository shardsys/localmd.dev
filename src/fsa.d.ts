// File System Access API bits missing from lib.dom (Chromium only).
type WellKnownDirectory = 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
interface FileSystemHandle {
  queryPermission(d?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(d?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}
interface Window {
  showOpenFilePicker(o?: {
    multiple?: boolean
    excludeAcceptAllOption?: boolean
    startIn?: FileSystemHandle | WellKnownDirectory
    types?: { description?: string; accept: Record<string, string[]> }[]
  }): Promise<FileSystemFileHandle[]>
  showDirectoryPicker(o?: {
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemHandle | WellKnownDirectory
  }): Promise<FileSystemDirectoryHandle>
}
