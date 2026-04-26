import type { Group } from '@/modules/Groups/types/groups'
import { describe, expect, it } from 'vitest'
import { normalizeGroupName } from '../groupNormalization'

describe('normalizeGroupName', () => {
    const existingGroups: Group[] = [
        { id: '1', name: 'КН-41', course: 4, meetId: 'm1' },
        { id: '2', name: 'БІ-101', course: 1, meetId: 'm2' },
        { id: '3', name: 'CS-2024', course: 2, meetId: 'm3' },
    ]

    it('matches exact case and punctuation', () => {
        expect(normalizeGroupName('КН-41', existingGroups)).toBe('КН-41')
        expect(normalizeGroupName('БІ-101', existingGroups)).toBe('БІ-101')
    })

    it('matches despite missing hyphens', () => {
        expect(normalizeGroupName('КН41', existingGroups)).toBe('КН-41')
        expect(normalizeGroupName('БІ101', existingGroups)).toBe('БІ-101')
    })

    it('matches despite different case', () => {
        expect(normalizeGroupName('кн-41', existingGroups)).toBe('КН-41')
        expect(normalizeGroupName('бі-101', existingGroups)).toBe('БІ-101')
    })

    it('matches despite spaces and case and missing hyphens', () => {
        expect(normalizeGroupName(' кн 41 ', existingGroups)).toBe('КН-41')
        expect(normalizeGroupName('cs 2024', existingGroups)).toBe('CS-2024')
    })

    it('returns original trimmed input if no match found', () => {
        expect(normalizeGroupName('ПІ-41', existingGroups)).toBe('ПІ-41')
        expect(normalizeGroupName('  NEW-GROUP  ', existingGroups)).toBe('NEW-GROUP')
    })

    it('handles empty or malformed input gracefully', () => {
        expect(normalizeGroupName('', existingGroups)).toBe('')
        expect(normalizeGroupName('   ', existingGroups)).toBe('')
        expect(normalizeGroupName('--__--', existingGroups)).toBe('--__--')
    })
})
