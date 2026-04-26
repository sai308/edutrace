import { beforeEach, describe, expect, it } from 'vitest'
import { meetsRepository } from '../meets.repository'

// Uses the fake-indexeddb setup from tests/setup.ts — no mocking needed.

describe('meetsRepository', () => {
    beforeEach(async () => {
        // Clear all stored meets between tests
        const all = await meetsRepository.getAllMeets()
        if (all.length > 0) {
            await meetsRepository.deleteMeets(all.map(m => m.id))
        }
    })

    // ─── saveMeet ─────────────────────────────────────────────────────────

    describe('saveMeet', () => {
        it('throws if meetData has no meetId', async () => {
            await expect(meetsRepository.saveMeet({ id: '1' } as any)).rejects.toThrow(
                'saveMeet: meetData must have a meetId',
            )
        })

        it('persists a valid meet and returns its id', async () => {
            const id = await meetsRepository.saveMeet({
                id: 'abc',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            } as any)
            expect(id).toBe('abc')
            const all = await meetsRepository.getAllMeets()
            expect(all).toHaveLength(1)
        })
    })

    // ─── getMeetsByMeetId ─────────────────────────────────────────────────

    describe('getMeetsByMeetId', () => {
        it('returns empty array for empty string input', async () => {
            const result = await meetsRepository.getMeetsByMeetId('')
            expect(result).toEqual([])
        })

        it('returns empty array for null/undefined input', async () => {
            expect(await meetsRepository.getMeetsByMeetId(null as any)).toEqual([])
            expect(await meetsRepository.getMeetsByMeetId(undefined as any)).toEqual([])
        })

        it('returns matching meets', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            } as any)
            await meetsRepository.saveMeet({
                id: '2',
                meetId: 'm1',
                date: '2024-01-08',
                participants: [],
            } as any)
            await meetsRepository.saveMeet({
                id: '3',
                meetId: 'm2',
                date: '2024-01-01',
                participants: [],
            } as any)

            const result = await meetsRepository.getMeetsByMeetId('m1')
            expect(result).toHaveLength(2)
        })
    })

    // ─── getMeetById ──────────────────────────────────────────────────────

    describe('getMeetById', () => {
        it('returns undefined for empty string', async () => {
            expect(await meetsRepository.getMeetById('')).toBeUndefined()
        })

        it('returns undefined for null/undefined', async () => {
            expect(await meetsRepository.getMeetById(null as any)).toBeUndefined()
        })

        it('returns the correct meet', async () => {
            await meetsRepository.saveMeet({
                id: 'x1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            } as any)
            const meet = await meetsRepository.getMeetById('x1')
            expect(meet?.id).toBe('x1')
        })
    })

    // ─── checkMeetExists ──────────────────────────────────────────────────

    describe('checkMeetExists', () => {
        it('returns false when meetId or date is empty', async () => {
            expect(await meetsRepository.checkMeetExists('', '2024-01-01')).toBe(false)
            expect(await meetsRepository.checkMeetExists('m1', '')).toBe(false)
        })

        it('returns true when meet exists', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            } as any)
            expect(await meetsRepository.checkMeetExists('m1', '2024-01-01')).toBe(true)
        })

        it('returns false when meet does not exist', async () => {
            expect(await meetsRepository.checkMeetExists('m1', '2024-01-01')).toBe(false)
        })
    })

    // ─── isDuplicateFile ──────────────────────────────────────────────────

    describe('isDuplicateFile', () => {
        it('returns false when any argument is empty', async () => {
            expect(await meetsRepository.isDuplicateFile('', 'm1', '2024-01-01')).toBe(false)
            expect(await meetsRepository.isDuplicateFile('file.csv', '', '2024-01-01')).toBe(false)
            expect(await meetsRepository.isDuplicateFile('file.csv', 'm1', '')).toBe(false)
        })

        it('returns true for matching filename + meetId + date', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                filename: 'file.csv',
                participants: [],
            } as any)
            expect(await meetsRepository.isDuplicateFile('file.csv', 'm1', '2024-01-01')).toBe(true)
        })

        it('returns false when filename differs', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                filename: 'other.csv',
                participants: [],
            } as any)
            expect(await meetsRepository.isDuplicateFile('file.csv', 'm1', '2024-01-01')).toBe(false)
        })
    })

    // ─── deleteMeets ─────────────────────────────────────────────────────

    describe('deleteMeets', () => {
        it('does nothing for an empty array', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            } as any)
            await meetsRepository.deleteMeets([])
            expect(await meetsRepository.getAllMeets()).toHaveLength(1)
        })

        it('removes the specified meets', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            } as any)
            await meetsRepository.saveMeet({
                id: '2',
                meetId: 'm2',
                date: '2024-01-01',
                participants: [],
            } as any)
            await meetsRepository.deleteMeets(['1'])
            const all = await meetsRepository.getAllMeets()
            expect(all).toHaveLength(1)
            expect(all[0]!.id).toBe('2')
        })
    })

    // ─── applyDurationLimitToAll ──────────────────────────────────────────

    describe('applyDurationLimitToAll', () => {
        it('returns 0 and makes no changes for invalid inputs', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [{ name: 'S1', duration: 9999 }],
            } as any)

            expect(await meetsRepository.applyDurationLimitToAll(0)).toBe(0)
            expect(await meetsRepository.applyDurationLimitToAll(-1)).toBe(0)
            expect(await meetsRepository.applyDurationLimitToAll(Number.NaN)).toBe(0)
            expect(await meetsRepository.applyDurationLimitToAll(Infinity)).toBe(0)

            const all = await meetsRepository.getAllMeets()
            expect(all[0]!.participants[0]!.duration).toBe(9999) // unchanged
        })

        it('caps participant durations exceeding the limit', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [
                    { name: 'S1', duration: 9000 }, // exceeds 60 min limit
                    { name: 'S2', duration: 1800 }, // under limit, unchanged
                ],
            } as any)

            const fixedCount = await meetsRepository.applyDurationLimitToAll(60)

            expect(fixedCount).toBe(1)
            const all = await meetsRepository.getAllMeets()
            expect(all[0]!.participants[0]!.duration).toBe(3600) // 60 * 60
            expect(all[0]!.participants[1]!.duration).toBe(1800) // unchanged
        })

        it('returns 0 when no meets need fixing', async () => {
            await meetsRepository.saveMeet({
                id: '1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [{ name: 'S1', duration: 600 }],
            } as any)

            const fixedCount = await meetsRepository.applyDurationLimitToAll(60)
            expect(fixedCount).toBe(0)
        })
    })
})
