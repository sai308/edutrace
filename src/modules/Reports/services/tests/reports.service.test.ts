import type { Group } from '@Groups/types/groups'
import { meetsRepository } from '@Analytics/services/meets.repository'
import { groupsRepository } from '@Groups/services/groups.repository'
import { studentsRepository } from '@Students/services/students.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsRepository } from '@/shared/services/settings.repository'
import { reportsService } from '../reports.service'

// Mock Worker import
vi.mock('@/workers/parser.worker?worker', () => ({
    default: class {
        constructor() {}
        postMessage = vi.fn()
        terminate = vi.fn()
    },
}))

const { mockParseMeetReport } = vi.hoisted(() => ({
    mockParseMeetReport: vi.fn(),
}))

vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        parseMeetReport: mockParseMeetReport,
    }),
    expose: vi.fn(),
}))

vi.mock('@Analytics/services/meets.repository')
vi.mock('@Groups/services/groups.repository')
vi.mock('@Students/services/students.repository')
vi.mock('@/shared/services/settings.repository')

function makeFile(name: string, content = ''): File {
    return { name, text: vi.fn().mockResolvedValue(content) } as unknown as File
}

describe('reportsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── processFiles ──────────────────────────────────────────────────────

    describe('processFiles', () => {
        it('returns empty stats immediately for an empty file list', async () => {
            const result = await reportsService.processFiles([])
            expect(result).toEqual({ saved: 0, skipped: 0, unrecognized: 0 })
            expect(mockParseMeetReport).not.toHaveBeenCalled()
        })

        it('parses, reconciles, and saves a valid file', async () => {
            const parsedData = {
                meetId: 'm1',
                filename: 'test.csv',
                date: '2023-01-01',
                participants: [{ name: 'S1', duration: 100 }],
            }
            ;(groupsRepository.getGroupMap as any).mockResolvedValue({
                m1: { name: 'G1' } as Group,
            })
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(0)
            mockParseMeetReport.mockResolvedValue(parsedData)
            ;(meetsRepository.isDuplicateFile as any).mockResolvedValue(false)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
            ;(studentsRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(meetsRepository.saveMeet as any).mockResolvedValue(undefined)

            const result = await reportsService.processFiles([makeFile('test.csv')])

            expect(result.saved).toBe(1)
            expect(result.skipped).toBe(0)
            expect(result.unrecognized).toBe(0)
            expect(meetsRepository.saveMeet).toHaveBeenCalledWith(parsedData)
        })

        it('skips duplicate files and increments skipped count', async () => {
            const parsedData = {
                meetId: 'm1',
                filename: 'dup.csv',
                date: '2023-01-01',
                participants: [],
            }
            ;(groupsRepository.getGroupMap as any).mockResolvedValue({})
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(0)
            mockParseMeetReport.mockResolvedValue(parsedData)
            ;(meetsRepository.isDuplicateFile as any).mockResolvedValue(true)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])

            const result = await reportsService.processFiles([makeFile('dup.csv')])

            expect(result.skipped).toBe(1)
            expect(result.saved).toBe(0)
            expect(meetsRepository.saveMeet).not.toHaveBeenCalled()
        })

        it('counts unrecognized files when filterMode is "related"', async () => {
            const parsedData = {
                meetId: 'unknown-id',
                filename: 'x.csv',
                date: '2023-06-01',
                participants: [],
            }
            ;(groupsRepository.getGroupMap as any).mockResolvedValue({})
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(0)
            mockParseMeetReport.mockResolvedValue(parsedData)

            const result = await reportsService.processFiles([makeFile('x.csv')], 'related')

            expect(result.unrecognized).toBe(1)
            expect(result.saved).toBe(0)
            expect(meetsRepository.isDuplicateFile).not.toHaveBeenCalled()
            expect(meetsRepository.saveMeet).not.toHaveBeenCalled()
        })

        it('does not count unrecognized files when filterMode is "all"', async () => {
            const parsedData = {
                meetId: 'unknown-id',
                filename: 'x.csv',
                date: '2023-06-01',
                participants: [{ name: 'Alice', duration: 60 }],
            }
            ;(groupsRepository.getGroupMap as any).mockResolvedValue({})
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(0)
            mockParseMeetReport.mockResolvedValue(parsedData)
            ;(meetsRepository.isDuplicateFile as any).mockResolvedValue(false)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
            ;(studentsRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(meetsRepository.saveMeet as any).mockResolvedValue(undefined)

            const result = await reportsService.processFiles([makeFile('x.csv')], 'all')

            expect(result.unrecognized).toBe(0)
            expect(result.saved).toBe(1)
        })

        it('applies duration limit and caps participant durations', async () => {
            const parsedData = {
                meetId: 'm1',
                filename: 'long.csv',
                date: '2023-01-01',
                participants: [
                    { name: 'Alice', duration: 7200 }, // 2 hours — should be capped
                    { name: 'Bob', duration: 1800 }, // 30 min — under limit, unchanged
                ],
            }
            ;(groupsRepository.getGroupMap as any).mockResolvedValue({
                m1: { name: 'G1' } as Group,
            })
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(60) // 60 min limit
            mockParseMeetReport.mockResolvedValue(parsedData)
            ;(meetsRepository.isDuplicateFile as any).mockResolvedValue(false)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
            ;(studentsRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(meetsRepository.saveMeet as any).mockResolvedValue(undefined)

            await reportsService.processFiles([makeFile('long.csv')])

            const savedMeet = (meetsRepository.saveMeet as any).mock.calls[0][0]
            expect(savedMeet.participants[0].duration).toBe(60 * 60) // 3600s
            expect(savedMeet.participants[1].duration).toBe(1800) // unchanged
        })

        it('writes studentId onto participants after reconciliation', async () => {
            const parsedData = {
                meetId: 'm1',
                filename: 'test.csv',
                date: '2023-01-01',
                participants: [{ name: 'Alice', duration: 300 }],
            }
            const existingMember = {
                id: 'member-uuid',
                name: 'Alice',
                role: 'student' as const,
                groupName: 'G1',
            }

            ;(groupsRepository.getGroupMap as any).mockResolvedValue({
                m1: { name: 'G1' } as Group,
            })
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(0)
            mockParseMeetReport.mockResolvedValue(parsedData)
            ;(meetsRepository.isDuplicateFile as any).mockResolvedValue(false)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([existingMember])
            ;(studentsRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(meetsRepository.saveMeet as any).mockResolvedValue(undefined)

            await reportsService.processFiles([makeFile('test.csv')])

            const savedMeet = (meetsRepository.saveMeet as any).mock.calls[0][0]
            expect(savedMeet.participants[0].studentId).toBe('member-uuid')
        })

        it('accumulates stats across multiple files', async () => {
            // a.csv: known group, not duplicate → saved
            // b.csv: known group, duplicate → skipped
            // c.csv: unknown group in 'related' mode → unrecognized
            const parsed1 = {
                meetId: 'm1',
                filename: 'a.csv',
                date: '2023-01-01',
                participants: [],
            }
            const parsed2 = {
                meetId: 'm1',
                filename: 'b.csv',
                date: '2023-01-01',
                participants: [],
            }
            const parsed3 = {
                meetId: 'unk',
                filename: 'c.csv',
                date: '2023-01-03',
                participants: [],
            }

            ;(groupsRepository.getGroupMap as any).mockResolvedValue({
                m1: { name: 'G1' } as Group,
            })
            ;(settingsRepository.getDurationLimit as any).mockResolvedValue(0)
            mockParseMeetReport
                .mockResolvedValueOnce(parsed1)
                .mockResolvedValueOnce(parsed2)
                .mockResolvedValueOnce(parsed3)
            ;(meetsRepository.isDuplicateFile as any)
                .mockResolvedValueOnce(false) // a.csv → saved
                .mockResolvedValueOnce(true) // b.csv → skipped (duplicate)
            ;(studentsRepository.getAllMembers as any).mockResolvedValue([])
            ;(studentsRepository.bulkPut as any).mockResolvedValue(undefined)
            ;(meetsRepository.saveMeet as any).mockResolvedValue(undefined)

            const result = await reportsService.processFiles(
                [makeFile('a.csv'), makeFile('b.csv'), makeFile('c.csv')],
                'related',
            )

            expect(result.saved).toBe(1)
            expect(result.skipped).toBe(1)
            expect(result.unrecognized).toBe(1)
        })
    })
})
