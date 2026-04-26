import type { StudentSummaryData } from '../types/summary'
import PizZip from 'pizzip'
import i18n from '@/i18n'

function t(key: string): string {
    return i18n.global.t(key)
}

export function extractModuleNames(students: StudentSummaryData[]): string[] {
    for (const s of students) {
        const keys = Object.keys(s.moduleGrades)
        if (keys.length > 0) return keys
    }
    return []
}

function sortByName(students: StudentSummaryData[]): StudentSummaryData[] {
    return [...students].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
}

function cellValue(v: string | number | null | undefined): string {
    if (v == null) return ''
    return String(v)
}

// ── CSV ────────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

export function exportSummaryCsv(students: StudentSummaryData[], groupName: string): Blob {
    const sorted = sortByName(students)
    const moduleNames = extractModuleNames(sorted)
    const header = [
        '#',
        t('control.settings.summaryExport.colName'),
        ...moduleNames,
        t('control.settings.summaryExport.colTotal'),
        t('control.settings.summaryExport.colExam'),
    ]
        .map(csvEscape)
        .join(',')

    const rows = sorted.map((s, i) => {
        return [
            String(i + 1),
            csvEscape(s.name),
            ...moduleNames.map((m) => csvEscape(cellValue(s.moduleGrades[m]))),
            csvEscape(cellValue(s.total)),
            csvEscape(cellValue(s.examGrade)),
        ].join(',')
    })

    const date = new Date().toISOString().split('T')[0]
    const title = `${t('control.settings.summaryExport.csvTitle')}: ${groupName} (${date})`
    const csv = [title, header, ...rows].join('\r\n')
    return new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
}

// ── DOCX ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface RProps {
    bold?: boolean
    size?: number
    underline?: boolean
}
interface PProps {
    center?: boolean
}

function rPr({ bold, size = 20, underline }: RProps = {}): string {
    const b = bold ? '<w:b/><w:bCs/>' : ''
    const u = underline ? '<w:u w:val="single"/>' : ''
    const sz = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
    const fn =
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
    return `<w:rPr>${fn}${b}${u}${sz}</w:rPr>`
}

function pPr({ center }: PProps = {}): string {
    const jc = center ? '<w:jc w:val="center"/>' : ''
    return `<w:pPr><w:spacing w:before="0" w:after="0"/>${jc}</w:pPr>`
}

function run(text: string, r: RProps = {}): string {
    const ws = /^ | $/.test(text) ? ' xml:space="preserve"' : ''
    return `<w:r>${rPr(r)}<w:t${ws}>${esc(text)}</w:t></w:r>`
}

function para(text: string, r: RProps = {}, p: PProps = {}): string {
    return `<w:p>${pPr(p)}${run(text, r)}</w:p>`
}

function emptyPara(): string {
    return `<w:p>${pPr()}</w:p>`
}

type TcOpts = RProps & PProps & { w: number }

function tc(text: string, o: TcOpts): string {
    const width = `<w:tcW w:w="${o.w}" w:type="dxa"/>`
    const margin = `<w:tcMar>
        <w:top w:w="40" w:type="dxa"/>
        <w:left w:w="80" w:type="dxa"/>
        <w:bottom w:w="40" w:type="dxa"/>
        <w:right w:w="80" w:type="dxa"/>
    </w:tcMar>`
    const tcPr = `<w:tcPr>${width}<w:vAlign w:val="center"/>${margin}</w:tcPr>`
    const rOpts: RProps = { bold: o.bold, size: o.size, underline: o.underline }
    return `<w:tc>${tcPr}${para(text, rOpts, { center: o.center })}</w:tc>`
}

function trCompact(cells: string[]): string {
    return `<w:tr><w:trPr><w:trHeight w:val="300" w:hRule="atLeast"/></w:trPr>${cells.join('')}</w:tr>`
}

function tbl(rows: string[], gridCols: number[]): string {
    const totalW = gridCols.reduce((a, b) => a + b, 0)
    const bVal = 'w:val="single" w:sz="4" w:space="0" w:color="000000"'
    const borders = `<w:tblBorders>
        <w:top ${bVal}/><w:left ${bVal}/><w:bottom ${bVal}/><w:right ${bVal}/>
        <w:insideH ${bVal}/><w:insideV ${bVal}/>
    </w:tblBorders>`
    const grid = gridCols.map((cw) => `<w:gridCol w:w="${cw}"/>`).join('')
    return `<w:tbl>
    <w:tblPr>
        <w:tblW w:w="${totalW}" w:type="dxa"/>
        ${borders}
        <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid>${grid}</w:tblGrid>
    ${rows.join('\n')}
</w:tbl>`
}

