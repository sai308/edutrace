import { describe, expect, it } from 'vitest'
import { getStatusColor } from '../analytics.service'

// STATUS_COLOR_THRESHOLDS: VERY_LOW = 15, LOW = 30, MEDIUM = 50, HIGH = 75

describe('getStatusColor', () => {
    it('returns red-500 for percentage at the very-low boundary (≤15)', () => {
        expect(getStatusColor(0)).toBe('bg-red-500 text-white')
        expect(getStatusColor(15)).toBe('bg-red-500 text-white')
    })

    it('returns red-400 for percentage in the low band (16–30)', () => {
        expect(getStatusColor(16)).toBe('bg-red-400 text-white')
        expect(getStatusColor(30)).toBe('bg-red-400 text-white')
    })

    it('returns yellow-200 for percentage in the medium band (31–50)', () => {
        expect(getStatusColor(31)).toBe('bg-yellow-200 text-black')
        expect(getStatusColor(50)).toBe('bg-yellow-200 text-black')
    })

    it('returns yellow-400 for percentage in the high band (51–75)', () => {
        expect(getStatusColor(51)).toBe('bg-yellow-400 text-black')
        expect(getStatusColor(75)).toBe('bg-yellow-400 text-black')
    })

    it('returns green-500 for percentage above the high threshold (>75)', () => {
        expect(getStatusColor(76)).toBe('bg-green-500 text-white')
        expect(getStatusColor(100)).toBe('bg-green-500 text-white')
    })
})
