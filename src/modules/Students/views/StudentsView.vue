<script setup lang="ts">
import type { ProfileMeet, ProfileTask } from '@Students/composables/useStudentProfile'
import type { StudentDashboardStats, StudentFormData } from '@Students/types/students'
import type { RowActionItem } from '@/shared/types/table'
import { useDebounceFn } from '@vueuse/core'
import { FileUp, GraduationCap, Loader2, Pencil, Search, Trash2, User, Users, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useQuerySync } from '@/shared/composables/useQuerySync'
import StudentProfileModal from '../components/StudentProfileModal.vue'
import StudentsDataTable from '../components/StudentsList/DataTable.vue'

type ProfileTab = 'attendance' | 'marks' | 'edit'

interface Props {
    students?: StudentDashboardStats[]
    groupsMap?: Record<string, { name: string }>
    teachers?: Set<string>
    meets?: ProfileMeet[]
    tasks?: ProfileTask[]
    isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    students: () => [],
    groupsMap: () => ({}),
    teachers: () => new Set(),
    meets: () => [],
    tasks: () => [],
    isLoading: false,
})

const emit = defineEmits<{
    'save-student': [payload: { formData: StudentFormData, originalStudent: StudentDashboardStats | null }]
    'delete-student': [id: string]
    'bulk-delete-students': [ids: string[]]
    'refresh': []
}>()

const { t } = useI18n()
const router = useRouter()

const tableRef = ref<InstanceType<typeof StudentsDataTable>>()
const searchInput = ref('')
const searchQuery = ref('')
const updateSearchQuery = useDebounceFn((v: string) => {
    searchQuery.value = v
}, 200)
const selectedGroup = ref<string | null>(null)
const bulkMode = ref(false)

useQuerySync({ search: searchQuery, group: selectedGroup })

// Modal state
const showDeleteModal = ref(false)
const showProfileModal = ref(false)
const studentToDelete = ref<StudentDashboardStats | null>(null)
const studentToView = ref<StudentDashboardStats | null>(null)
const profileInitialTab = ref<ProfileTab>('attendance')
const isBulkDelete = ref(false)

const allGroupsList = computed(() => {
    const set = new Set<string>()
    Object.values(props.groupsMap).forEach(g => set.add(g.name))
    return Array.from(set).sort()
})

const selectedCount = computed(() => tableRef.value?.table.getSelectedRowModel().rows.length ?? 0)
const filteredCount = computed(() => tableRef.value?.table.getFilteredRowModel().rows.length ?? 0)
const totalCount = computed(() => props.students.filter(s => !props.teachers.has(s.name)).length)

function handleSelectGroup(group: string) {
    selectedGroup.value = group
}

function handleOpenAnalytics(meetId: string) {
    router.push({ name: 'AnalyticsDetails', params: { id: meetId } })
}

function openProfileModal(student: StudentDashboardStats, tab?: ProfileTab) {
    studentToView.value = student
    profileInitialTab.value = tab ?? 'attendance'
    showProfileModal.value = true
}

function handleDeleteStudent(student: StudentDashboardStats) {
    studentToDelete.value = student
    isBulkDelete.value = false
    showDeleteModal.value = true
}

function openBulkDeleteModal() {
    isBulkDelete.value = true
    showDeleteModal.value = true
}

function handleDeleteConfirm() {
    if (isBulkDelete.value) {
        const ids = tableRef.value?.table
            .getSelectedRowModel()
            .rows
            .map(r => r.original.id)
            .filter(Boolean) as string[]
        emit('bulk-delete-students', ids)
        tableRef.value?.table.resetRowSelection()
    }
    else if (studentToDelete.value) {
        emit('delete-student', studentToDelete.value.id)
    }
    showDeleteModal.value = false
    studentToDelete.value = null
}

function onProfileSave(payload: { formData: unknown, originalStudent: unknown }) {
    handleSaveStudent({
        formData: payload.formData as StudentFormData,
        originalStudent: payload.originalStudent as StudentDashboardStats | null,
    })
}

async function handleSaveStudent({
    formData,
    originalStudent,
}: {
    formData: StudentFormData
    originalStudent: StudentDashboardStats | null
}) {
    if (formData.iep?.trim() && originalStudent) {
        const isDuplicate = props.students.some(s => s.iep === formData.iep.trim() && s.id !== originalStudent.id)
        if (isDuplicate)
            return
    }
    emit('save-student', { formData, originalStudent })
    showProfileModal.value = false
}

