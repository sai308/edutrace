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

export const documentGenerator = {
    /**
     * Integrates with docxtemplater and OPFS to generate documents.
     * Extracts the template from OPFS, renders data into it, and optionally saves the result back.
     *
     * @param options Document generation options
     * @returns A Promise resolving to the generated Blob
     */
    async generateFromTemplate(options: DocumentGeneratorOptions): Promise<Blob> {
        const { templateDir, templateName, data, outputDir, outputName } = options

        // 1. Fetch template from OPFS
        const templateFile = await opfs.getFile(templateDir, templateName)
        const arrayBuffer = await templateFile.arrayBuffer()

        // 2. Load into PizZip
        const zip = new PizZip(arrayBuffer)

        // 3. Initialize Docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        })

        // 4. Render template
        doc.render(data)

        // 5. Generate output ArrayBuffer
        const outputBuffer = doc.getZip().generate({
            type: 'arraybuffer',
            compression: 'DEFLATE',
        })

        const outputBlob = new Blob([outputBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        // 6. Optionally save back to OPFS
        if (outputDir && outputName) {
            await opfs.saveFile(outputDir, outputName, outputBlob)
        }

        return outputBlob
    },
}