// Column layout constants (A4 narrow margins ≈ 9921 twips content width)
const PAGE_WIDTH = 9921
const NUM_COL = 400
const TOTAL_COL = 1000
const EXAM_COL = 1000
const NAME_COL = Math.round(PAGE_WIDTH * 0.44) // ~4365

function buildDocumentXml(students: StudentSummaryData[], groupName: string): string {
    const sorted = sortByName(students)
    const moduleNames = extractModuleNames(sorted)
    const date = new Date().toLocaleDateString()

    const nameColWidth =
        moduleNames.length === 0 ? PAGE_WIDTH - NUM_COL - TOTAL_COL - EXAM_COL : NAME_COL
    const moduleColWidth =
        moduleNames.length > 0
            ? Math.floor(
                  (PAGE_WIDTH - NUM_COL - nameColWidth - TOTAL_COL - EXAM_COL) / moduleNames.length,
              )
            : 0

    const gridCols = [
        NUM_COL,
        nameColWidth,
        ...moduleNames.map(() => moduleColWidth),
        TOTAL_COL,
        EXAM_COL,
    ]

    const DATA_SIZE = 18 // 9 pt — compact rows

    const hdrRow = trCompact([
        tc('#', { w: NUM_COL, bold: true, center: true, size: DATA_SIZE }),
        tc(t('control.settings.summaryExport.colName'), {
            w: nameColWidth,
            bold: true,
            center: true,
            size: DATA_SIZE,
        }),
        ...moduleNames.map((m) =>
            tc(m, { w: moduleColWidth, bold: true, center: true, size: DATA_SIZE }),
        ),
        tc(t('control.settings.summaryExport.colTotal'), {
            w: TOTAL_COL,
            bold: true,
            center: true,
            size: DATA_SIZE,
        }),
        tc(t('control.settings.summaryExport.colExam'), {
            w: EXAM_COL,
            bold: true,
            center: true,
            size: DATA_SIZE,
        }),
    ])

    const dataRows = sorted.map((s, i) =>
        trCompact([
            tc(String(i + 1), { w: NUM_COL, center: true, size: DATA_SIZE }),
            tc(s.name, { w: nameColWidth, underline: true, size: DATA_SIZE }),
            ...moduleNames.map((m) =>
                tc(cellValue(s.moduleGrades[m]), {
                    w: moduleColWidth,
                    center: true,
                    size: DATA_SIZE,
                }),
            ),
            tc(cellValue(s.total), { w: TOTAL_COL, center: true, size: DATA_SIZE }),
            tc(cellValue(s.examGrade), { w: EXAM_COL, center: true, size: DATA_SIZE }),
        ]),
    )

    const sectPr = `<w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="1134"
                 w:header="709" w:footer="709" w:gutter="0"/>
    </w:sectPr>`

    const parts = [
        para(
            t('control.settings.summaryExport.docTitle'),
            { bold: true, size: 28 },
            { center: true },
        ),
        para(groupName, { size: 24 }, { center: true }),
        para(date, { size: 20 }, { center: true }),
        emptyPara(),
        tbl([hdrRow, ...dataRows], gridCols),
    ]

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
    mc:Ignorable="w14">
    <w:body>
${parts.join('\n')}
${sectPr}
    </w:body>
</w:document>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml"  ContentType="application/xml"/>
    <Override PartName="/word/document.xml"
        ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml"
        ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        Target="word/document.xml"/>
</Relationships>`

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
        Target="styles.xml"/>
</Relationships>`

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
        <w:rPrDefault>
            <w:rPr>
                <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
                <w:sz w:val="20"/>
                <w:szCs w:val="20"/>
            </w:rPr>
        </w:rPrDefault>
        <w:pPrDefault>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
        </w:pPrDefault>
    </w:docDefaults>
</w:styles>`

export function exportSummaryDocx(students: StudentSummaryData[], groupName: string): Blob {
    const zip = new PizZip()
    zip.file('[Content_Types].xml', CONTENT_TYPES)
    zip.file('_rels/.rels', RELS)
    zip.file('word/document.xml', buildDocumentXml(students, groupName))
    zip.file('word/styles.xml', STYLES)
    zip.file('word/_rels/document.xml.rels', DOC_RELS)

    const buffer = zip.generate({ type: 'arraybuffer', compression: 'DEFLATE' })
    return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
}
