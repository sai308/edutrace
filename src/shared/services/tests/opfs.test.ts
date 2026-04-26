import { beforeEach, describe, expect, it, vi } from 'vitest'
import { opfs } from '../opfs'

// Mock FileSystemHandle classes and navigator.storage
const mockFileHandle = {
    kind: 'file',
    getFile: vi.fn(),
    createWritable: vi.fn(),
}

const mockDirectoryHandle = {
    kind: 'directory',
    getDirectoryHandle: vi.fn(),
    getFileHandle: vi.fn(),
    removeEntry: vi.fn(),
    entries: vi.fn(),
}

describe('opfs service', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // Setup base mocks
        mockDirectoryHandle.getDirectoryHandle.mockResolvedValue(mockDirectoryHandle)
        mockDirectoryHandle.getFileHandle.mockResolvedValue(mockFileHandle)

        const mockStorage = {
            getDirectory: vi.fn().mockResolvedValue(mockDirectoryHandle),
        }

        vi.stubGlobal('navigator', {
            storage: mockStorage,
        })
    })

    describe('saveFile', () => {
        it('should save a file to a nested directory', async () => {
            const mockWritable = {
                write: vi.fn(),
                close: vi.fn(),
            }
            mockFileHandle.createWritable.mockResolvedValue(mockWritable)

            await opfs.saveFile('path/to/dir', 'test.txt', 'content')

            // Verify directory handles are traversed
            expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('path', {
                create: true,
            })
            expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('to', {
                create: true,
            })
            expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('dir', {
                create: true,
            })

            // Verify file creation and writing
            expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('test.txt', {
                create: true,
            })
            expect(mockWritable.write).toHaveBeenCalledWith('content')
            expect(mockWritable.close).toHaveBeenCalled()
        })
    })

    describe('getFile', () => {
        it('should retrieve a file from OPFS', async () => {
            const mockFile = new File(['content'], 'test.txt')
            mockFileHandle.getFile.mockResolvedValue(mockFile)

            const file = await opfs.getFile('path', 'test.txt')

            expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('path', {
                create: undefined,
            })
            expect(mockDirectoryHandle.getFileHandle).toHaveBeenCalledWith('test.txt')
            expect(file).toBe(mockFile)
        })
    })

    describe('fileExists', () => {
        it('should return true if file exists', async () => {
            mockDirectoryHandle.getFileHandle.mockResolvedValue(mockFileHandle)
            const exists = await opfs.fileExists('path', 'test.txt')
            expect(exists).toBe(true)
        })

        it('should return false if file does not exist', async () => {
            mockDirectoryHandle.getFileHandle.mockRejectedValue(new Error('Not found'))
            const exists = await opfs.fileExists('path', 'test.txt')
            expect(exists).toBe(false)
        })
    })

    describe('listItems', () => {
        it('should list items in a directory', async () => {
            const entries = [
                ['file1.txt', { kind: 'file' }],
                ['dir1', { kind: 'directory' }],
            ]

            // Mock the async iterator for entries
            mockDirectoryHandle.entries.mockReturnValue({
                async* [Symbol.asyncIterator]() {
                    for (const entry of entries) {
                        yield entry
                    }
                },
            })

            const items = await opfs.listItems('path')

            expect(items).toEqual([
                { name: 'file1.txt', kind: 'file' },
                { name: 'dir1', kind: 'directory' },
            ])
        })
    })

    describe('deleteFile', () => {
        it('should remove a file entry', async () => {
            await opfs.deleteFile('path', 'test.txt')
            expect(mockDirectoryHandle.removeEntry).toHaveBeenCalledWith('test.txt')
        })
    })

    describe('deleteDirectory', () => {
        it('should remove a directory entry recursively', async () => {
            await opfs.deleteDirectory('parent/child')

            // Should call getDirectoryHandle for "parent"
            expect(mockDirectoryHandle.getDirectoryHandle).toHaveBeenCalledWith('parent', {
                create: undefined,
            })
            // Should call removeEntry on parent for "child"
            expect(mockDirectoryHandle.removeEntry).toHaveBeenCalledWith('child', {
                recursive: true,
            })
        })
    })
})