function getStudentActions(student: StudentDashboardStats): RowActionItem[] {
    return [
        {
            label: t('students.actions.profile'),
            icon: User,
            onSelect: () => openProfileModal(student),
        },
        {
            label: t('common.edit'),
            icon: Pencil,
            onSelect: () => openProfileModal(student, 'edit'),
        },
        { type: 'separator' },
        {
            label: t('common.delete'),
            icon: Trash2,
            destructive: true,
            onSelect: () => handleDeleteStudent(student),
        },
    ]
}

// Auto-switch group when selected group has no students but other groups do
watch(
    [() => props.students, selectedGroup],
    () => {
        if (!selectedGroup.value || totalCount.value === 0)
            return
        const nonTeachers = props.students.filter(s => !props.teachers.has(s.name))
        const studentsInGroup = nonTeachers.filter(s => s.groups.includes(selectedGroup.value!))
        if (studentsInGroup.length === 0) {
            // Find the first group that actually has students
            const allGroupNames = Array.from(new Set(nonTeachers.flatMap(s => s.groups)))
            selectedGroup.value = allGroupNames[0] ?? null
        }
    },
    { immediate: false },
)
</script>

<template>
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary" />
        <p>{{ $t('loader.loading') }}</p>
    </div>
    <div v-else class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Zone 1: Page header — always visible when not loading -->
        <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">
                    {{ $t('students.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5">
                    <template v-if="totalCount > 0">
                        {{ $t('students.subtitle', { count: filteredCount, total: totalCount }) }}
                    </template>
                    <template v-else>
                        {{ $t('students.description') }}
                    </template>
                </p>
            </div>
        </div>

        <template v-if="totalCount > 0">
            <!-- Group filter badge -->
            <div v-if="selectedGroup" class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground">{{ $t('students.groupFilter') }}</span>
                <Badge
                    variant="secondary"
                    class="gap-1 cursor-pointer hover:bg-secondary/80"
                    @click="selectedGroup = null"
                >
                    {{ selectedGroup }}
                    <X class="w-3 h-3" />
                </Badge>
            </div>

            <!-- Zone 2 + Table -->
            <StudentsDataTable
                ref="tableRef"
                :students="students"
                :teachers="teachers"
                :search-query="searchQuery"
                :group-filter="selectedGroup"
                :bulk-mode="bulkMode"
                :row-actions="getStudentActions"
                @select-group="handleSelectGroup"
                @open-analytics="handleOpenAnalytics"
            >
                <template #toolbar="{ table }">
                    <div class="flex items-center justify-between gap-3 flex-1">
                        <!-- Left: search → bulk switch → bulk delete -->
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    :model-value="searchInput"
                                    :placeholder="$t('students.searchPlaceholder')"
                                    class="pl-8 h-9"
                                    @update:model-value="
                                        (v) => {
                                            searchInput = String(v)
                                            updateSearchQuery(String(v))
                                        }
                                    "
                                />
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <Switch :model-value="bulkMode" @update:model-value="bulkMode = $event" />
                                <span class="text-sm text-muted-foreground hidden sm:inline select-none">
                                    {{ $t('common.bulk') }}
                                </span>
                            </div>
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive"
                                size="sm"
                                class="h-8 gap-2 shrink-0"
                                @click="openBulkDeleteModal"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span class="hidden sm:inline">{{ $t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                    </div>
                </template>
            </StudentsDataTable>
        </template>

        <EmptyState
            v-else
            :title="$t('students.emptyState.title')"
            :description="$t('students.emptyState.description')"
            :icon="Users"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" class="gap-2" @click="router.push({ name: 'reports' })">
                    <FileUp class="w-4 h-4" />
                    {{ $t('common.importReports') }}
                </Button>
                <Button variant="outline" class="gap-2" @click="router.push({ name: 'Marks' })">
                    <GraduationCap class="w-4 h-4" />
                    {{ $t('common.importMarks') }}
                </Button>
            </div>
        </EmptyState>

        <!-- Modals -->
        <StudentProfileModal
            :open="showProfileModal"
            :student="studentToView"
            :meets="meets"
            :groups-map="groupsMap"
            :tasks="tasks"
            :all-students="students"
            :all-groups="allGroupsList"
            :default-view="profileInitialTab"
            @update:open="
                (v) => {
                    showProfileModal = v
                    if (!v) studentToView = null
                }
            "
            @save="onProfileSave"
        />

        <AlertDialog :open="showDeleteModal" @update:open="showDeleteModal = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {{ isBulkDelete ? $t('students.deleteModal.bulkTitle') : $t('students.deleteModal.title') }}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {{
                            isBulkDelete
                                ? $t('students.deleteModal.bulkMessage', { count: selectedCount })
                                : $t('students.deleteModal.message')
                        }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="showDeleteModal = false">
                        {{ $t('common.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="handleDeleteConfirm"
                    >
                        {{ $t('students.deleteModal.confirm') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>
