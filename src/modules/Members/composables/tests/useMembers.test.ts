import type { Member } from '@Students/types/students'
import { membersService } from '@Members/services/members.service'
import { studentsRepository } from '@Students/services/students.repository'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMembers } from '../useMembers'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@Students/services/students.repository')
vi.mock('@Members/services/members.service')
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('@/shared/services/toast', () => ({
    useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

const mockGetAllMembers = vi.mocked(studentsRepository.getAllMembers)
const mockHideMember = vi.mocked(studentsRepository.hideMember)
const mockRestoreMember = vi.mocked(studentsRepository.restoreMember)
const mockDeleteMembers = vi.mocked(studentsRepository.deleteMembers)
const mockSaveMember = vi.mocked(membersService.saveMember)

function makeMembers(): Member[] {
    return [
        { id: '1', name: 'Alice', groupName: 'Math', role: 'student' },
        { id: '2', name: 'Bob', groupName: 'Science', role: 'student' },
        { id: '3', name: 'Carol', groupName: 'Math', role: 'teacher' },
    ]
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useMembers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetAllMembers.mockResolvedValue(makeMembers())
        mockHideMember.mockResolvedValue('1')
        mockRestoreMember.mockResolvedValue('1')
        mockDeleteMembers.mockResolvedValue()
        mockSaveMember.mockResolvedValue()
    })

    describe('loadMembers', () => {
        it('should populate members and toggle isLoading', async () => {
            const { members, isLoading, loadMembers } = useMembers()

            expect(isLoading.value).toBe(true) // initial state before onMounted resolves

            await loadMembers()

            expect(isLoading.value).toBe(false)
            expect(members.value).toHaveLength(3)
            expect(mockGetAllMembers).toHaveBeenCalledWith({ includeHidden: true })
        })

        it('should set isLoading to false even if the repository throws', async () => {
            mockGetAllMembers.mockRejectedValue(new Error('DB error'))
            const { isLoading, loadMembers } = useMembers()

            await loadMembers()

            expect(isLoading.value).toBe(false)
        })
    })

    describe('allGroups (computed)', () => {
        it('should return unique sorted group names from active members', async () => {
            const { allGroups, loadMembers } = useMembers()
            await loadMembers()
            // Members have groupNames: 'Math', 'Science', 'Math' (teacher Carol has groupName too)
            // and Carol (teacher) has groupName 'Math' as well
            expect(allGroups.value).toEqual(['Math', 'Science'])
        })

        it('should exclude members with no groupName', async () => {
            mockGetAllMembers.mockResolvedValue([
                { id: '1', name: 'Alice', groupName: '', role: 'teacher' as const },
                { id: '2', name: 'Bob', groupName: 'Math', role: 'student' as const },
            ])
            const { allGroups, loadMembers } = useMembers()
            await loadMembers()
            expect(allGroups.value).toEqual(['Math'])
        })
    })

    describe('openAddDialog / handleEdit', () => {
        it('openAddDialog should clear selectedMember and open the dialog', () => {
            const { isDialogOpen, selectedMember, openAddDialog } = useMembers()
            selectedMember.value = makeMembers()[0]!
            openAddDialog()
            expect(isDialogOpen.value).toBe(true)
            expect(selectedMember.value).toBeNull()
        })

        it('handleEdit should set selectedMember and open the dialog', () => {
            const { isDialogOpen, selectedMember, handleEdit } = useMembers()
            const member = makeMembers()[0]!
            handleEdit(member)
            expect(isDialogOpen.value).toBe(true)
            expect(selectedMember.value).toStrictEqual(member)
        })
    })

    describe('handleSave', () => {
        const formData = {
            name: 'Alice',
            email: 'alice@example.com',
            groupName: 'Math',
            role: 'student' as const,
            iep: '',
        }

        it('should call membersService.saveMember and reload on success (edit)', async () => {
            const { handleSave, selectedMember, isDialogOpen } = useMembers()
            selectedMember.value = makeMembers()[0]!
            isDialogOpen.value = true

            await handleSave(formData)

            expect(mockSaveMember).toHaveBeenCalledWith(formData, makeMembers()[0]!)
            expect(isDialogOpen.value).toBe(false)
            expect(mockGetAllMembers).toHaveBeenCalled()
        })

        it('should call membersService.saveMember with null selectedMember (add)', async () => {
            const { handleSave, selectedMember } = useMembers()
            selectedMember.value = null

            await handleSave(formData)

            expect(mockSaveMember).toHaveBeenCalledWith(formData, null)
        })
    })

    describe('confirmDelete / executeSoftDelete', () => {
        it('confirmDelete should set memberToDelete and open delete dialog', () => {
            const { confirmDelete, memberToDelete, isDeleteDialogOpen } = useMembers()
            const member = makeMembers()[0]!
            confirmDelete(member)
            expect(memberToDelete.value).toStrictEqual(member)
            expect(isDeleteDialogOpen.value).toBe(true)
        })

        it('executeSoftDelete should call hideMember and reload', async () => {
            const { executeSoftDelete, memberToDelete, isDeleteDialogOpen, loadMembers } =
                useMembers()
            await loadMembers()
            memberToDelete.value = makeMembers()[0]!
            isDeleteDialogOpen.value = true

            await executeSoftDelete()

            expect(mockHideMember).toHaveBeenCalledWith('1')
            expect(isDeleteDialogOpen.value).toBe(false)
        })

        it('executeSoftDelete should do nothing if memberToDelete is null', async () => {
            const { executeSoftDelete, memberToDelete } = useMembers()
            memberToDelete.value = null

            await executeSoftDelete()

            expect(mockHideMember).not.toHaveBeenCalled()
        })
    })

    describe('handleRestore', () => {
        it('should call restoreMember and reload', async () => {
            const { handleRestore, loadMembers } = useMembers()
            await loadMembers()
            const member = makeMembers()[0]!

            await handleRestore(member)

            expect(mockRestoreMember).toHaveBeenCalledWith('1')
            expect(mockGetAllMembers).toHaveBeenCalledTimes(2)
        })
    })

    describe('confirmHardDelete / executeHardDelete', () => {
        it('confirmHardDelete should set memberToDelete and open hard delete dialog', () => {
            const { confirmHardDelete, memberToDelete, isHardDeleteDialogOpen } = useMembers()
            const member = makeMembers()[0]!
            confirmHardDelete(member)
            expect(memberToDelete.value).toStrictEqual(member)
            expect(isHardDeleteDialogOpen.value).toBe(true)
        })

        it('executeHardDelete should call deleteMembers and reload', async () => {
            const { executeHardDelete, memberToDelete, isHardDeleteDialogOpen, loadMembers } =
                useMembers()
            await loadMembers()
            memberToDelete.value = makeMembers()[0]!
            isHardDeleteDialogOpen.value = true

            await executeHardDelete()

            expect(mockDeleteMembers).toHaveBeenCalledWith(['1'])
            expect(isHardDeleteDialogOpen.value).toBe(false)
        })

        it('executeHardDelete should do nothing if memberToDelete is null', async () => {
            const { executeHardDelete, memberToDelete } = useMembers()
            memberToDelete.value = null

            await executeHardDelete()

            expect(mockDeleteMembers).not.toHaveBeenCalled()
        })
    })
})
