/**
 * Formats a percentage mark to a 5-scale system.
 */
export function to5Scale(percent: number): number {
    if (percent >= 90) return 5
    if (percent >= 75) return 4
    if (percent >= 60) return 3
    if (percent >= 35) return 2
    return 1
}

/**
 * Formats a percentage mark to ECTS (A-F).
 * Boundaries follow the Ukrainian ECTS standard:
 * A≥90, B≥82, C≥74, D≥64, E≥60, FX≥35, F<35
 */
export function toECTS(percent: number): string {
    if (percent >= 90) return 'A'
    if (percent >= 82) return 'B'
    if (percent >= 74) return 'C'
    if (percent >= 64) return 'D'
    if (percent >= 60) return 'E'
    if (percent >= 35) return 'FX'
    return 'F'
}

/**
 * Converts a 100-point grade to the Ukrainian national scale label.
 * Pass the already-translated `formOfControl` value to distinguish exam vs credit.
 * `t` is the active i18n translation function.
 */
export function toNationalGrade(
    grade: number | null,
    formOfControl: string,
    t: (key: string) => string,
): string {
    if (grade === null) return t('sessions.grades.absentTooltip')
    const isExam = formOfControl === t('sessions.printDialog.forms.exam')
    if (grade >= 90) return isExam ? t('sessions.grades.excellent') : t('sessions.grades.passed')
    if (grade >= 75) return isExam ? t('sessions.grades.good') : t('sessions.grades.passed')
    if (grade >= 60) return isExam ? t('sessions.grades.satisfactory') : t('sessions.grades.passed')
    return isExam ? t('sessions.grades.unsatisfactory') : t('sessions.grades.notPassed')
}

/**
 * Formats a percentage mark to 100-scale (rounded).
 */
export function to100Scale(percent: number): number {
    return Math.round(percent)
}

export type MarkFormat = '5-scale' | 'ects' | '100-scale'

/**
 * Creates a formatter function based on the format name.
 */
export function createMarkFormatter(
    format: MarkFormat | string,
): (percent: number) => string | number {
    return (percent: number) => {
        if (!format || format === '5-scale') return to5Scale(percent)
        if (format === 'ects') return toECTS(percent)
        if (format === '100-scale') return to100Scale(percent)
        return Math.round(percent)
    }
}

/**
 * Helper to convert a raw score with max points to 5-scale.
 */
export function formatMarkToFiveScale(score: number | string, maxPoints: number | string): number {
    const max = Number(maxPoints) || 100
    const percent = (Number(score) / max) * 100
    return to5Scale(percent)
}

/**
 * Reverse: 5-scale grade → 100-point midpoint of the corresponding band.
 */
export function from5ScaleTo100(grade: number): number {
    if (grade >= 5) return 95 // 90-100 band
    if (grade >= 4) return 82 // 75-89 band
    if (grade >= 3) return 67 // 60-74 band
    if (grade >= 2) return 47 // 35-59 band
    return 17 // 0-34 band
}

/**
 * Reverse: ECTS letter → 100-point midpoint of the corresponding band.
 */
export function fromECTSTo100(grade: string): number {
    const g = grade.toUpperCase().trim()
    if (g === 'A') return 95
    if (g === 'B') return 86
    if (g === 'C') return 78
    if (g === 'D') return 71
    if (g === 'E') return 63
    if (g === 'FX') return 47
    return 17 // F
}

export interface EctsStats {
    A: number
    B: number
    C: number
    D: number
    E: number
    FX: number
    F: number
    absent: number
}

/**
 * Computes ECTS grade distribution counts over an array of raw 100-point grades.
 * Null values are counted as absent.
 */
export function computeECTSStats(grades: (number | null)[]): EctsStats {
    const stats: EctsStats = { A: 0, B: 0, C: 0, D: 0, E: 0, FX: 0, F: 0, absent: 0 }
    for (const grade of grades) {
        if (grade === null) {
            stats.absent++
            continue
        }
        const ects = toECTS(grade)
        if (ects === 'A') stats.A++
        else if (ects === 'B') stats.B++
        else if (ects === 'C') stats.C++
        else if (ects === 'D') stats.D++
        else if (ects === 'E') stats.E++
        else if (ects === 'FX') stats.FX++
        else if (ects === 'F') stats.F++
    }
    return stats
}

/**
 * Returns the Tailwind CSS color classes for a given ECTS grade letter.
 */
export function getECTSColorClass(ectsGrade: string): string {
    switch (ectsGrade) {
        case 'A':
            return 'text-green-600 dark:text-green-400 font-bold'
        case 'B':
            return 'text-emerald-500 dark:text-emerald-400 font-semibold'
        case 'C':
            return 'text-yellow-600 dark:text-yellow-500 font-semibold'
        case 'D':
            return 'text-orange-500 dark:text-orange-400 font-medium'
        case 'E':
            return 'text-orange-600 dark:text-orange-500 font-medium'
        case 'FX':
            return 'text-red-500 dark:text-red-400 font-bold'
        case 'F':
            return 'text-red-600 dark:text-red-500 font-bold'
        default:
            return ''
    }
}

/**
 * Converts a displayed grade (in any format) back to 100-point scale.
 * If the value is already on 100-point (or unrecognized), it passes through as a number.
 */
export function convertGradeTo100(value: string | number, format: MarkFormat | string): number {
    const strVal = String(value).trim()
    const num = Number(strVal)

    if (format === '5-scale') {
        if (!isNaN(num) && num >= 1 && num <= 5) return from5ScaleTo100(num)
        // If it's already a 100-scale number typed by user, pass through
        if (!isNaN(num)) return Math.min(100, Math.max(0, num))
        return 0
    }

    if (format === 'ects') {
        // Try letter grade first
        if (isNaN(num) || /^[A-F]X?$/i.test(strVal)) return fromECTSTo100(strVal)
        // Numeric input — assume already 100-point
        return Math.min(100, Math.max(0, num))
    }

    // 100-scale or fallback
    if (!isNaN(num)) return Math.min(100, Math.max(0, num))
    return 0
}
