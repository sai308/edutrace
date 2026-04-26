import type { SessionReport } from '@Sessions/models/session.model'
import type { Group } from '@/modules/Groups/types/groups'
import { GradeTypeEnum, SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { studentsRepository } from '@Students/services/students.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { opfs } from '@/shared/services/opfs'
import { documentGenerator } from '../documentGenerator'
import { sessionDocumentService } from '../sessionDocument.service'
// PrintFormData mirrors the interface in SessionPrintDialog.vue
interface PrintFormData {
    recordNumber: string
    date: string
    subject: string
    semester: string
    academicYear: string
    formOfControl: string
    totalHours: string
    examiners: string[]
    practicalTeacher: string
}

vi.mock('@/shared/services/opfs', () => ({
    opfs: {
        fileExists: vi.fn(),
        getFile: vi.fn(),
        saveFile: vi.fn(),
    },
}))

vi.mock('../documentGenerator', () => ({
    documentGenerator: {
        generateFromTemplate: vi.fn(),
    },
}))

vi.mock('@Students/services/students.repository', () => ({
    studentsRepository: {
        getIepMap: vi.fn(),
    },
}))

vi.mock('@/i18n', () => ({
    default: {
        global: {
            t: (key: string) => key,
        },
    },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockGroup: Group = { id: 'g1', name: 'CS-2024', meetId: 'meet-001' }

function makeSession(overrides: Partial<SessionReport> = {}): SessionReport {
    return {
        id: 'session-1',
        sessionType: SessionTypeEnum.MAIN,
        status: SessionStatusEnum.CLOSED,
        groupId: 'g1',
        openedAt: '2024-06-01T00:00:00.000Z',
        closedAt: '2024-06-10T12:00:00.000Z',
        entries: [
            {
                studentId: 's1',
                studentSnapshot: { id: 's1', fullName: 'Alice Smith', groupName: 'CS-2024' },
                grade: 88,
                gradeType: GradeTypeEnum.MANUAL,
                updatedAt: '2024-06-10T12:00:00.000Z',
            },
            {
                studentId: 's2',
                studentSnapshot: { id: 's2', fullName: 'Bob Jones', groupName: 'CS-2024' },
                grade: 45,
                gradeType: GradeTypeEnum.AUTO,
                updatedAt: '2024-06-10T12:00:00.000Z',
            },
        ],
        ...overrides,
    }
}

function makeFormData(overrides: Partial<PrintFormData> = {}): PrintFormData {
    return {
        recordNumber: '42',
        date: '10 червня 2024',
        subject: 'Mathematics',
        semester: '2',
        academicYear: '2023/2024',
        formOfControl: 'exam',
        totalHours: '120',
        examiners: ['Prof. Taylor'],
        practicalTeacher: 'Dr. Lee',
        ...overrides,
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('sessionDocumentService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(studentsRepository.getIepMap as any).mockResolvedValue({})
        ;(documentGenerator.generateFromTemplate as any).mockResolvedValue(
            new Blob(['fake-docx'], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }),
        )
    })

    // ─── hasTemplate ──────────────────────────────────────────────────────────

    describe('hasTemplate', () => {
        it('delegates to opfs.fileExists with correct path', async () => {
            ;(opfs.fileExists as any).mockResolvedValue(true)

            const result = await sessionDocumentService.hasTemplate()

            expect(opfs.fileExists).toHaveBeenCalledWith('templates', 'print_template.docx')
            expect(result).toBe(true)
        })

        it('returns false when file does not exist', async () => {
            ;(opfs.fileExists as any).mockResolvedValue(false)

            const result = await sessionDocumentService.hasTemplate()

            expect(result).toBe(false)
        })
    })

    // ─── generateDocument ─────────────────────────────────────────────────────

    describe('generateDocument', () => {
        it('calls documentGenerator.generateFromTemplate', async () => {
            await sessionDocumentService.generateDocument(makeSession(), mockGroup, makeFormData())

            expect(documentGenerator.generateFromTemplate).toHaveBeenCalledOnce()
        })

        it('passes the correct template path', async () => {
            await sessionDocumentService.generateDocument(makeSession(), mockGroup, makeFormData())

            expect(documentGenerator.generateFromTemplate).toHaveBeenCalledWith(
                expect.objectContaining({
                    templateDir: 'templates',
                    templateName: 'print_template.docx',
                }),
            )
        })

        it('returns a blob and a filename', async () => {
            const result = await sessionDocumentService.generateDocument(
                makeSession(),
                mockGroup,
                makeFormData(),
            )

            expect(result.blob).toBeInstanceOf(Blob)
            expect(result.filename).toBeTruthy()
            expect(result.filename).toMatch(/\.docx$/)
        })

        it('filename includes the group name', async () => {
            const result = await sessionDocumentService.generateDocument(
                makeSession(),
                mockGroup,
                makeFormData({ recordNumber: '99' }),
            )

            expect(result.filename).toContain('CS-2024')
        })

        it("filename includes today's date", async () => {
            const today = new Date().toISOString().split('T')[0]!
            const result = await sessionDocumentService.generateDocument(
                makeSession(),
                mockGroup,
                makeFormData(),
            )

            expect(result.filename).toContain(today)
        })

        it('passes record number to template data', async () => {
            await sessionDocumentService.generateDocument(
                makeSession(),
                mockGroup,
                makeFormData({ recordNumber: '77' }),
            )

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.recordNumber).toBe('77')
        })

        it('passes groupName from the group argument', async () => {
            await sessionDocumentService.generateDocument(makeSession(), mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.groupName).toBe('CS-2024')
        })

        it('joins multiple examiners with a comma', async () => {
            await sessionDocumentService.generateDocument(
                makeSession(),
                mockGroup,
                makeFormData({ examiners: ['Prof. A', 'Dr. B'] }),
            )

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.examiner).toBe('Prof. A, Dr. B')
        })

        it('filters out falsy examiner values', async () => {
            await sessionDocumentService.generateDocument(
                makeSession(),
                mockGroup,
                makeFormData({ examiners: ['Prof. A', '', 'Dr. B'] }),
            )

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.examiner).toBe('Prof. A, Dr. B')
        })

        it('sets totalStudents to the number of entries', async () => {
            const session = makeSession()
            await sessionDocumentService.generateDocument(session, mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.totalStudents).toBe(session.entries.length)
        })

        it('sorts entries alphabetically by full name', async () => {
            const session = makeSession({
                entries: [
                    {
                        studentId: 'sz',
                        studentSnapshot: { id: 'sz', fullName: 'Zelda Wu' },
                        grade: 70,
                        gradeType: GradeTypeEnum.MANUAL,
                        updatedAt: '',
                    },
                    {
                        studentId: 'sa',
                        studentSnapshot: { id: 'sa', fullName: 'Alice Smith' },
                        grade: 88,
                        gradeType: GradeTypeEnum.MANUAL,
                        updatedAt: '',
                    },
                ],
            })
            await sessionDocumentService.generateDocument(session, mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.entries[0].fullName).toBe('Alice Smith')
            expect(call.data.entries[1].fullName).toBe('Zelda Wu')
        })

        it('assigns sequential 1-based index to sorted entries', async () => {
            await sessionDocumentService.generateDocument(makeSession(), mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            const indices = call.data.entries.map((e: any) => e.index)
            expect(indices).toEqual([1, 2])
        })

        it('uses IEP from iepMap for gradeBookId', async () => {
            ;(studentsRepository.getIepMap as any).mockResolvedValue({
                s1: 'IEP-001',
                s2: 'IEP-002',
            })

            await sessionDocumentService.generateDocument(makeSession(), mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            const alice = call.data.entries.find((e: any) => e.fullName === 'Alice Smith')
            expect(alice.gradeBookId).toBe('IEP-001')
        })

        it('falls back to dash when iepMap has no entry for student', async () => {
            ;(studentsRepository.getIepMap as any).mockResolvedValue({})

            await sessionDocumentService.generateDocument(makeSession(), mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.entries[0].gradeBookId).toBe('—')
        })

        it('sets points to empty string for null grade', async () => {
            const session = makeSession({
                entries: [
                    {
                        studentId: 's3',
                        studentSnapshot: { id: 's3', fullName: 'Carol' },
                        grade: null,
                        gradeType: GradeTypeEnum.MANUAL,
                        updatedAt: '',
                    },
                ],
            })
            await sessionDocumentService.generateDocument(session, mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.entries[0].points).toBe('')
            expect(call.data.entries[0].ects).toBe('')
        })

        it('sets points to the grade string when grade is present', async () => {
            const session = makeSession({
                entries: [
                    {
                        studentId: 's4',
                        studentSnapshot: { id: 's4', fullName: 'Dan' },
                        grade: 75,
                        gradeType: GradeTypeEnum.MANUAL,
                        updatedAt: '',
                    },
                ],
            })
            await sessionDocumentService.generateDocument(session, mockGroup, makeFormData())

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.entries[0].points).toBe('75')
        })

        it('handles null group gracefully (uses empty strings)', async () => {
            await expect(
                sessionDocumentService.generateDocument(makeSession(), null, makeFormData()),
            ).resolves.not.toThrow()

            const call = (documentGenerator.generateFromTemplate as any).mock.calls[0][0]
            expect(call.data.groupName).toBe('')
        })
    })
})
