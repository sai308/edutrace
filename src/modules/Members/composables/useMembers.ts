import type { MemberFormData } from '@Members/services/members.service'
import type { Member } from '@Members/types/members'
import { membersService } from '@Members/services/members.service'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { logger } from '@/shared/lib/logger'
import { useToast } from '@/shared/services/toast'

export function useMembers() {
    const { t } = useI18n()
    const { toast } = useToast()

    const members = ref<Member[]>([])
    const isLoading = ref(true)
    const searchQuery = ref('')

    const isDialogOpen = ref(false)
    const selectedMember = ref<Member | null>(null)

    const isDeleteDialogOpen = ref(false)
    const isHardDeleteDialogOpen = ref(false)
    const isBulkDeleteDialogOpen = ref(false)
    const softDeleteTarget = ref<Member | null>(null)
    const hardDeleteTarget = ref<Member | null>(null)
    const bulkMemberIds = ref<string[]>([])

    const allGroups = computed<string[]>(() => {
        const groups = new Set<string>()
        members.value.forEach((m) => {
            if (m.groupName && !m.hidden)
                groups.add(m.groupName)
        })
        return Array.from(groups).sort()
    })

    async function loadMembers(): Promise<void> {
        isLoading.value = true
        try {
            members.value = await membersService.getAllMembers({ includeHidden: true })
        }
        catch (error) {
            logger.error('Failed to load members:', error)
            toast.error(t('members.toasts.loadError'))
        }
        finally {
            isLoading.value = false
        }
    }

    function openAddDialog(): void {
        selectedMember.value = null
        isDialogOpen.value = true
    }

    function handleEdit(member: Member): void {
        selectedMember.value = member
        isDialogOpen.value = true
    }

    async function handleSave(formData: MemberFormData): Promise<void> {
        const isEdit = !!selectedMember.value
        try {
            const saved = await membersService.saveMember(formData, selectedMember.value)
            if (isEdit) {
                const idx = members.value.findIndex(m => m.id === saved.id)
                if (idx !== -1)
                    members.value.splice(idx, 1, saved)
            }
            else {
                members.value.push(saved)
            }
            toast.success(isEdit ? t('members.toasts.saveSuccess') : t('members.toasts.addSuccess'))
            isDialogOpen.value = false
        }
        catch (error) {
            logger.error('Failed to save member:', error)
            toast.error(t('members.toasts.saveError'))
        }
    }

    function confirmDelete(member: Member): void {
        softDeleteTarget.value = member
        isDeleteDialogOpen.value = true
    }

    async function executeSoftDelete(): Promise<void> {
        if (!softDeleteTarget.value)
            return
        try {
            await membersService.hideMember(softDeleteTarget.value.id)
            const m = members.value.find(m => m.id === softDeleteTarget.value!.id)
            if (m)
                m.hidden = true
            toast.success(t('members.toasts.trashSuccess'))
            isDeleteDialogOpen.value = false
        }
        catch (error) {
            logger.error('Failed to delete member:', error)
            toast.error(t('members.toasts.deleteError'))
        }
        finally {
            softDeleteTarget.value = null
        }
    }

    async function handleRestore(member: Member): Promise<void> {
        try {
            await membersService.restoreMember(member.id)
            const m = members.value.find(m => m.id === member.id)
            if (m)
                m.hidden = false
            toast.success(t('members.toasts.restoreSuccess'))
        }
        catch (error) {
            logger.error('Failed to restore member:', error)
            toast.error(t('members.toasts.restoreError'))
        }
    }

    function confirmBulkDelete(ids: string[]): void {
        bulkMemberIds.value = ids
        isBulkDeleteDialogOpen.value = true
    }

    function cancelBulkDelete(): void {
        bulkMemberIds.value = []
        isBulkDeleteDialogOpen.value = false
    }

    async function executeBulkDelete(): Promise<void> {
        if (!bulkMemberIds.value.length)
            return
        try {
            await membersService.hideMembers(bulkMemberIds.value)
            const idSet = new Set(bulkMemberIds.value)
            members.value.forEach((m) => {
                if (idSet.has(m.id))
                    m.hidden = true
            })
            toast.success(t('members.toasts.trashSuccess'))
            isBulkDeleteDialogOpen.value = false
            bulkMemberIds.value = []
        }
        catch (error) {
            logger.error('Failed to bulk delete members:', error)
            toast.error(t('members.toasts.deleteError'))
        }
    }

    function confirmHardDelete(member: Member): void {
        hardDeleteTarget.value = member
        isHardDeleteDialogOpen.value = true
    }

    async function executeHardDelete(): Promise<void> {
        if (!hardDeleteTarget.value)
            return
        const id = hardDeleteTarget.value.id
        try {
            await membersService.deleteMembers([id])
            members.value = members.value.filter(m => m.id !== id)
            toast.success(t('members.toasts.hardDeleteSuccess'))
            isHardDeleteDialogOpen.value = false
        }
        catch (error) {
            logger.error('Failed to permanently delete member:', error)
            toast.error(t('members.toasts.deleteError'))
        }
        finally {
            hardDeleteTarget.value = null
        }
    }

    return {
        // State
        members,
        isLoading,
        searchQuery,
        isDialogOpen,
        selectedMember,
        isDeleteDialogOpen,
        isHardDeleteDialogOpen,
        isBulkDeleteDialogOpen,
        softDeleteTarget,
        hardDeleteTarget,
        bulkMemberIds,
        // Computed
        allGroups,
        // Actions
        loadMembers,
        openAddDialog,
        handleEdit,
        handleSave,
        confirmDelete,
        executeSoftDelete,
        handleRestore,
        confirmBulkDelete,
        cancelBulkDelete,
        executeBulkDelete,
        confirmHardDelete,
        executeHardDelete,
    }
}
