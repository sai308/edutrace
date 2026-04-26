/**
 * Service for interacting with the Origin Private File System (OPFS).
 * OPFS is a storage endpoint that is private to the origin of the page.
 * It is suitable for storing large files like doc/docx templates.
 */

export interface FileMetadata {
    name: string
    kind: 'file' | 'directory'
}

/**
 * Resolves a nested directory handle from the root.
 * @param path - The path to the directory (e.g., "templates/docs").
 * @param options - Options for directory retrieval.
 * @param options.create - Whether to create the directory if it doesn't exist.
 */
async function getDirectoryHandle(
    path: string,
    options: { create?: boolean } = {}
): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory()
    if (!path || path === '.' || path === '/') {
        return root
    }

    const segments = path.split('/').filter(Boolean)
    let currentHandle = root

    for (const segment of segments) {
        currentHandle = await currentHandle.getDirectoryHandle(segment, { create: options.create })
    }

    return currentHandle
}

export const opfs = {
    /**
     * Saves a file to the specified directory in OPFS.
     * @param directoryPath - The path where the file should be saved.
     * @param fileName - The name of the file.
     * @param content - The content to save (Blob, File, ArrayBuffer, or string).
     */
    async saveFile(
        directoryPath: string,
        fileName: string,
        content: Blob | File | ArrayBuffer | string
    ): Promise<void> {
        const dirHandle = await getDirectoryHandle(directoryPath, { create: true })
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(content)
        await writable.close()
    },

    /**
     * Retrieves a file from OPFS as a File object.
     * @param directoryPath - The path where the file is located.
     * @param fileName - The name of the file.
     */
    async getFile(directoryPath: string, fileName: string): Promise<File> {
        const dirHandle = await getDirectoryHandle(directoryPath)
        const fileHandle = await dirHandle.getFileHandle(fileName)
        return await fileHandle.getFile()
    },

    /**
     * Checks if a file exists in the specified directory.
     * @param directoryPath - The path to check.
     * @param fileName - The name of the file.
     */
    async fileExists(directoryPath: string, fileName: string): Promise<boolean> {
        try {
            const dirHandle = await getDirectoryHandle(directoryPath)
            await dirHandle.getFileHandle(fileName)
            return true
        } catch {
            return false
        }
    },

    /**
     * Lists all files and directories in a given path.
     * @param directoryPath - The path to list.
     */
    async listItems(directoryPath: string): Promise<FileMetadata[]> {
        const dirHandle = await getDirectoryHandle(directoryPath)
        const items: FileMetadata[] = []

        // Use for-await-of to iterate over the directory entries
        // Note: some browsers might need a polyfill or have different iteration methods,
        // but modern versions support this.
        for await (const [name, handle] of (dirHandle as any).entries()) {
            items.push({
                name,
                kind: handle.kind,
            })
        }

        return items
    },

    /**
     * Deletes a file from the specified directory.
     * @param directoryPath - The path where the file is located.
     * @param fileName - The name of the file.
     */
    async deleteFile(directoryPath: string, fileName: string): Promise<void> {
        const dirHandle = await getDirectoryHandle(directoryPath)
        await dirHandle.removeEntry(fileName)
    },

    /**
     * Deletes an entire directory and its contents.
     * @param directoryPath - The path to delete.
     * @param recursive - Whether to delete contents recursively.
     */
    async deleteDirectory(directoryPath: string, recursive = true): Promise<void> {
        const segments = directoryPath.split('/').filter(Boolean)
        if (segments.length === 0) return // Cannot delete root

        const lastSegment = segments.pop()!
        const parentPath = segments.join('/')
        const parentHandle = await getDirectoryHandle(parentPath)

        await parentHandle.removeEntry(lastSegment, { recursive })
    },
}
