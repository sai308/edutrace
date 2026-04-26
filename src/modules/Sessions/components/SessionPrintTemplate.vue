<script setup lang="ts">
import type { SessionReport } from '../models/session.model'
import type { PrintFormData } from './dialogs/SessionPrintDialog.vue'
import type { Group } from '@/modules/Groups/types/groups'
import { computed } from 'vue'
import i18n from '@/i18n'
import { toECTS, toNationalGrade } from '@/shared/utils/grades'

const props = defineProps<{
    session: SessionReport
    group: Group | null
    formData: PrintFormData
    /** studentId → IEP string, resolved live from Member records */
    iepMap?: Record<string, string | undefined>
}>()

const sortedEntries = computed(() =>
    [...props.session.entries].sort((a, b) => a.studentSnapshot.fullName.localeCompare(b.studentSnapshot.fullName)),
)

const t = i18n.global.t.bind(i18n.global)
function toNationalScaleFull(grade: number | null, formOfControl: string): string {
    return toNationalGrade(grade, formOfControl, t)
}

const examinersDisplay = computed(() => props.formData.examiners.filter(Boolean).join(', '))

// Stats for summary table
const stats = computed(() => {
    const buckets: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, FX: 0, F: 0, absent: 0 }
    for (const entry of props.session.entries) {
        if (entry.grade === null) {
            buckets.absent = (buckets.absent ?? 0) + 1
            continue
        }
        const grade = entry.grade as number
        const ects = toECTS(grade)
        if (ects in buckets)
            buckets[ects] = (buckets[ects] ?? 0) + 1
    }
    return buckets
})

const gradeRows = [
    {
        range: '90-100',
        ects: 'A',
        exam: i18n.global.t('sessions.grades.excellent'),
        credit: i18n.global.t('sessions.grades.passed'),
    },
    {
        range: '82-89',
        ects: 'B',
        exam: i18n.global.t('sessions.grades.good'),
        credit: i18n.global.t('sessions.grades.passed'),
    },
    {
        range: '74-81',
        ects: 'C',
        exam: i18n.global.t('sessions.grades.good'),
        credit: i18n.global.t('sessions.grades.passed'),
    },
    {
        range: '64-73',
        ects: 'D',
        exam: i18n.global.t('sessions.grades.satisfactory'),
        credit: i18n.global.t('sessions.grades.passed'),
    },
    {
        range: '60-63',
        ects: 'E',
        exam: i18n.global.t('sessions.grades.satisfactory'),
        credit: i18n.global.t('sessions.grades.passed'),
    },
    {
        range: '35-59',
        ects: 'FX',
        exam: i18n.global.t('sessions.grades.unsatisfactory'),
        credit: i18n.global.t('sessions.grades.notPassed'),
    },
    {
        range: '1-34',
        ects: 'F',
        exam: i18n.global.t('sessions.grades.unsatisfactory'),
        credit: i18n.global.t('sessions.grades.notPassed'),
    },
]
</script>

