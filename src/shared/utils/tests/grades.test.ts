import { describe, expect, it } from 'vitest'
import { computeECTSStats, toECTS, toNationalGrade } from '../grades'

// Minimal t() stub — returns the last segment of the i18n key
const t = (key: string) => key.split('.').at(-1) ?? key
// Simulates the exam form-of-control translated value
const EXAM = 'exam'
const CREDIT = 'credit'

describe('toECTS', () => {
    it('maps grade bands to correct ECTS letters', () => {
        expect(toECTS(100)).toBe('A')
        expect(toECTS(90)).toBe('A')
        expect(toECTS(89)).toBe('B')
        expect(toECTS(82)).toBe('B')
        expect(toECTS(81)).toBe('C')
        expect(toECTS(74)).toBe('C') // boundary fix: was incorrectly D before
        expect(toECTS(73)).toBe('D')
        expect(toECTS(64)).toBe('D') // boundary fix: was incorrectly E before
        expect(toECTS(63)).toBe('E')
        expect(toECTS(60)).toBe('E')
        expect(toECTS(59)).toBe('FX')
        expect(toECTS(35)).toBe('FX')
        expect(toECTS(34)).toBe('F')
        expect(toECTS(0)).toBe('F')
    })

    it('matches the ranges shown in the printed ECTS legend table', () => {
        // A: 90-100
        for (const g of [90, 95, 100]) expect(toECTS(g)).toBe('A')
        // B: 82-89
        for (const g of [82, 85, 89]) expect(toECTS(g)).toBe('B')
        // C: 74-81
        for (const g of [74, 77, 81]) expect(toECTS(g)).toBe('C')
        // D: 64-73
        for (const g of [64, 68, 73]) expect(toECTS(g)).toBe('D')
        // E: 60-63
        for (const g of [60, 61, 63]) expect(toECTS(g)).toBe('E')
        // FX: 35-59
        for (const g of [35, 45, 59]) expect(toECTS(g)).toBe('FX')
        // F: 1-34
        for (const g of [1, 17, 34]) expect(toECTS(g)).toBe('F')
    })
})

describe('toNationalGrade', () => {
    describe('absent (null grade)', () => {
        it('returns absentTooltip key regardless of form-of-control', () => {
            expect(toNationalGrade(null, EXAM, t)).toBe('absentTooltip')
            expect(toNationalGrade(null, CREDIT, t)).toBe('absentTooltip')
        })
    })

    describe('exam mode', () => {
        it('returns excellent for ≥ 90', () => {
            expect(toNationalGrade(90, EXAM, t)).toBe('excellent')
            expect(toNationalGrade(100, EXAM, t)).toBe('excellent')
        })

        it('returns good for 75–89', () => {
            expect(toNationalGrade(89, EXAM, t)).toBe('good')
            expect(toNationalGrade(75, EXAM, t)).toBe('good')
        })

        it('returns satisfactory for 60–74', () => {
            expect(toNationalGrade(74, EXAM, t)).toBe('satisfactory')
            expect(toNationalGrade(60, EXAM, t)).toBe('satisfactory')
        })

        it('returns unsatisfactory for < 60', () => {
            expect(toNationalGrade(59, EXAM, t)).toBe('unsatisfactory')
            expect(toNationalGrade(0, EXAM, t)).toBe('unsatisfactory')
        })
    })

    describe('credit / diff-credit mode', () => {
        it('returns passed for grade ≥ 60', () => {
            expect(toNationalGrade(100, CREDIT, t)).toBe('passed')
            expect(toNationalGrade(60, CREDIT, t)).toBe('passed')
        })

        it('returns notPassed for grade < 60', () => {
            expect(toNationalGrade(59, CREDIT, t)).toBe('notPassed')
            expect(toNationalGrade(0, CREDIT, t)).toBe('notPassed')
        })
    })

    it('uses the t function to resolve label keys', () => {
        const calls: string[] = []
        const trackingT = (key: string) => {
            calls.push(key)
            return key.split('.').at(-1)!
        }
        toNationalGrade(95, EXAM, trackingT)
        expect(calls.some(k => k.includes('sessions.grades'))).toBe(true)
    })
})

describe('computeECTSStats', () => {
    it('counts each ECTS grade and absent entries', () => {
        const grades = [
            100,
            95,
            92, // A × 3
            88,
            83, // B × 2
            80,
            74, // C × 2
            72,
            64, // D × 2
            62,
            60, // E × 2
            50,
            35, // FX × 2
            30,
            10, // F × 2
            null,
            null,
            null, // absent × 3
        ]
        const stats = computeECTSStats(grades)
        expect(stats).toEqual({ A: 3, B: 2, C: 2, D: 2, E: 2, FX: 2, F: 2, absent: 3 })
    })

    it('returns all zeros for an empty array', () => {
        const stats = computeECTSStats([])
        expect(stats).toEqual({ A: 0, B: 0, C: 0, D: 0, E: 0, FX: 0, F: 0, absent: 0 })
    })

    it('counts all-absent array correctly', () => {
        const stats = computeECTSStats([null, null])
        expect(stats).toEqual({ A: 0, B: 0, C: 0, D: 0, E: 0, FX: 0, F: 0, absent: 2 })
    })
})
