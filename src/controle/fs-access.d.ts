// Partes da File System Access API (Chrome/Edge) que o lib.dom do TypeScript ainda não declara.

type FilePickerAcceptType = { description?: string; accept: Record<string, string[]> }

interface Window {
  showSaveFilePicker?: (options?: { suggestedName?: string; types?: FilePickerAcceptType[] }) => Promise<FileSystemFileHandle>
  showOpenFilePicker?: (options?: { multiple?: boolean; types?: FilePickerAcceptType[] }) => Promise<FileSystemFileHandle[]>
}

interface FileSystemHandle {
  queryPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}
