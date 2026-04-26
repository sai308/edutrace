import type { PrintFormData } from '../components/dialogs/SessionPrintDialog.vue'
import type { SessionReport } from '../models/session.model'
import type { Group } from '@/modules/Groups/types/groups'
import { studentsRepository } from '@Students/services/students.repository'
import i18n from '@/i18n'
import { opfs } from '@/shared/services/opfs'
import { computeECTSStats, toECTS, toNationalGrade } from '@/shared/utils/grades'
import { documentGenerator } from './documentGenerator'

const TEMPLATE_DIR = 'templates'
const TEMPLATE_NAME = 'print_template.docx'

/**
 * Builds a sanitised filename component from a group name and record number.
 */
function buildFilename(groupName: string, recordNumber: string): string {
    const date = new Date().toISOString().split('T')[0]
    // eslint-disable-next-line regexp/no-obscure-range
    const safe = (s: string) => s.replace(/[^\wА-Яа-яЇїІіЄєҐґ -]/g, '').trim()
    const parts = [safe(groupName), safe(recordNumber), date].filter(Boolean)
    return `${parts.join('-')}.docx`
}

export const sessionDocumentService = {
    /** Returns true if a custom .docx template has been uploaded to OPFS. */
    hasTemplate(): Promise<boolean> {
        return opfs.fileExists(TEMPLATE_DIR, TEMPLATE_NAME)
    },

    /**
     * Generates a .docx document for the given closed session.
     *
     * The template must be uploaded to OPFS at templates/print_template.docx.
     * It uses docxtemplater Mustache syntax. Available variables:
     *
     * Scalars:
     *   {recordNumber}      — Відомість №
     *   {date}              — date string as entered in the dialog
     *   {course}            — курс (from Group)
     *   {groupName}         — назва групи
     *   {subject}           — навчальна дисципліна
     *   {semester}          — семестр
     *   {academicYear}      — навчальний рік (e.g. 2024/2025)
     *   {formOfControl}     — форма контролю
     *   {totalHours}        — загальна кількість годин
     *   {examiner}          — ПІБ екзаменатора (joined if multiple)
     *   {practicalTeacher}  — ПІБ практичного викладача
     *   {totalStudents}     — загальна кількість студентів
     *
     * Row loop  ({#entries}...{/entries}):
     *   {index}             — порядковий номер
     *   {fullName}          — ПІБ студента
     *   {gradeBookId}       — номер залікової книжки / ПНП
     *   {nationalGrade}     — оцінка за національною шкалою
     *   {points}            — кількість балів (empty string if absent)
     *   {ects}              — оцінка за шкалою ECTS (empty string if absent)
     *
     * ECTS distribution counts (empty string when zero):
     *   {countA} {countB} {countC} {countD} {countE} {countFX} {countF} {countAbsent}
     */
    async generateDocument(
        session: SessionReport,
        group: Group | null,
        formData: PrintFormData,
    ): Promise<{ blob: Blob, filename: string }> {
        const iepMap = await studentsRepository.getIepMap({ includeHidden: true })
        const t = i18n.global.t.bind(i18n.global)

        const sortedEntries = [...session.entries].sort((a, b) =>
            a.studentSnapshot.fullName.localeCompare(b.studentSnapshot.fullName, 'uk'),
        )

        const entries = sortedEntries.map((entry, idx) => ({
            index: idx + 1,
            fullName: entry.studentSnapshot.fullName,
            gradeBookId: iepMap[entry.studentSnapshot.id] || '—',
            nationalGrade: toNationalGrade(entry.grade, formData.formOfControl, t),
            points: entry.grade !== null ? String(entry.grade) : '',
            ects: entry.grade !== null ? toECTS(entry.grade) : '',
        }))

        const stats = computeECTSStats(session.entries.map(e => e.grade))

        const data = {
            // Document header
            recordNumber: formData.recordNumber,
            date: formData.date,
            course: String(group?.course ?? ''),
            groupName: group?.name ?? '',
            // Subject block
            subject: formData.subject,
            semester: formData.semester,
            academicYear: formData.academicYear,
            formOfControl: formData.formOfControl,
            totalHours: String(formData.totalHours),
            examiner: formData.examiners.filter(Boolean).join(', '),
            practicalTeacher: formData.practicalTeacher,
            // Rows
            entries,
            totalStudents: session.entries.length,
            // ECTS distribution — empty string instead of 0 for cleaner template output
            countA: stats.A || '',
            countB: stats.B || '',
            countC: stats.C || '',
            countD: stats.D || '',
            countE: stats.E || '',
            countFX: stats.FX || '',
            countF: stats.F || '',
            countAbsent: stats.absent || '',
        }

        const blob = await documentGenerator.generateFromTemplate({
            templateDir: TEMPLATE_DIR,
            templateName: TEMPLATE_NAME,
            data,
        })

        return {
            blob,
            filename: buildFilename(group?.name ?? 'session', formData.recordNumber),
        }
    },
}
