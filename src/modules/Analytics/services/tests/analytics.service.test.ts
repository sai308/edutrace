import { groupsRepository } from '@Groups/services/groups.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsRepository } from '@/shared/services/settings.repository'
import { analyticsService } from '../analytics.service'
import { meetsRepository } from '../meets.repository'

vi.mock('../meets.repository')
vi.mock('@Groups/services/groups.repository')
vi.mock('@Students/services/students.repository')
vi.mock('@/shared/services/settings.repository')

function defaultMocks() {
    vi.mocked(meetsRepository.getAllMeets).mockResolvedValue([])
    vi.mocked(meetsRepository.getMeetsByMeetId).mockResolvedValue([])
    vi.mocked(meetsRepository.getMeetById).mockResolvedValue(undefined)
    vi.mocked(groupsRepository.getGroupMap).mockResolvedValue({})
    vi.mocked(studentsRepository.getAllMembers).mockResolvedValue([])
    vi.mocked(settingsRepository.getIgnoredUsers).mockResolvedValue([])
}

describe('analyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        defaultMocks()
    })

    // ─── getGlobalStats ────────────────────────────────────────────────────

    describe('getGlobalStats', () => {
        it('returns an empty array when there are no meets', async () => {
            const result = await analyticsService.getGlobalStats([])
            expect(result).toEqual([])
        })

        it('aggregates a single meet with two participants', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [
                        { name: 'S1', duration: 10 },
                        { name: 'S2', duration: 20 },
                    ],
                },
            ]
            vi.mocked(meetsRepository.getAllMeets).mockResolvedValue(meets as any)

            const result = await analyticsService.getGlobalStats()

            expect(result).toHaveLength(1)
            expect(result[0]!.meetId).toBe('m1')
            expect(result[0]!.totalSessions).toBe(1)
            expect(result[0]!.uniqueParticipantsCount).toBe(2)
            expect(result[0]!.activeParticipantsCount).toBe(2)
            expect(result[0]!.avgDuration).toBeCloseTo(20 / 60, 2)
        })

        it('counts attendance correctly when group is known', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [{ name: 'S1', duration: 60 }],
                },
            ]
            vi.mocked(meetsRepository.getAllMeets).mockResolvedValue(meets as any)
            vi.mocked(groupsRepository.getGroupMap).mockResolvedValue({
                m1: { name: 'G1', teacher: null },
            } as any)
            vi.mocked(studentsRepository.getAllMembers).mockResolvedValue([
                { id: 'id1', name: 'S1', groupName: 'G1', aliases: [], role: 'student' },
                { id: 'id2', name: 'S2', groupName: 'G1', aliases: [], role: 'student' },
            ] as any)

            const result = await analyticsService.getGlobalStats(meets as any)

            expect(result[0]!.uniqueParticipantsCount).toBe(2)
            expect(result[0]!.activeParticipantsCount).toBe(1)
            expect(result[0]!.attendancePercentage).toBe(50)
        })

        it('excludes ignored users from all counts', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [
                        { name: 'S1', duration: 60 },
                        { name: 'IgnoredUser', duration: 90 },
                    ],
                },
            ]
            vi.mocked(meetsRepository.getAllMeets).mockResolvedValue(meets as any)
            vi.mocked(settingsRepository.getIgnoredUsers).mockResolvedValue(['IgnoredUser'])

            const result = await analyticsService.getGlobalStats(meets as any)

            expect(result[0]!.totalParticipantAppearances).toBe(1)
            expect(result[0]!.uniqueParticipantsCount).toBe(1)
        })

        it('excludes teacher-role members automatically', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [
                        { name: 'Teacher1', duration: 60 },
                        { name: 'S1', duration: 30 },
                    ],
                },
            ]
            vi.mocked(meetsRepository.getAllMeets).mockResolvedValue(meets as any)
            vi.mocked(studentsRepository.getAllMembers).mockResolvedValue([
                { id: 't1', name: 'Teacher1', groupName: null, aliases: [], role: 'teacher' },
            ] as any)

            const result = await analyticsService.getGlobalStats(meets as any)

            expect(result[0]!.totalParticipantAppearances).toBe(1)
        })

        it('skips meets with invalid or missing meetId', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: '',
                    date: '2024-01-01',
                    participants: [{ name: 'S1', duration: 10 }],
                },
            ]
            const result = await analyticsService.getGlobalStats(meets as any)
            expect(result).toHaveLength(0)
        })

        it('skips participants with negative or NaN duration', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [
                        { name: 'S1', duration: -100 },
                        { name: 'S2', duration: Number.NaN },
                        { name: 'S3', duration: 60 },
                    ],
                },
            ]
            const result = await analyticsService.getGlobalStats(meets as any)
            // Only S3 contributes to duration
            expect(result[0]!.totalParticipantAppearances).toBe(3) // all counted as participants
            expect(result[0]!.totalDuration).toBe(60) // only S3's valid duration
        })

        it('aggregates multiple sessions for the same meetId', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [{ name: 'S1', duration: 60 }],
                },
                {
                    id: '2',
                    meetId: 'm1',
                    date: '2024-01-08',
                    participants: [{ name: 'S1', duration: 50 }],
                },
            ]
            const result = await analyticsService.getGlobalStats(meets as any)
            expect(result).toHaveLength(1)
            expect(result[0]!.totalSessions).toBe(2)
            expect(result[0]!.lastActive).toBe('2024-01-08')
        })

        it('returns zero attendance when there are no possible appearances', async () => {
            const meets = [{ id: '1', meetId: 'm1', date: '2024-01-01', participants: [] }]
            const result = await analyticsService.getGlobalStats(meets as any)
            expect(result[0]!.attendancePercentage).toBe(0)
        })
    })

    // ─── enrichStats ──────────────────────────────────────────────────────

    describe('enrichStats', () => {
        it('attaches group metadata to stats', () => {
            const stats = [{ meetId: 'm1', totalSessions: 1 } as any]
            const groupsMap = { m1: { name: 'Group A', teacher: 'Mr. T', course: 2 } } as any

            const enriched = analyticsService.enrichStats(stats, groupsMap)

            expect(enriched[0]!.displayName).toBe('Group A')
            expect(enriched[0]!.teacherName).toBe('Mr. T')
            expect(enriched[0]!.course).toBe(2)
            expect(enriched[0]!.isGrouped).toBe(true)
        })

        it('falls back to meetId as displayName when no group exists', () => {
            const stats = [{ meetId: 'abc-xyz', totalSessions: 1 } as any]

            const enriched = analyticsService.enrichStats(stats, {})

            expect(enriched[0]!.displayName).toBe('abc-xyz')
            expect(enriched[0]!.isGrouped).toBe(false)
            expect(enriched[0]!.teacherName).toBeNull()
            expect(enriched[0]!.course).toBeNull()
        })

        it('returns empty array for empty input', () => {
            expect(analyticsService.enrichStats([], {})).toEqual([])
        })
    })

    // ─── getDetailedStats ─────────────────────────────────────────────────

    describe('getDetailedStats', () => {
        it('throws if meetId is empty', async () => {
            await expect(analyticsService.getDetailedStats('')).rejects.toThrow(
                'meetId must be a non-empty string',
            )
        })

        it('returns empty dates and matrix when no meets found', async () => {
            vi.mocked(meetsRepository.getMeetsByMeetId).mockResolvedValue([])

            const result = await analyticsService.getDetailedStats('m1')

            expect(result.dates).toEqual([])
            expect(result.matrix).toEqual([])
        })

        it('builds a matrix with one row per participant', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [
                        { name: 'S1', duration: 60 },
                        { name: 'S2', duration: 30 },
                    ],
                },
            ]
            vi.mocked(meetsRepository.getMeetsByMeetId).mockResolvedValue(meets as any)

            const result = await analyticsService.getDetailedStats('m1')

            expect(result.dates).toEqual(['2024-01-01'])
            expect(result.matrix).toHaveLength(2)
            const s1 = result.matrix.find((r) => r.name === 'S1')
            expect(s1!['2024-01-01'].percentage).toBe(100)
            const s2 = result.matrix.find((r) => r.name === 'S2')
            expect(s2!['2024-01-01'].percentage).toBe(50)
        })

        it('merges two uploads on the same date', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    startTime: '09:00',
                    participants: [{ name: 'S1', duration: 30 }],
                },
                {
                    id: '2',
                    meetId: 'm1',
                    date: '2024-01-01',
                    startTime: '08:00',
                    participants: [
                        { name: 'S1', duration: 20 },
                        { name: 'S2', duration: 40 },
                    ],
                },
            ]
            vi.mocked(meetsRepository.getMeetsByMeetId).mockResolvedValue(meets as any)

            const result = await analyticsService.getDetailedStats('m1')

            expect(result.dates).toEqual(['2024-01-01'])
            const s1 = result.matrix.find((r) => r.name === 'S1')
            // durations are summed: 30 + 20 = 50
            expect(s1!.totalDuration).toBe(50)
        })

        it('adds absent group members as zero-duration rows', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [{ name: 'S1', duration: 60 }],
                },
            ]
            vi.mocked(meetsRepository.getMeetsByMeetId).mockResolvedValue(meets as any)
            vi.mocked(groupsRepository.getGroupMap).mockResolvedValue({ m1: { name: 'G1' } } as any)
            vi.mocked(studentsRepository.getAllMembers).mockResolvedValue([
                { id: 'id1', name: 'S1', groupName: 'G1', aliases: [], role: 'student' },
                { id: 'id2', name: 'S2', groupName: 'G1', aliases: [], role: 'student' }, // absent
            ] as any)

            const result = await analyticsService.getDetailedStats('m1')

            expect(result.matrix).toHaveLength(2)
            const s2 = result.matrix.find((r) => r.name === 'S2')
            expect(s2!['2024-01-01'].duration).toBe(0)
            expect(s2!['2024-01-01'].percentage).toBe(0)
        })

        it('excludes teacherName from participants when provided', async () => {
            const meets = [
                {
                    id: '1',
                    meetId: 'm1',
                    date: '2024-01-01',
                    participants: [
                        { name: 'T1', duration: 70 },
                        { name: 'S1', duration: 60 },
                    ],
                },
            ]
            vi.mocked(meetsRepository.getMeetsByMeetId).mockResolvedValue(meets as any)

            const result = await analyticsService.getDetailedStats('m1', 'T1')

            expect(result.matrix.find((r) => r.name === 'T1')).toBeUndefined()
            expect(result.matrix.find((r) => r.name === 'S1')).toBeDefined()
        })
    })

    // ─── getSingleReportStats ─────────────────────────────────────────────

    describe('getSingleReportStats', () => {
        it('throws if id is empty', async () => {
            await expect(analyticsService.getSingleReportStats('')).rejects.toThrow(
                'id must be a non-empty string',
            )
        })

        it('throws if meet is not found', async () => {
            vi.mocked(meetsRepository.getMeetById).mockResolvedValue(undefined)
            await expect(analyticsService.getSingleReportStats('missing-id')).rejects.toThrow(
                'Meet not found',
            )
        })

        it('returns a single-date snapshot sorted by duration descending', async () => {
            const meet = {
                id: 'r1',
                meetId: 'm1',
                date: '2024-01-01',
                startTime: '09:00',
                endTime: '10:00',
                filename: 'file.csv',
                uploadedAt: '2024-01-01',
                participants: [
                    { name: 'S1', duration: 50 },
                    { name: 'S2', duration: 100 },
                ],
            }
            vi.mocked(meetsRepository.getMeetById).mockResolvedValue(meet as any)

            const result = await analyticsService.getSingleReportStats('r1')

            expect(result.dates).toEqual(['2024-01-01'])
            expect(result.matrix).toHaveLength(2)
            expect(result.matrix[0]!.name).toBe('S2') // highest duration first
            expect(result.matrix[1]!.name).toBe('S1')
            expect(result.metadata.filename).toBe('file.csv')
        })

        it('handles a meet with no participants gracefully', async () => {
            const meet = {
                id: 'r1',
                meetId: 'm1',
                date: '2024-01-01',
                participants: [],
            }
            vi.mocked(meetsRepository.getMeetById).mockResolvedValue(meet as any)

            const result = await analyticsService.getSingleReportStats('r1')

            expect(result.matrix).toHaveLength(0)
        })
    })
})
