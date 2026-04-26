import type { Meet } from '@/modules/Analytics/types/analytics'
import { describe, expect, it } from 'vitest'
import { calculateMeetDuration } from './duration'

describe('calculateMeetDuration', () => {
    it('calculates total duration from start and end time when available', () => {
        const meet = {
            id: 'test-id',
            meetId: 'test-meet-id',
            date: '2023-01-01',
            startTime: '2023-01-01T10:00:00Z',
            endTime: '2023-01-01T11:00:00Z', // 1 hour = 3600 seconds
            participants: [
                { name: 'Alice', duration: 1800 }, // 30 mins
                { name: 'Bob', duration: 1800 }, // 30 mins
            ],
        } as Meet

        const duration = calculateMeetDuration(meet)
        expect(duration).toBe(3600)
    })

    it('falls back to participant duration sum if start/end times are missing', () => {
        const meet = {
            id: 'test-id-2',
            meetId: 'test-meet-id-2',
            date: '2023-01-02',
            // startTime/endTime missing
            participants: [
                { name: 'Alice', duration: 3665 }, // 1h 1m 5s
                { name: 'Bob', duration: 0 },
            ],
        } as Meet

        const duration = calculateMeetDuration(meet)
        expect(duration).toBe(3665)
    })

    it('falls back to participant duration sum if start/end times are invalid', () => {
        const meet = {
            id: 'test-id-3',
            meetId: 'test-meet-id-3',
            date: '2023-01-03',
            startTime: 'invalid-date',
            endTime: 'another-invalid-date',
            participants: [
                { name: 'Alice', duration: 120 }, // 2m 0s
            ],
        } as Meet

        const duration = calculateMeetDuration(meet)
        expect(duration).toBe(120)
    })

    it('returns 0 if meet is undefined', () => {
        const duration = calculateMeetDuration(undefined)
        expect(duration).toBe(0)
    })

    it('returns 0 if no participants and no start/end time', () => {
        const meet = {
            id: 'test-id-4',
            meetId: 'test-meet-id-4',
            date: '2023-01-04',
            // no startTime/endTime
            // no participants or empty
            participants: [] as any[],
        } as Meet

        const duration = calculateMeetDuration(meet)
        expect(duration).toBe(0)
    })
})
