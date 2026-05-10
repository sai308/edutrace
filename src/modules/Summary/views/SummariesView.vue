<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import type { StudentDashboardStats } from '@Students/types/students'
import type { Module, StudentSummaryData } from '@Summary/types/summary'
import type { SummaryThresholds } from '@/shared/types/Settings'
import type { RowActionItem } from '@/shared/types/table'
import StudentProfileModal from '@Students/components/StudentProfileModal.vue'
import GradeDeleteDialog from '@Summary/components/GradeDeleteDialog.vue'
import GradeManualInputDialog from '@Summary/components/GradeManualInputDialog.vue'
import DataTable from '@Summary/components/SummariesList/DataTable.vue'
import SummarySettingsSheet from '@Summary/components/SummarySettingsSheet.vue'
import { useGradeActions } from '@Summary/composables/useGradeActions'
import { useSummaryData } from '@Summary/composables/useSummaryData'
import { summaryService } from '@Summary/services/summary.service'

import {
    AlertTriangle,
    ChevronDown,
    Loader2,
    PenLine,
    Save,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
    Wand2,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
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
// Components
import { Button } from '@/components/ui/button'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useQuerySync } from '@/shared/composables/useQuerySync'
import { settingsRepository } from '@/shared/services/settings.repository'

const { t } = useI18n()
const router = useRouter()
const { students, isLoading, loadExamData, meets, tasks, groupsMap } = useSummaryData()
const isInitializing = ref(false)

const groups = ref<Group[]>([])
const selectedGroup = ref<Group | null>(null)
const currentModules = ref<Module[]>([])
const searchQuery = ref('')
const selectedFormat = ref('100-scale')

// Synced query params — group name and grade scale persist across navigation
const selectedGroupName = ref<string | null>(null)
useQuerySync({ group: selectedGroupName, format: selectedFormat })

const {
    isDeleteDialogOpen,
    isManualDialogOpen,
    actionTarget,
    handleGradeAction,
    handleSaveAll,
    handleDeleteConfirm,
    handleManualConfirm,
} = useGradeActions(students, selectedFormat)

const DEFAULT_SETTINGS = {
    completionThreshold: 70,
    attendanceThreshold: 60,
    attendanceEnabled: true,
    requiredTasks: 0,
} as const

const settingsForm = ref<SummaryThresholds>({ ...DEFAULT_SETTINGS })

const unsavedCount = computed(
    () =>
        students.value.filter(
            s => s.examGrade !== null && s.examGrade !== undefined && s.examGrade !== '' && !s.completedAt,
        ).length,
)

const isProfileOpen = ref(false)
const selectedStudent = ref<StudentSummaryData | null>(null)
const profileStudent = computed(() => selectedStudent.value as unknown as StudentDashboardStats | null)
const showSettingsSheet = ref(false)

// ── Leave guard ──────────────────────────────────────────────────────────────
// When the user tries to navigate away with unsaved grades, we pause navigation,
// show a confirmation dialog, and resolve the guard based on their choice.
const showLeaveDialog = ref(false)
let resolveLeaveGuard: ((confirmed: boolean) => void) | null = null

onBeforeRouteLeave(() => {
    if (unsavedCount.value === 0)
        return true

    showLeaveDialog.value = true
    return new Promise<boolean>((resolve) => {
        resolveLeaveGuard = resolve
    })
})

function confirmLeave() {
    showLeaveDialog.value = false
    resolveLeaveGuard?.(true)
    resolveLeaveGuard = null
}

function cancelLeave() {
    showLeaveDialog.value = false
    resolveLeaveGuard?.(false)
    resolveLeaveGuard = null
}

async function applySettings(settings: typeof settingsForm.value) {
    settingsForm.value = { ...settings }
    if (selectedGroup.value) {
        await settingsRepository.saveSummaryThresholds(String(selectedGroup.value.id!), settings)
    }
    handleReload()
}

function handleSettingsChange(settings: typeof settingsForm.value) {
    settingsForm.value = { ...settings }
    handleReload()
}

async function initialize() {
    isInitializing.value = true
    try {
        groups.value = await summaryService.getGroups()
        if (groups.value.length > 0) {
            // If a group name came from the URL query param, preselect it; otherwise default to first
            const fromQuery = selectedGroupName.value
                ? (groups.value.find(g => g.name === selectedGroupName.value) ?? null)
                : null
            selectedGroup.value = fromQuery ?? groups.value[0] ?? null
        }
    }
    finally {
        isInitializing.value = false
    }
}

// Keep the query param in sync when the user changes group via dropdown
watch(selectedGroup, (group) => {
    selectedGroupName.value = group?.name ?? null
})

// Reload when format changes (also fires on URL restoration via useQuerySync)
watch(selectedFormat, () => handleReload())

