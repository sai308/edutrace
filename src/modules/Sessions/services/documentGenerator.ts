import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { opfs } from '@/shared/services/opfs'

export interface DocumentGeneratorOptions {
    /** The directory path in OPFS where the template resides */
    templateDir: string
    /** The file name of the template */
    templateName: string
    /** The data record to inject into the template */
    data: Record<string, any>
    /** Optional directory path to save the generated document back to OPFS */
    outputDir?: string
    /** Optional file name to save the generated document */
    outputName?: string
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function renderTemplate(arrayBuffer: ArrayBuffer, data: Record<string, any>): Blob {
    const zip = new PizZip(arrayBuffer)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(data)
    const outBuffer = doc.getZip().generate({ type: 'arraybuffer', compression: 'DEFLATE' })
    return new Blob([outBuffer], { type: DOCX_MIME })
}

export const documentGenerator = {
    async generateFromTemplate(options: DocumentGeneratorOptions): Promise<Blob> {
        const { templateDir, templateName, data, outputDir, outputName } = options

        const templateFile = await opfs.getFile(templateDir, templateName)
        const blob = renderTemplate(await templateFile.arrayBuffer(), data)

        if (outputDir && outputName) {
            await opfs.saveFile(outputDir, outputName, blob)
        }

        return blob
    },

    async generateFromBlob(templateBlob: Blob, data: Record<string, any>): Promise<Blob> {
        return renderTemplate(await templateBlob.arrayBuffer(), data)
    },
}
