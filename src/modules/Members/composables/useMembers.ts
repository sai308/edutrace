import type { MemberFormData } from '@Members/services/members.service'
import type { Member } from '@Students/types/students'
import { membersService } from '@Members/services/members.service'
import { studentsRepository } from '@Students/services/students.repository'
import { computed, onMounted, ref } from 'vue'
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
    const memberToDelete = ref<Member | null>(null)
    const bulkMemberIds = ref<string[]>([])

    const allGroups = computed<string[]>(() => {
        const groups = new Set<string>()
        members.value.forEach((m) => {
            if (m.groupName) groups.add(m.groupName)
        })
        return Array.from(groups).sort()
    })

    async function loadMembers(): Promise<void> {
        isLoading.value = true
        try {
            members.value = await studentsRepository.getAllMembers({ includeHidden: true })
        } catch (error) {
            logger.error('Failed to load members:', error)
            toast.error(t('members.toasts.loadError'))
        } finally {
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
        try {
            await membersService.saveMember(formData, selectedMember.value)
            toast.success(
                selectedMember.value
                    ? t('members.toasts.saveSuccess')
                    : t('members.toasts.addSuccess'),
            )
            isDialogOpen.value = false
            await loadMembers()
        } catch (error) {
            logger.error('Failed to save member:', error)
            toast.error(t('members.toasts.saveError'))
        }
    }

    function confirmDelete(member: Member): void {
        memberToDelete.value = member
        isDeleteDialogOpen.value = true
    }

    async function executeSoftDelete(): Promise<void> {
        if (!memberToDelete.value) return
        try {
            await studentsRepository.hideMember(memberToDelete.value.id)
            toast.success(t('members.toasts.trashSuccess'))
            isDeleteDialogOpen.value = false
            await loadMembers()
        } catch (error) {
            logger.error('Failed to delete member:', error)
            toast.error(t('members.toasts.deleteError'))
        }
    }

    async function handleRestore(member: Member): Promise<void> {
        try {
            await studentsRepository.restoreMember(member.id)
            toast.success(t('members.toasts.restoreSuccess'))
            await loadMembers()
        } catch (error) {
            logger.error('Failed to restore member:', error)
            toast.error(t('members.toasts.restoreError'))
        }
    }

    function confirmBulkDelete(ids: string[]): void {
        bulkMemberIds.value = ids
        isBulkDeleteDialogOpen.value = true
    }

    async function executeBulkDelete(): Promise<void> {
        if (!bulkMemberIds.value.length) return
        try {
            await studentsRepository.hideMembers(bulkMemberIds.value)
            toast.success(t('members.toasts.trashSuccess'))
            isBulkDeleteDialogOpen.value = false
            bulkMemberIds.value = []
            await loadMembers()
        } catch (error) {
            logger.error('Failed to bulk delete members:', error)
            toast.error(t('members.toasts.deleteError'))
        }
    }

    function confirmHardDelete(member: Member): void {
        memberToDelete.value = member
        isHardDeleteDialogOpen.value = true
    }

    async function executeHardDelete(): Promise<void> {
        if (!memberToDelete.value) return
        try {
            await studentsRepository.deleteMembers([memberToDelete.value.id])
            toast.success(t('members.toasts.hardDeleteSuccess'))
            isHardDeleteDialogOpen.value = false
            await loadMembers()
        } catch (error) {
            logger.error('Failed to permanently delete member:', error)
            toast.error(t('members.toasts.deleteError'))
        }
    }

    onMounted(() => {
        loadMembers()
    })

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
        memberToDelete,
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
        executeBulkDelete,
        confirmHardDelete,
        executeHardDelete,
    }
}
