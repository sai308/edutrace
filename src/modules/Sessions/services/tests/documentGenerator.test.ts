import { beforeEach, describe, expect, it, vi } from 'vitest'
import { opfs } from '@/shared/services/opfs'
import { documentGenerator } from '../documentGenerator'

// Mock dependencies
vi.mock('@/shared/services/opfs', () => ({
    opfs: {
        getFile: vi.fn(),
        saveFile: vi.fn(),
    },
}))

vi.mock('pizzip', () => ({
    default: class MockPizZip {},
}))

vi.mock('docxtemplater', () => ({
    default: class MockDocxtemplater {
        render = vi.fn()
        getZip = vi.fn().mockReturnValue({
            generate: vi.fn().mockReturnValue(new ArrayBuffer(8)),
        })
    },
}))

describe('documentGenerator service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should extract template, render data, and return a Blob without saving if no output specified', async () => {
        const mockArrayBuffer = new ArrayBuffer(4)
        const mockFile = {
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        }
        ;(opfs.getFile as any).mockResolvedValue(mockFile)

        const result = await documentGenerator.generateFromTemplate({
            templateDir: 'templates',
            templateName: 'invoice.docx',
            data: { name: 'John Doe' },
        })

        // 1. Fetches file
        expect(opfs.getFile).toHaveBeenCalledWith('templates', 'invoice.docx')
        expect(mockFile.arrayBuffer).toHaveBeenCalled()

        // 2. Blob returned
        expect(result).toBeInstanceOf(Blob)
        expect(result.type).toBe(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )

        // 3. No save call
        expect(opfs.saveFile).not.toHaveBeenCalled()
    })

    it('should save the generated Blob back to OPFS if output options are provided', async () => {
        const mockArrayBuffer = new ArrayBuffer(4)
        const mockFile = {
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        }
        ;(opfs.getFile as any).mockResolvedValue(mockFile)

        await documentGenerator.generateFromTemplate({
            templateDir: 'templates',
            templateName: 'invoice.docx',
            data: { name: 'John Doe' },
            outputDir: 'generated',
            outputName: 'invoice_123.docx',
        })

        expect(opfs.saveFile).toHaveBeenCalledWith(
            'generated',
            'invoice_123.docx',
            expect.any(Blob),
        )
    })
})
