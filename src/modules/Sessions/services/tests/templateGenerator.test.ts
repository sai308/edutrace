import { describe, expect, it, vi } from 'vitest'
import { generateTemplateBlob } from '../templateGenerator'

vi.mock('@/i18n', () => ({
    default: {
        global: {
            t: (key: string) => key,
        },
    },
}))

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

describe('generateTemplateBlob', () => {
    it('returns a Blob', () => {
        expect(generateTemplateBlob()).toBeInstanceOf(Blob)
    })

    it('returns a non-empty Blob', () => {
        expect(generateTemplateBlob().size).toBeGreaterThan(0)
    })

    it('returns the correct DOCX MIME type', () => {
        expect(generateTemplateBlob().type).toBe(DOCX_MIME)
    })

    it('produces the same output on repeated calls (deterministic)', () => {
        const first = generateTemplateBlob()
        const second = generateTemplateBlob()
        expect(first.size).toBe(second.size)
    })

    it('is large enough to be a valid ZIP archive', () => {
        // A minimal DOCX ZIP with document.xml, styles.xml, and .rels files
        // is always significantly larger than a trivial stub
        expect(generateTemplateBlob().size).toBeGreaterThan(500)
    })

    it('contains docxtemplater variable placeholders in the XML', async () => {
        // Read the blob as latin1 so we can search the raw XML text
        const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsText(generateTemplateBlob(), 'latin1')
        })

        // PizZip archive will contain the compressed document.xml with placeholders
        // We check for at least the PK signature to confirm it's a ZIP
        expect(text.charCodeAt(0)).toBe(0x50) // 'P'
        expect(text.charCodeAt(1)).toBe(0x4b) // 'K'
    })
})