<template>
    <!--
        This component is ONLY supposed to be rendered inside a Teleport
        and shown exclusively during @media print.
        It represents the official form "Відомість обліку успішності".
    -->
    <div id="session-print-root" class="session-print-root">
        <!-- Page wrapper -->
        <div class="session-page">
            <!-- College Header -->
            <div class="print-header">
                <p>{{ $t('sessions.printTemplate.college') }}</p>
                <p class="print-header-bold">
                    {{ $t('sessions.printTemplate.university') }}
                </p>
            </div>

            <!-- Top metadata table -->
            <table class="print-meta-table">
                <tbody>
                    <tr>
                        <td class="print-label-cell">
                            {{ $t('sessions.printTemplate.studyForm') }}
                        </td>
                        <td class="print-value-cell print-underline">
                            {{ $t('sessions.printTemplate.studyFormValue') }}
                        </td>
                    </tr>
                    <tr>
                        <td class="print-label-cell">
                            {{ $t('sessions.printTemplate.specialty') }}
                        </td>
                        <td class="print-value-cell print-underline" colspan="4" />
                    </tr>
                    <tr>
                        <td class="print-label-cell" style="white-space: nowrap">
                            {{ $t('sessions.printTemplate.course') }}
                        </td>
                        <td class="print-value-cell print-underline" style="width: 48px">
                            {{ group?.course ?? '' }}
                        </td>
                        <td class="print-label-cell" style="padding-left: 12px">
                            {{ $t('sessions.printTemplate.group') }}
                        </td>
                        <td class="print-value-cell print-underline" style="width: 80px">
                            {{ group?.name ?? '' }}
                        </td>
                        <td style="text-align: center; padding: 2px 8px; font-weight: 600">
                            {{ $t('sessions.printTemplate.recordTitle') }}&nbsp;
                            <span class="print-underline" style="min-width: 50px; display: inline-block">{{
                                formData.recordNumber
                            }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 4px">
                            {{ formData.date }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Subject row -->
            <table class="print-info-table">
                <tbody>
                    <tr>
                        <td class="print-label-cell" style="white-space: nowrap">
                            {{ $t('sessions.printTemplate.subjectLabel') }}
                        </td>
                        <td class="print-value-cell print-underline print-bold">
                            {{ formData.subject }}
                        </td>
                    </tr>
                    <tr>
                        <td class="print-label-cell" style="white-space: nowrap">
                            {{ $t('sessions.printTemplate.groupLabel') }}
                        </td>
                        <td class="print-value-cell print-underline">
                            {{ formData.semester }} {{ $t('sessions.printTemplate.academicYear') }}
                        </td>
                        <td class="print-label-cell" style="white-space: nowrap; padding-left: 12px">
                            {{ $t('sessions.printTemplate.formOfControl') }}
                        </td>
                        <td class="print-value-cell print-underline print-bold">
                            {{ formData.formOfControl }}
                        </td>
                    </tr>
                    <tr>
                        <td class="print-label-cell" style="white-space: nowrap">
                            {{ $t('sessions.printTemplate.totalHours') }}
                        </td>
                        <td class="print-value-cell print-underline" style="width: 60px">
                            {{ formData.totalHours }}
                        </td>
                        <td colspan="2">
                            <span class="print-label-cell" style="padding-left: 12px">{{
                                $t('sessions.printTemplate.examinerPib')
                            }}</span>
                            <span class="print-value-cell print-underline print-bold">{{ examinersDisplay }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4">
                            <span class="print-label-cell" style="font-size: 9pt">{{
                                $t('sessions.printTemplate.practicalTeacherHint')
                            }}</span>
                            <span class="print-value-cell print-underline" style="padding-left: 8px">{{
                                formData.practicalTeacher
                            }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Grades Table -->
            <table class="print-grades-table">
                <thead>
                    <tr>
                        <th rowspan="3" class="print-th-narrow">
                            {{ $t('sessions.printTemplate.table.number') }}
                        </th>
                        <th rowspan="3" style="width: 240px">
                            {{ $t('sessions.printTemplate.table.fullName') }}
                        </th>
                        <th rowspan="3" style="width: 80px">
                            {{ $t('sessions.printTemplate.table.pnp') }}
                        </th>
                        <th colspan="3" style="text-align: center">
                            {{ $t('sessions.printTemplate.table.grade') }}
                        </th>
                        <th rowspan="3" style="width: 80px">
                            {{ $t('sessions.printTemplate.table.signature') }}
                        </th>
                    </tr>
                    <tr>
                        <th>{{ $t('sessions.printTemplate.table.national') }}</th>
                        <th>{{ $t('sessions.printTemplate.table.points') }}</th>
                        <th>{{ $t('sessions.printTemplate.table.ects') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(entry, index) in sortedEntries" :key="entry.studentId">
                        <td class="print-td-center">
                            {{ index + 1 }}
                        </td>
                        <td>{{ entry.studentSnapshot.fullName }}</td>
                        <td class="print-td-center">
                            {{ iepMap?.[entry.studentSnapshot.id] || '—' }}
                        </td>
                        <td
                            class="print-td-center"
                            :style="entry.grade !== null && entry.grade < 60 ? 'font-style: italic' : ''"
                        >
                            {{ toNationalScaleFull(entry.grade, formData.formOfControl) }}
                        </td>
                        <td class="print-td-center">
                            {{ entry.grade !== null ? entry.grade : '' }}
                        </td>
                        <td class="print-td-center print-bold">
                            {{ entry.grade !== null ? toECTS(entry.grade) : '' }}
                        </td>
                        <td />
                    </tr>
                </tbody>
            </table>

            <!-- Head of Department Signature -->
            <div class="print-signature-row">
                <span>{{ $t('sessions.printTemplate.headOfDepartment') }} _________________</span>
                <span style="margin-left: 16px; min-width: 200px">_______________________________________</span>
            </div>

            <!-- ECTS Legend Table (always starts on a new page) -->
            <table class="print-ects-table" style="page-break-before: always">
                <thead>
                    <tr>
                        <th rowspan="2">
                            {{ $t('sessions.printTemplate.ectsLegend.totalGrades') }}
                        </th>
                        <th rowspan="2">
                            {{ $t('sessions.printTemplate.ectsLegend.totalPoints') }}
                        </th>
                        <th rowspan="2">
                            {{ $t('sessions.printTemplate.ectsLegend.ectsGrade') }}
                        </th>
                        <th colspan="2" style="text-align: center">
                            {{ $t('sessions.printTemplate.ectsLegend.nationalScale') }}
                        </th>
                    </tr>
                    <tr>
                        <th>{{ $t('sessions.printTemplate.ectsLegend.exam') }}</th>
                        <th>{{ $t('sessions.printTemplate.ectsLegend.credit') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in gradeRows" :key="row.ects">
                        <td class="print-td-center">
                            {{ stats[row.ects] || '' }}
                        </td>
                        <td class="print-td-center">
                            {{ row.range }}
                        </td>
                        <td class="print-td-center">
                            {{ row.ects }}
                        </td>
                        <td class="print-td-center">
                            {{ row.exam }}
                        </td>
                        <td class="print-td-center">
                            {{ row.credit }}
                        </td>
                    </tr>
                    <tr>
                        <td class="print-td-center">
                            {{ stats.absent || '' }}
                        </td>
                        <td colspan="4" class="print-td-center">
                            {{ $t('sessions.grades.absentTooltip') }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Examiner Signature -->
            <div class="print-signature-row" style="margin-top: 16px">
                <span>{{ $t('sessions.printTemplate.examinerSignature') }} _________________</span>
            </div>
        </div>
    </div>
</template>

<style>
/* These styles live in the global scope intentionally because the print root
   is teleported outside of the scoped component tree. */

/* Screen: hidden */
#session-print-root {
    display: none;
}

/* Print: show only the print root, hide everything else */
@media print {
    body > *:not(#session-print-root-portal) {
        display: none !important;
    }

    #session-print-root-portal,
    #session-print-root-portal > * {
        display: block !important;
    }

    #session-print-root {
        display: block !important;
    }

    .session-page {
        width: 210mm;
        min-height: 297mm;
        padding: 14mm 14mm 10mm 20mm;
        box-sizing: border-box;
        font-family: 'Times New Roman', Times, serif;
        font-size: 10pt;
        color: #000;
        background: #fff;
        page-break-after: always;
    }

    .print-header {
        text-align: center;
        margin-bottom: 10pt;
        line-height: 1.5;
    }

    .print-header-bold {
        font-weight: 700;
    }

    .print-meta-table,
    .print-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4pt;
    }

    .print-label-cell {
        font-size: 9.5pt;
        padding: 2pt 4pt;
        white-space: nowrap;
    }

    .print-value-cell {
        font-size: 9.5pt;
        padding: 2pt 4pt;
        width: 100%;
    }

    .print-underline {
        border-bottom: 1px solid #000;
    }

    .print-bold {
        font-weight: 600;
    }

    .print-grades-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6pt;
        font-size: 8pt;
    }

    .print-grades-table th,
    .print-grades-table td {
        border: 1px solid #000;
        padding: 1.5pt 3pt;
        vertical-align: middle;
        line-height: 1.2;
    }

    .print-grades-table th {
        text-align: center;
        font-weight: 600;
        background: #fff;
    }

    .print-th-narrow {
        width: 28px;
        text-align: center;
    }

    .print-td-center {
        text-align: center;
    }

    .print-signature-row {
        margin-top: 10pt;
        font-size: 9.5pt;
        display: flex;
        align-items: flex-end;
        gap: 4pt;
    }

    .print-ects-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12pt;
        font-size: 9pt;
    }

    .print-ects-table th,
    .print-ects-table td {
        border: 1px solid #000;
        padding: 3pt 4pt;
        vertical-align: middle;
    }

    .print-ects-table th {
        text-align: center;
        font-weight: 600;
    }
}
</style>