watch(
    selectedGroup,
    async (group) => {
        if (group) {
            // Restore persisted thresholds for this group, or fall back to defaults
            const saved = await settingsRepository.getSummaryThresholds(String(group.id!))
            settingsForm.value = saved ? { ...saved } : { ...DEFAULT_SETTINGS }

            currentModules.value = await summaryService.getModulesByGroup(group.name)
            await handleReload()
        }
    },
    { immediate: false },
)

onMounted(() => {
    initialize()
})

async function handleReload() {
    if (selectedGroup.value) {
        await loadExamData(
            selectedGroup.value,
            currentModules.value,
            settingsForm.value.completionThreshold,
            settingsForm.value.attendanceThreshold,
            settingsForm.value.attendanceEnabled,
            selectedFormat.value,
            settingsForm.value.requiredTasks,
        )
    }
}

function handleStudentClick(student: StudentSummaryData) {
    selectedStudent.value = student
    isProfileOpen.value = true
}

function getGradeActions(student: StudentSummaryData): RowActionItem[] {
    const grade = student.examGrade
    const hasGrade = grade !== null && grade !== undefined && grade !== ''
    const isUnsaved = hasGrade && !student.completedAt
    const items: RowActionItem[] = []

    if (isUnsaved) {
        items.push({
            label: t('summary.saveGrade'),
            icon: Save,
            onSelect: () => handleGradeAction({ action: 'save', student }),
        })
    }

    if (student.status === 'automatic' && (!hasGrade || isUnsaved)) {
        items.push({
            label: t('summary.applyAutoGrade'),
            icon: Wand2,
            onSelect: () => handleGradeAction({ action: 'auto', student }),
        })
    }

    items.push({
        label: t('summary.setManual'),
        icon: PenLine,
        onSelect: () => handleGradeAction({ action: 'manual', student }),
    })

    if (hasGrade) {
        items.push({ type: 'separator' })
        items.push({
            label: t('summary.removeGrade'),
            icon: Trash2,
            destructive: true,
            onSelect: () => handleGradeAction({ action: 'remove', student }),
        })
    }

    return items
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- ── Zone 1: Page header ── -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">
                    {{ $t('summary.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5">
                    {{ selectedGroup ? $t('summary.records', { count: students.length }) : $t('summary.description') }}
                </p>
            </div>

            <!-- Always-visible controls: Group + Scale (when group) + Settings (when group) -->
            <div class="flex flex-row items-center gap-2 w-full sm:w-auto sm:shrink-0">
                <!-- Group Selector -->
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-9 gap-1 flex-1 sm:flex-none"
                            :disabled="groups.length === 0"
                        >
                            <span class="hidden sm:inline text-xs text-muted-foreground mr-1">{{
                                $t('summary.groupLabel')
                            }}</span>
                            <span class="font-medium max-w-[100px] truncate" :title="selectedGroup?.name">{{
                                selectedGroup?.name || $t('summary.selectGroup')
                            }}</span>
                            <ChevronDown class="h-3 w-3 opacity-50 shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-[200px] max-h-[300px] overflow-y-auto">
                        <DropdownMenuItem
                            v-for="group in groups"
                            :key="group.id"
                            :class="selectedGroup?.id === group.id ? 'bg-primary/15 text-primary font-medium' : ''"
                            @click="selectedGroup = group"
                        >
                            {{ group.name }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <!-- Format Selector (only when group selected) -->
                <DropdownMenu v-if="selectedGroup">
                    <DropdownMenuTrigger as-child>
                        <Button variant="outline" size="sm" class="h-9 gap-1 flex-1 sm:flex-none">
                            <span class="hidden sm:inline text-xs text-muted-foreground mr-1">{{
                                $t('summary.scaleLabel')
                            }}</span>
                            <span class="font-medium truncate max-w-[100px]">
                                {{
                                    selectedFormat === '5-scale'
                                        ? $t('summary.scales.five')
                                        : selectedFormat === '100-scale'
                                            ? $t('summary.scales.hundred')
                                            : selectedFormat === 'ects'
                                                ? $t('summary.scales.ects')
                                                : 'Default'
                                }}
                            </span>
                            <ChevronDown class="h-3 w-3 opacity-50 shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-[180px]">
                        <DropdownMenuItem
                            :class="selectedFormat === '5-scale' ? 'bg-primary/15 text-primary font-medium' : ''"
                            @click="selectedFormat = '5-scale'"
                        >
                            {{ $t('summary.scales.five') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            :class="selectedFormat === '100-scale' ? 'bg-primary/15 text-primary font-medium' : ''"
                            @click="selectedFormat = '100-scale'"
                        >
                            {{ $t('summary.scales.hundred') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            :class="selectedFormat === 'ects' ? 'bg-primary/15 text-primary font-medium' : ''"
                            @click="selectedFormat = 'ects'"
                        >
                            {{ $t('summary.scales.ects') }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <!-- Settings Trigger (only when group selected) -->
                <div v-if="selectedGroup" class="flex items-center gap-2 sm:ml-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        class="h-9 w-9 px-0 sm:w-auto sm:px-3 gap-2 shrink-0"
                        @click="showSettingsSheet = true"
                    >
                        <SlidersHorizontal class="w-3.5 h-3.5" />
                        <span class="hidden sm:inline">{{ $t('summary.settings.label') }}</span>
                    </Button>
                </div>
            </div>
        </div>

        <!-- ── Unsaved grades warning banner ── -->
        <div
            v-if="unsavedCount > 0"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10"
        >
            <AlertTriangle class="w-4 h-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <p class="text-sm flex-1 text-yellow-700 dark:text-yellow-400">
                {{ $t('summary.unsavedWarning', { count: unsavedCount }) }}
            </p>
            <Button size="sm" class="h-7 gap-1.5 shrink-0" @click="handleSaveAll">
                <Save class="w-3 h-3" />
                {{ $t('summary.saveAll', { count: unsavedCount }) }}
            </Button>
        </div>

        <!-- ── Content area ── -->

        <!-- Initializing (first load, no groups yet fetched) -->
        <div v-if="isInitializing" class="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>{{ $t('summary.loading') }}</p>
        </div>

        <!-- Loading first batch for a group (no data yet to show underneath) -->
        <div v-else-if="isLoading && students.length === 0" class="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>{{ $t('summary.loading') }}</p>
        </div>

        <!-- No groups exist yet -->
        <EmptyState
            v-else-if="groups.length === 0"
            :title="$t('summary.noGroupsPrompt')"
            :description="$t('summary.noGroupsDescription')"
            :icon="Users"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <Button class="mt-4 gap-2" @click="router.push({ name: 'Groups' })">
                <Users class="w-4 h-4" />
                {{ $t('nav.groups') }}
            </Button>
        </EmptyState>

        <!-- Groups exist but none selected yet — lightweight placeholder, group picker in header is the action -->
        <EmptyState
            v-else-if="!selectedGroup"
            :title="$t('summary.selectGroupPrompt')"
            class="min-h-[400px] border-dashed bg-card/50"
        />

        <!-- Data table (with overlay while reloading over existing data) -->
        <div v-else class="relative">
            <DataTable
                :students="students"
                :modules="currentModules"
                :search-query="searchQuery"
                :row-actions="getGradeActions"
                :class="isLoading ? 'opacity-50 pointer-events-none' : ''"
                class="transition-opacity duration-150"
                @student-click="handleStudentClick"
            >
                <template #toolbar>
                    <div class="flex items-center gap-3">
                        <div class="relative w-full sm:flex-1 sm:max-w-[220px]">
                            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                v-model="searchQuery"
                                type="search"
                                :placeholder="$t('summary.searchPlaceholder')"
                                class="pl-8 h-9 text-sm"
                            />
                        </div>
                    </div>
                </template>
            </DataTable>
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                <Loader2 class="w-8 h-8 animate-spin text-primary" />
            </div>
        </div>

        <StudentProfileModal
            :open="isProfileOpen"
            :student="profileStudent"
            :meets="meets"
            :groups-map="groupsMap"
            :tasks="tasks"
            @update:open="isProfileOpen = $event"
        />

        <!-- Summary Settings Sheet -->
        <SummarySettingsSheet
            :open="showSettingsSheet"
            :settings="settingsForm"
            @update:open="showSettingsSheet = $event"
            @apply="applySettings"
            @change="handleSettingsChange"
        />

        <!-- Grade deletion confirmation dialog -->
        <GradeDeleteDialog
            :open="isDeleteDialogOpen"
            :student-name="actionTarget?.name ?? ''"
            @update:open="isDeleteDialogOpen = $event"
            @confirm="handleDeleteConfirm"
        />

        <!-- Manual grade input dialog -->
        <GradeManualInputDialog
            :open="isManualDialogOpen"
            :student-name="actionTarget?.name ?? ''"
            :current-grade="String(actionTarget?.examGrade ?? '')"
            :hint-grade="actionTarget?.total ?? null"
            @update:open="isManualDialogOpen = $event"
            @confirm="handleManualConfirm"
        />

        <!-- Leave guard confirmation -->
        <AlertDialog :open="showLeaveDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('summary.leaveDialog.title') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('summary.leaveDialog.message', { count: unsavedCount }) }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="cancelLeave">
                        {{ $t('summary.leaveDialog.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction class="bg-destructive hover:bg-destructive/90 text-white" @click="confirmLeave">
                        {{ $t('summary.leaveDialog.confirm') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>
