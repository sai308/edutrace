import type { Mark } from '@Marks/types/marks'
import { to5Scale, toECTS } from '@/shared/utils/grades'

export type MarkFormat = 'raw' | '100-scale' | '5-scale' | 'ects'

export function useMarkFormat() {
    function percentToFiveScale(percent: number): string | number {
        return to5Scale(percent)
    }

    function percentToECTS(percent: number): string {
        return toECTS(percent)
    }

    function formatMarkToFiveScale(mark: Partial<Mark>): string | number {
        const max = Number(mark.maxPoints) || 100
        const percent = (Number(mark.score) / max) * 100
        return percentToFiveScale(percent)
    }

    function formatMarkToECTS(mark: Partial<Mark>): string {
        const max = Number(mark.maxPoints) || 100
        const percent = (Number(mark.score) / max) * 100
        return percentToECTS(percent)
    }

    function getFormattedMark(
        mark: Partial<Mark>,
        format: MarkFormat = 'raw',
    ): string | number | undefined {
        if (format === 'raw') return mark.score

        const max = Number(mark.maxPoints) || 100
        const percent = (Number(mark.score) / max) * 100

        if (format === '100-scale') {
            return Math.round(percent)
        }

        if (format === '5-scale') {
            return percentToFiveScale(percent)
        }

        if (format === 'ects') {
            return percentToECTS(percent)
        }

        return mark.score
    }

    function getMarkTooltip(score: string | number, maxPoints: string | number): string[] {
        const max = Number(maxPoints) || 100
        const percent = (Number(score) / max) * 100

        const scale100 = Math.round(percent)
        const scale5 = percentToFiveScale(percent)
        const ects = percentToECTS(percent)

        return [`5-scale: ${scale5}`, `100-scale: ${scale100}`, `ECTS: ${ects}`]
    }

    return {
        formatMarkToFiveScale,
        formatMarkToECTS,
        getFormattedMark,
        getMarkTooltip,
        percentToFiveScale,
        percentToECTS,
    }
}
