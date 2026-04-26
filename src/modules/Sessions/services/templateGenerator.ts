/**
 * Generates a starter .docx template for Session document generation.
 *
 * The output file contains the correct academic form structure with all
 * docxtemplater Mustache placeholders already in place. Users can open
 * it in Word or LibreOffice, adjust fonts/layout/branding, and re-upload
 * it to Documents Settings.
 *
 * Variable reference — scalars:
 *   {recordNumber}  {date}  {course}  {groupName}
 *   {subject}  {semester}  {academicYear}  {formOfControl}
 *   {totalHours}  {examiner}  {practicalTeacher}  {totalStudents}
 *
 * Row loop  ({#entries} … {/entries}):
 *   {index}  {fullName}  {gradeBookId}  {nationalGrade}  {points}  {ects}
 *
 * ECTS distribution:
 *   {countA}  {countB}  {countC}  {countD}  {countE}  {countFX}  {countF}  {countAbsent}
 */

import PizZip from 'pizzip'
import i18n from '@/i18n'

// ── OOXML micro-helpers ────────────────────────────────────────────────────

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface RProps {
    bold?: boolean
    italic?: boolean
    size?: number
}
interface PProps {
    center?: boolean
    right?: boolean
}

function rPr({ bold, italic, size = 20 }: RProps = {}): string {
    const b = bold ? '<w:b/><w:bCs/>' : ''
    const it = italic ? '<w:i/><w:iCs/>' : ''
    const sz = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`
    const fn = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
    return `<w:rPr>${fn}${b}${it}${sz}</w:rPr>`
}

function pPr({ center, right }: PProps = {}): string {
    const jc = center ? '<w:jc w:val="center"/>' : right ? '<w:jc w:val="right"/>' : ''
    return `<w:pPr><w:spacing w:after="0"/>${jc}</w:pPr>`
}

/** Single run of text. */
function run(text: string, r: RProps = {}): string {
    const ws = /^ | $/.test(text) ? ' xml:space="preserve"' : ''
    return `<w:r>${rPr(r)}<w:t${ws}>${esc(text)}</w:t></w:r>`
}

/** Paragraph with a single run. */
function para(text: string, r: RProps = {}, p: PProps = {}): string {
    return `<w:p>${pPr(p)}${run(text, r)}</w:p>`
}

/** Empty paragraph (used as spacer). */
function emptyPara(): string {
    return `<w:p>${pPr()}</w:p>`
}

// ── Table helpers ──────────────────────────────────────────────────────────

type TcOpts = RProps
    & PProps & {
        w?: number // cell width in twips (dxa)
        span?: number // horizontal gridSpan
        vm?: 'start' | 'cont' // vMerge: start=restart, cont=continue
        vAlign?: 'center'
        underline?: boolean // bottom-border underline on the cell
    }

function tcBorders(underline?: boolean): string {
    if (!underline)
        return ''
    const none = 'w:val="none"'
    const line = 'w:val="single" w:sz="4" w:space="0" w:color="000000"'
    return `<w:tcBorders><w:top ${none}/><w:left ${none}/><w:bottom ${line}/><w:right ${none}/></w:tcBorders>`
}

function tc(text: string, o: TcOpts = {}): string {
    const width = o.w != null ? `<w:tcW w:w="${o.w}" w:type="dxa"/>` : ''
    const span = o.span ? `<w:gridSpan w:val="${o.span}"/>` : ''
    const vm = o.vm === 'start' ? '<w:vMerge w:val="restart"/>' : o.vm === 'cont' ? '<w:vMerge/>' : ''
    const vAlign = o.vAlign === 'center' ? '<w:vAlign w:val="center"/>' : ''
    const borders = tcBorders(o.underline)
    const tcPr = `<w:tcPr>${width}${span}${vm}${vAlign}${borders}</w:tcPr>`
    const rOpts: RProps = { bold: o.bold, italic: o.italic, size: o.size }
    const pOpts: PProps = { center: o.center, right: o.right }
    return `<w:tc>${tcPr}${para(text, rOpts, pOpts)}</w:tc>`
}

function tr(cells: string[]): string {
    return `<w:tr>${cells.join('')}</w:tr>`
}

/**
 * Table element.
 * @param rows     Array of <w:tr> strings.
 * @param borders  Whether to draw full grid borders.
 * @param gridCols Column widths in twips for <w:tblGrid> (required for fixed layout).
 */
function tbl(rows: string[], borders: boolean, gridCols: number[]): string {
    const w = gridCols.reduce((a, b) => a + b, 0)
    const bVal = 'w:val="single" w:sz="4" w:space="0" w:color="000000"'
    const bStr = borders
        ? `<w:tblBorders>
        <w:top ${bVal}/><w:left ${bVal}/><w:bottom ${bVal}/><w:right ${bVal}/>
        <w:insideH ${bVal}/><w:insideV ${bVal}/>
    </w:tblBorders>`
        : ''
    const grid = gridCols.map(cw => `<w:gridCol w:w="${cw}"/>`).join('')
    return `<w:tbl>
    <w:tblPr>
        <w:tblW w:w="${w}" w:type="dxa"/>
        ${bStr}
        <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid>${grid}</w:tblGrid>
    ${rows.join('\n')}
</w:tbl>`
}

// ── Document sections ──────────────────────────────────────────────────────

function buildDocumentXml(): string {
    const t = (key: string) => i18n.global.t(key)
    const ex = (key: string) => t(`sessions.grades.${key}`)
    const pt = (key: string) => t(`sessions.printTemplate.${key}`)

    const parts: string[] = []

    // ── 1. Institution header ──────────────────────────────────────────────
    parts.push(para(pt('college'), {}, { center: true }))
    parts.push(para(pt('university'), { bold: true }, { center: true }))
    parts.push(emptyPara())

    // ── 2. Top metadata (no-border table) ─────────────────────────────────
    // Columns: label(2200) | value(2500) | spacer(1000) | label(1500) | value(1500) | label(800) | value(1000)
    const META_COLS: [number, number, number, number, number, number, number] = [
        2200,
        2500,
        1000,
        1500,
        1500,
        800,
        1000,
    ]
    parts.push(
        tbl(
            [
                // Study form row (static — institutions rarely change this)
                tr([
                    tc(`${pt('studyForm')}:`, { w: META_COLS[0] }),
                    tc('{studyForm}', { w: META_COLS[1], underline: true }),
                    tc('', {
                        w: META_COLS[2] + META_COLS[3] + META_COLS[4] + META_COLS[5] + META_COLS[6],
                        span: 5,
                    }),
                ]),
                // Specialty row (static — same note)
                tr([
                    tc(`${pt('specialty')}:`, { w: META_COLS[0] }),
                    tc('{specialty}', {
                        w: META_COLS[1] + META_COLS[2] + META_COLS[3] + META_COLS[4] + META_COLS[5] + META_COLS[6],
                        span: 6,
                        underline: true,
                    }),
                ]),
                // Course / Group / Record number
                tr([
                    tc(`${pt('course')}:`, { w: META_COLS[0] }),
                    tc('{course}', { w: META_COLS[1], underline: true }),
                    tc('', { w: META_COLS[2] }),
                    tc(`${pt('group')}:`, { w: META_COLS[3] }),
                    tc('{groupName}', { w: META_COLS[4], underline: true }),
                    tc(pt('recordTitle'), { w: META_COLS[5], bold: true }),
                    tc('{recordNumber}', { w: META_COLS[6], underline: true, bold: true }),
                ]),
            ],
            false,
            META_COLS,
        ),
    )

    // Date — centered on an underline
    parts.push(para('{date}', { size: 20 }, { center: true }))
    parts.push(emptyPara())

    // ── 3. Subject block (no-border table) ────────────────────────────────
    const SUB_COLS: [number, number, number, number] = [3200, 3600, 1800, 800]
    // Last two columns are for the "form of control" key+value pair
    // Use span 3 for value in first row
    parts.push(
        tbl(
            [
                // Discipline
                tr([
                    tc(`${pt('subjectLabel')}: `, { w: SUB_COLS[0] }),
                    tc('{subject}', {
                        w: SUB_COLS[1] + SUB_COLS[2] + SUB_COLS[3],
                        span: 3,
                        underline: true,
                        bold: true,
                    }),
                ]),
                // Semester / Form of control
                tr([
                    tc(`${pt('groupLabel')}: `, { w: SUB_COLS[0] }),
                    tc(`{semester} ${pt('academicYear')}`, { w: SUB_COLS[1], underline: true }),
                    tc(` ${pt('formOfControl')}: `, { w: SUB_COLS[2] }),
                    tc('{formOfControl}', { w: SUB_COLS[3], underline: true, bold: true }),
                ]),
                // Total hours / Examiner
                tr([
                    tc(`${pt('totalHours')}: `, { w: SUB_COLS[0] }),
                    tc('{totalHours}', { w: 600, underline: true }),
                    tc(` ${pt('examinerPib')}: `, { w: SUB_COLS[1] + SUB_COLS[2] - 600, span: 1 }),
                    tc('{examiner}', { w: SUB_COLS[3] + 600, underline: true, bold: true }),
                ]),
                // Practical teacher (spans full width)
                tr([
                    tc(`${pt('practicalTeacherHint')}: `, {
                        w: SUB_COLS[0] + SUB_COLS[1],
                        span: 2,
                        size: 18,
                    }),
                    tc('{practicalTeacher}', {
                        w: SUB_COLS[2] + SUB_COLS[3],
                        span: 2,
                        underline: true,
                        bold: true,
                    }),
                ]),
            ],
            false,
            [SUB_COLS[0], SUB_COLS[1], SUB_COLS[2], SUB_COLS[3]],
        ),
    )

    parts.push(emptyPara())

    // ── 4. Grades table ───────────────────────────────────────────────────
    // 7 columns: №, ПІБ, ПНП, National, Points, ECTS, Signature
    // Total ≈ 9921 twips (A4 content width at the configured margins)
    const GW: [number, number, number, number, number, number, number] = [500, 3000, 1600, 1800, 800, 700, 521]

    const gradeHdr1 = tr([
        tc(pt('table.number'), {
            w: GW[0],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
        tc(pt('table.fullName'), {
            w: GW[1],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
        tc(pt('table.pnp'), {
            w: GW[2],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
        tc(pt('table.grade'), {
            w: GW[3] + GW[4] + GW[5],
            span: 3,
            bold: true,
            center: true,
            size: 18,
        }),
        tc(pt('table.signature'), {
            w: GW[6],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
    ])

    const gradeHdr2 = tr([
        tc('', { w: GW[0], vm: 'cont' }),
        tc('', { w: GW[1], vm: 'cont' }),
        tc('', { w: GW[2], vm: 'cont' }),
        tc(pt('table.national'), { w: GW[3], bold: true, center: true, size: 18 }),
        tc(pt('table.points'), { w: GW[4], bold: true, center: true, size: 18 }),
        tc(pt('table.ects'), { w: GW[5], bold: true, center: true, size: 18 }),
        tc('', { w: GW[6], vm: 'cont' }),
    ])

    // Data row: {#entries} opens the loop in cell 1, {/entries} closes it in cell 7.
    // docxtemplater repeats the entire <w:tr> for each entry in the array.
    const gradeData = tr([
        tc('{#entries}{index}', { w: GW[0], center: true }),
        tc('{fullName}', { w: GW[1] }),
        tc('{gradeBookId}', { w: GW[2], center: true, size: 16 }),
        tc('{nationalGrade}', { w: GW[3], center: true }),
        tc('{points}', { w: GW[4], center: true }),
        tc('{ects}', { w: GW[5], center: true, bold: true }),
        tc('{/entries}', { w: GW[6] }),
    ])

    parts.push(tbl([gradeHdr1, gradeHdr2, gradeData], true, GW))
    parts.push(emptyPara())

    // Head of department signature
    parts.push(
        para(`${pt('headOfDepartment')} _________________   _______________________________________`, { size: 18 }),
    )
    parts.push(emptyPara())

    // ── 5. ECTS distribution table ────────────────────────────────────────
    const EW: [number, number, number, number, number] = [900, 1100, 700, 1700, 1700] // total = 6100

    const ectsHdr1 = tr([
        tc(pt('ectsLegend.totalGrades'), {
            w: EW[0],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
        tc(pt('ectsLegend.totalPoints'), {
            w: EW[1],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
        tc(pt('ectsLegend.ectsGrade'), {
            w: EW[2],
            bold: true,
            center: true,
            vm: 'start',
            vAlign: 'center',
            size: 18,
        }),
        tc(pt('ectsLegend.nationalScale'), {
            w: EW[3] + EW[4],
            span: 2,
            bold: true,
            center: true,
            size: 18,
        }),
    ])
    const ectsHdr2 = tr([
        tc('', { w: EW[0], vm: 'cont' }),
        tc('', { w: EW[1], vm: 'cont' }),
        tc('', { w: EW[2], vm: 'cont' }),
        tc(pt('ectsLegend.exam'), { w: EW[3], bold: true, center: true, size: 18 }),
        tc(pt('ectsLegend.credit'), { w: EW[4], bold: true, center: true, size: 18 }),
    ])

    const ectsRows: Array<[string, string, string, string, string]> = [
        ['{countA}', '90–100', 'A', ex('excellent'), ex('passed')],
        ['{countB}', '82–89', 'B', ex('good'), ex('passed')],
        ['{countC}', '74–81', 'C', ex('good'), ex('passed')],
        ['{countD}', '64–73', 'D', ex('satisfactory'), ex('passed')],
        ['{countE}', '60–63', 'E', ex('satisfactory'), ex('passed')],
        ['{countFX}', '35–59', 'FX', ex('unsatisfactory'), ex('notPassed')],
        ['{countF}', '1–34', 'F', ex('unsatisfactory'), ex('notPassed')],
    ]

    const ectsDataRows = ectsRows.map(([count, range, grade, exam, credit]) =>
        tr([
            tc(count, { w: EW[0], center: true, size: 18 }),
            tc(range, { w: EW[1], center: true, size: 18 }),
            tc(grade, { w: EW[2], center: true, bold: true, size: 18 }),
            tc(exam, { w: EW[3], center: true, size: 18 }),
            tc(credit, { w: EW[4], center: true, size: 18 }),
        ]),
    )

    const ectsAbsent = tr([
        tc('{countAbsent}', { w: EW[0], center: true, size: 18 }),
        tc(t('sessions.grades.absentTooltip'), {
            w: EW[1] + EW[2] + EW[3] + EW[4],
            span: 4,
            center: true,
            size: 18,
        }),
    ])

    parts.push(tbl([ectsHdr1, ectsHdr2, ...ectsDataRows, ectsAbsent], true, EW))
    parts.push(emptyPara())

    // Examiner signature
    parts.push(para(`${pt('examinerSignature')} _________________`, { size: 18 }))

    // ── Page setup: A4, narrow margins ────────────────────────────────────
    const sectPr = `<w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="1134"
                 w:header="709" w:footer="709" w:gutter="0"/>
    </w:sectPr>`

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

// ── Supporting package files ───────────────────────────────────────────────

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

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Builds a starter .docx template Blob.
 * The document contains the complete session form layout with all
 * docxtemplater variable placeholders filled in as plain text.
 */
export function generateTemplateBlob(): Blob {
    const zip = new PizZip()
    zip.file('[Content_Types].xml', CONTENT_TYPES)
    zip.file('_rels/.rels', RELS)
    zip.file('word/document.xml', buildDocumentXml())
    zip.file('word/styles.xml', STYLES)
    zip.file('word/_rels/document.xml.rels', DOC_RELS)

    const buffer = zip.generate({ type: 'arraybuffer', compression: 'DEFLATE' })
    return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
}
