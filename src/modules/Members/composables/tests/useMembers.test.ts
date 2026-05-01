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
const mockHideMembers = vi.mocked(studentsRepository.hideMembers)
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
        mockHideMembers.mockResolvedValue()
        mockDeleteMembers.mockResolvedValue()
        mockSaveMember.mockResolvedValue(makeMembers()[0]!)
    })

    describe('loadMembers', () => {
        it('should populate members and toggle isLoading', async () => {
            const { members, isLoading, loadMembers } = useMembers()

            expect(isLoading.value).toBe(true)

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
        it('should return unique sorted group names from visible members only', async () => {
            const { allGroups, loadMembers } = useMembers()
            await loadMembers()
            expect(allGroups.value).toEqual(['Math', 'Science'])
        })

        it('should exclude hidden members from group list', async () => {
            mockGetAllMembers.mockResolvedValue([
                { id: '1', name: 'Alice', groupName: 'HiddenGroup', role: 'student' as const, hidden: true },
                { id: '2', name: 'Bob', groupName: 'Math', role: 'student' as const },
            ])
            const { allGroups, loadMembers } = useMembers()
            await loadMembers()
            expect(allGroups.value).toEqual(['Math'])
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

        it('should update member in place on success (edit)', async () => {
            const existing = makeMembers()[0]!
            const updated: Member = { ...existing, name: 'Alice Updated' }
            mockSaveMember.mockResolvedValue(updated)

            const { handleSave, selectedMember, isDialogOpen, members, loadMembers } = useMembers()
            await loadMembers()
            selectedMember.value = existing
            isDialogOpen.value = true

            await handleSave(formData)

            expect(mockSaveMember).toHaveBeenCalledWith(formData, existing)
            expect(isDialogOpen.value).toBe(false)
            expect(mockGetAllMembers).toHaveBeenCalledTimes(1)
            expect(members.value.find(m => m.id === existing.id)?.name).toBe('Alice Updated')
        })

        it('should push new member on success (add)', async () => {
            const newMember: Member = { id: 'new-id', name: 'Alice', groupName: 'Math', role: 'student' }
            mockSaveMember.mockResolvedValue(newMember)

            const { handleSave, selectedMember, members, loadMembers } = useMembers()
            await loadMembers()
            selectedMember.value = null
            const countBefore = members.value.length

            await handleSave(formData)

            expect(mockSaveMember).toHaveBeenCalledWith(formData, null)
            expect(mockGetAllMembers).toHaveBeenCalledTimes(1)
            expect(members.value).toHaveLength(countBefore + 1)
            expect(members.value.find(m => m.id === 'new-id')).toBeDefined()
        })
    })

    describe('confirmDelete / executeSoftDelete', () => {
        it('confirmDelete should set softDeleteTarget and open delete dialog', () => {
            const { confirmDelete, softDeleteTarget, isDeleteDialogOpen } = useMembers()
            const member = makeMembers()[0]!
            confirmDelete(member)
            expect(softDeleteTarget.value).toStrictEqual(member)
            expect(isDeleteDialogOpen.value).toBe(true)
        })

        it('executeSoftDelete should set hidden=true and clear softDeleteTarget', async () => {
            const { executeSoftDelete, softDeleteTarget, isDeleteDialogOpen, members, loadMembers } = useMembers()
            await loadMembers()
            softDeleteTarget.value = makeMembers()[0]!
            isDeleteDialogOpen.value = true

            await executeSoftDelete()

            expect(mockHideMember).toHaveBeenCalledWith('1')
            expect(isDeleteDialogOpen.value).toBe(false)
            expect(softDeleteTarget.value).toBeNull()
            expect(mockGetAllMembers).toHaveBeenCalledTimes(1)
            expect(members.value.find(m => m.id === '1')?.hidden).toBe(true)
        })

        it('executeSoftDelete should do nothing if softDeleteTarget is null', async () => {
            const { executeSoftDelete, softDeleteTarget } = useMembers()
            softDeleteTarget.value = null

            await executeSoftDelete()

            expect(mockHideMember).not.toHaveBeenCalled()
        })

        it('executeSoftDelete should clear softDeleteTarget even on error', async () => {
            mockHideMember.mockRejectedValue(new Error('DB error'))
            const { executeSoftDelete, softDeleteTarget } = useMembers()
            softDeleteTarget.value = makeMembers()[0]!

            await executeSoftDelete()

            expect(softDeleteTarget.value).toBeNull()
        })
    })

    describe('handleRestore', () => {
        it('should set hidden=false in place without reload', async () => {
            const hiddenMember: Member = { ...makeMembers()[0]!, hidden: true }
            mockGetAllMembers.mockResolvedValue([hiddenMember, ...makeMembers().slice(1)])

            const { handleRestore, members, loadMembers } = useMembers()
            await loadMembers()

            await handleRestore(hiddenMember)

            expect(mockRestoreMember).toHaveBeenCalledWith('1')
            expect(mockGetAllMembers).toHaveBeenCalledTimes(1)
            expect(members.value.find(m => m.id === '1')?.hidden).toBe(false)
        })
    })

    describe('confirmBulkDelete / executeBulkDelete / cancelBulkDelete', () => {
        it('confirmBulkDelete should set ids and open dialog', () => {
            const { confirmBulkDelete, bulkMemberIds, isBulkDeleteDialogOpen } = useMembers()
            confirmBulkDelete(['1', '2'])
            expect(bulkMemberIds.value).toEqual(['1', '2'])
            expect(isBulkDeleteDialogOpen.value).toBe(true)
        })

        it('cancelBulkDelete should clear ids and close dialog', () => {
            const { confirmBulkDelete, cancelBulkDelete, bulkMemberIds, isBulkDeleteDialogOpen } = useMembers()
            confirmBulkDelete(['1', '2'])
            cancelBulkDelete()
            expect(bulkMemberIds.value).toEqual([])
            expect(isBulkDeleteDialogOpen.value).toBe(false)
        })

        it('executeBulkDelete should mark members hidden and clear state', async () => {
            const { confirmBulkDelete, executeBulkDelete, isBulkDeleteDialogOpen, bulkMemberIds, members, loadMembers } = useMembers()
            await loadMembers()
            confirmBulkDelete(['1', '2'])

            await executeBulkDelete()

            expect(mockHideMembers).toHaveBeenCalledWith(['1', '2'])
            expect(isBulkDeleteDialogOpen.value).toBe(false)
            expect(bulkMemberIds.value).toEqual([])
            expect(mockGetAllMembers).toHaveBeenCalledTimes(1)
            expect(members.value.find(m => m.id === '1')?.hidden).toBe(true)
            expect(members.value.find(m => m.id === '2')?.hidden).toBe(true)
        })
    })

    describe('confirmHardDelete / executeHardDelete', () => {
        it('confirmHardDelete should set hardDeleteTarget and open hard delete dialog', () => {
            const { confirmHardDelete, hardDeleteTarget, isHardDeleteDialogOpen } = useMembers()
            const member = makeMembers()[0]!
            confirmHardDelete(member)
            expect(hardDeleteTarget.value).toStrictEqual(member)
            expect(isHardDeleteDialogOpen.value).toBe(true)
        })

        it('executeHardDelete should remove member and clear hardDeleteTarget', async () => {
            const { executeHardDelete, hardDeleteTarget, isHardDeleteDialogOpen, members, loadMembers } = useMembers()
            await loadMembers()
            hardDeleteTarget.value = makeMembers()[0]!
            isHardDeleteDialogOpen.value = true
            const countBefore = members.value.length

            await executeHardDelete()

            expect(mockDeleteMembers).toHaveBeenCalledWith(['1'])
            expect(isHardDeleteDialogOpen.value).toBe(false)
            expect(hardDeleteTarget.value).toBeNull()
            expect(mockGetAllMembers).toHaveBeenCalledTimes(1)
            expect(members.value).toHaveLength(countBefore - 1)
            expect(members.value.find(m => m.id === '1')).toBeUndefined()
        })

        it('executeHardDelete should do nothing if hardDeleteTarget is null', async () => {
            const { executeHardDelete, hardDeleteTarget } = useMembers()
            hardDeleteTarget.value = null

            await executeHardDelete()

            expect(mockDeleteMembers).not.toHaveBeenCalled()
        })

        it('executeHardDelete should clear hardDeleteTarget even on error', async () => {
            mockDeleteMembers.mockRejectedValue(new Error('DB error'))
            const { executeHardDelete, hardDeleteTarget } = useMembers()
            hardDeleteTarget.value = makeMembers()[0]!

            await executeHardDelete()

            expect(hardDeleteTarget.value).toBeNull()
        })
    })
})
