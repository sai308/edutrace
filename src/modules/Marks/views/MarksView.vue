<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import type { ManualMarkData } from '../components/ManualMarkDialog.vue'
import type { MarksFilters } from '../components/MarksFilterSheet.vue'
import type { ActiveFilters, UIMark } from '../components/MarksList/columns'
import type { MarkFormat } from '@/shared/composables/useMarkFormat'
import { useStorage } from '@vueuse/core'
import {
    ChevronDown,
    FileUp,
    Filter,
    GraduationCap,
    Loader2,
    PenLine,
    Search,
    Trash2,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import DataTablePagination from '@/shared/components/DataTablePagination.vue'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useQuerySync } from '@/shared/composables/useQuerySync'
import ManualMarkDialog from '../components/ManualMarkDialog.vue'
import MarksFilterSheet from '../components/MarksFilterSheet.vue'
import MarksImportDialog from '../components/MarksImportDialog.vue'
import MarksListDataTable from '../components/MarksList/DataTable.vue'

withDefaults(defineProps<Props>(), {
    marks: () => [],
    groups: () => [],
    isProcessing: false,
    allMeetIds: () => [],
    allTeachers: () => [],
    isLoading: false,
})
const emit = defineEmits<{
    (e: 'delete-mark', id: string | number): void
    (e: 'bulk-delete-marks', ids: (string | number)[]): void
    (e: 'toggle-synced', mark: UIMark): void
    (e: 'refresh'): void
    (e: 'queue-complete'): void
    (e: 'save-manual-mark', data: ManualMarkData): void
}>()
const showImportModal = ref(false)
const showManualMarkDialog = ref(false)

interface Props {
    marks?: UIMark[]
    groups?: Group[]
    isProcessing?: boolean
    allMeetIds?: string[]
    allTeachers?: string[]
    isLoading?: boolean
    processFileFn?: (payload: { file: File; groupName: string }) => Promise<void>
    createGroupFn?: (data: Partial<Group>) => Promise<Group>
}

// --- Filter state ---
const searchQuery = ref('')
const selectedFormat = ref<MarkFormat | ''>('')
const showFilterModal = ref(false)
const filterSynced = ref<'all' | 'unsynced'>('all')
const filterDateFrom = ref('')
const filterGroup = ref<string | null>(null)
const filterHideFailed = useStorage('edutrace-marks-hide-failed', true)

const activeFilters = computed<ActiveFilters>(() => ({
    synced: filterSynced.value,
    dateFrom: filterDateFrom.value,
    group: filterGroup.value,
    hideFailed: filterHideFailed.value === true || String(filterHideFailed.value) === 'true',
}))

const activeFilterCount = computed(() => {
    let count = 0
    if (activeFilters.value.synced === 'unsynced') count++
    if (activeFilters.value.dateFrom) count++
    if (activeFilters.value.hideFailed) count++
    return count
})

useQuerySync({
    search: searchQuery,
    format: selectedFormat,
    synced: filterSynced,
    dateFrom: filterDateFrom,
    group: filterGroup,
    hideFailed: filterHideFailed,
} as any)

// --- Table ref + bulk mode ---
const marksTableRef = ref<any>(null)
const bulkMode = ref(false)

// --- Delete state ---
const showDeleteModal = ref(false)
const markToDelete = ref<UIMark | null>(null)
const isBulkDelete = ref(false)
const meetIdsToDelete = ref<(string | number)[]>([])

function confirmDelete(mark: UIMark) {
    markToDelete.value = mark
    isBulkDelete.value = false
    showDeleteModal.value = true
}

function confirmBulkDelete(ids: (string | number)[]) {
    if (!ids || ids.length === 0) return
    meetIdsToDelete.value = ids
    isBulkDelete.value = true
    showDeleteModal.value = true
}

function handleDelete() {
    if (isBulkDelete.value) {
        emit('bulk-delete-marks', meetIdsToDelete.value)
        marksTableRef.value?.table.resetRowSelection()
    } else if (markToDelete.value) {
        emit('delete-mark', markToDelete.value.id)
    }
    showDeleteModal.value = false
    markToDelete.value = null
    isBulkDelete.value = false
    meetIdsToDelete.value = []
}

function applyFilters(filters: MarksFilters) {
    filterSynced.value = filters.synced
    filterDateFrom.value = filters.dateFrom
    filterHideFailed.value = filters.hideFailed
}
</script>

<template>
    <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground"
    >
        <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary" />
        <p>{{ $t('loader.loading') }}</p>
    </div>
    <div
        v-else
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Zone 1: Page header -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">
                    {{ $t('marks.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5">
                    <template v-if="marks.length > 0">
                        {{
                            $t('marks.subtitle', {
                                count:
                                    marksTableRef?.table?.getFilteredRowModel().rows.length ??
                                    marks.length,
                                total: marks.length,
                            })
                        }}
                    </template>
                    <template v-else>
                        {{ $t('marks.description') }}
                    </template>
                </p>
            </div>
            <!-- Scope selectors + action buttons -->
            <div class="flex flex-wrap items-center gap-2 shrink-0">
                <!-- Group Selector -->
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-9 gap-1"
                            :disabled="groups.length === 0"
                        >
                            <span class="hidden sm:inline text-xs text-muted-foreground mr-1"
                                >{{ $t('marks.table.group') }}:</span
                            >
                            <span
                                class="font-medium max-w-[100px] truncate"
                                :title="filterGroup || undefined"
                            >
                                {{ filterGroup || $t('marks.filterModal.allGroups') }}
                            </span>
                            <ChevronDown class="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        class="w-[200px] max-h-[300px] overflow-y-auto"
                    >
                        <DropdownMenuItem @click="filterGroup = null">
                            {{ $t('marks.filterModal.allGroups') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            v-for="group in groups"
                            :key="group.id"
                            @click="filterGroup = group.name"
                        >
                            {{ group.name }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <!-- Grade Scale Selector -->
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="outline" size="sm" class="h-9 gap-1">
                            <span class="hidden sm:inline text-xs text-muted-foreground mr-1"
                                >{{ $t('marks.gradeScale') }}:</span
                            >
                            <span class="font-medium">
                                {{
                                    selectedFormat === 'raw' || selectedFormat === ''
                                        ? $t('marks.scales.default')
                                        : selectedFormat === '5-scale'
                                          ? $t('marks.scales.5point')
                                          : selectedFormat === '100-scale'
                                            ? $t('marks.scales.100point')
                                            : $t('marks.scales.ects')
                                }}
                            </span>
                            <ChevronDown class="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-[180px]">
                        <DropdownMenuItem @click="selectedFormat = ''">
                            {{ $t('marks.scales.default') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="selectedFormat = '5-scale'">
                            {{ $t('marks.scales.5point') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="selectedFormat = '100-scale'">
                            {{ $t('marks.scales.100point') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="selectedFormat = 'ects'">
                            {{ $t('marks.scales.ects') }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <!-- Action buttons — only shown when data exists; empty state provides these CTAs when marks=0 -->
                <div v-if="marks.length > 0" class="ml-auto flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        class="gap-2"
                        @click="showManualMarkDialog = true"
                    >
                        <PenLine class="w-4 h-4" />
                        <span class="hidden sm:inline">{{ $t('marks.addMark') }}</span>
                    </Button>
                    <Button size="sm" class="gap-2" @click="showImportModal = true">
                        <FileUp class="w-4 h-4" />
                        <span class="hidden sm:inline">{{ $t('marks.import') }}</span>
                    </Button>
                </div>
            </div>
        </div>

        <!-- Zone 2 + Table -->
        <template v-if="marks.length > 0">
            <MarksListDataTable
                ref="marksTableRef"
                :marks="marks"
                :search-query="searchQuery"
                :active-filters="activeFilters"
                :selected-format="selectedFormat"
                :bulk-mode="bulkMode"
                :groups="groups"
                @toggle-synced="(mark) => emit('toggle-synced', mark)"
                @delete-mark="confirmDelete"
                @upload="showImportModal = true"
            >
                <template #toolbar="{ table }">
                    <!-- ── Mobile (< sm): 2-row layout ── -->
                    <div class="flex flex-col gap-2 sm:hidden">
                        <!-- Row 1: full-width search -->
                        <div class="relative">
                            <Search
                                class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                            />
                            <Input
                                v-model="searchQuery"
                                :placeholder="$t('marks.searchPlaceholder')"
                                class="pl-8 h-9 w-full"
                            />
                        </div>
                        <!-- Row 2: bulk | filters | columns (3-col grid) -->
                        <div class="grid grid-cols-3 gap-2">
                            <Button
                                v-if="
                                    bulkMode && table.getFilteredSelectedRowModel().rows.length > 0
                                "
                                variant="destructive"
                                size="sm"
                                class="h-9 gap-2 w-full"
                                @click="
                                    confirmBulkDelete(
                                        table
                                            .getFilteredSelectedRowModel()
                                            .rows.map((r: any) => r.original.id),
                                    )
                                "
                            >
                                <Trash2 class="h-4 w-4 shrink-0" />
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                            <div v-else class="flex items-center gap-2 h-9">
                                <Switch
                                    :model-value="bulkMode"
                                    class="cursor-pointer"
                                    @update:model-value="bulkMode = $event"
                                />
                                <span class="text-sm text-muted-foreground select-none">{{
                                    $t('common.bulk')
                                }}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                class="h-9 w-full gap-1.5"
                                :class="{ 'border-primary/50 bg-primary/5': activeFilterCount > 0 }"
                                @click="showFilterModal = true"
                            >
                                <Filter class="w-3.5 h-3.5 shrink-0" />
                                <span
                                    v-if="
                                        !(
                                            bulkMode &&
                                            table.getFilteredSelectedRowModel().rows.length > 0
                                        )
                                    "
                                    >{{ $t('marks.filters') }}
                                </span>
                                <Badge
                                    v-if="activeFilterCount > 0"
                                    variant="secondary"
                                    class="h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center bg-primary text-primary-foreground pointer-events-none"
                                >
                                    {{ activeFilterCount }}
                                </Badge>
                            </Button>
                            <DataTableViewOptions
                                :table="table"
                                :compact="
                                    bulkMode && table.getFilteredSelectedRowModel().rows.length > 0
                                "
                                button-class="w-full"
                            />
                        </div>
                    </div>

                    <!-- ── Desktop (≥ sm): single-row layout ── -->
                    <div class="hidden sm:flex items-center justify-between gap-3">
                        <!-- Left: search → bulk switch → bulk delete -->
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search
                                    class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                />
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="$t('marks.searchPlaceholder')"
                                    class="pl-8 h-9"
                                />
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <Switch
                                    :model-value="bulkMode"
                                    class="cursor-pointer"
                                    @update:model-value="bulkMode = $event"
                                />
                                <span class="text-sm text-muted-foreground select-none">{{
                                    $t('common.bulk')
                                }}</span>
                            </div>
                            <Button
                                v-if="
                                    bulkMode && table.getFilteredSelectedRowModel().rows.length > 0
                                "
                                variant="destructive"
                                size="sm"
                                class="h-8 gap-2 shrink-0"
                                @click="
                                    confirmBulkDelete(
                                        table
                                            .getFilteredSelectedRowModel()
                                            .rows.map((r: any) => r.original.id),
                                    )
                                "
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span>{{ $t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                        <!-- Right: filters + columns picker -->
                        <div class="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                class="h-9 gap-2"
                                :class="{ 'border-primary/50 bg-primary/5': activeFilterCount > 0 }"
                                @click="showFilterModal = true"
                            >
                                <Filter class="w-3.5 h-3.5" />
                                {{ $t('marks.filters') }}
                                <Badge
                                    v-if="activeFilterCount > 0"
                                    variant="secondary"
                                    class="ml-auto h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center bg-primary text-primary-foreground pointer-events-none"
                                >
                                    {{ activeFilterCount }}
                                </Badge>
                            </Button>
                            <DataTableViewOptions :table="table" />
                        </div>
                    </div>
                </template>

                <template #footer="{ table }">
                    <DataTablePagination :table="table" />
                </template>
            </MarksListDataTable>
        </template>

        <!-- No records: page-level EmptyState -->
        <EmptyState
            v-else
            :title="$t('marks.emptyState.title')"
            :description="$t('marks.emptyState.description')"
            :icon="GraduationCap"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" class="gap-2" @click="showManualMarkDialog = true">
                    <PenLine class="w-4 h-4" />
                    {{ $t('marks.addMark') }}
                </Button>
                <Button class="gap-2" @click="showImportModal = true">
                    <FileUp class="w-4 h-4" />
                    {{ $t('marks.import') }}
                </Button>
            </div>
        </EmptyState>

        <!-- Delete Confirmation -->
        <AlertDialog :open="showDeleteModal">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {{
                            isBulkDelete
                                ? $t('marks.deleteModal.bulkTitle')
                                : $t('marks.deleteModal.title')
                        }}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {{
                            isBulkDelete
                                ? $t('marks.deleteModal.bulkMessage', {
                                      count: meetIdsToDelete.length,
                                  })
                                : $t('marks.deleteModal.message')
                        }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="showDeleteModal = false">
                        {{ $t('common.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive hover:bg-destructive/90 text-white"
                        @click="handleDelete"
                    >
                        {{ $t('marks.deleteModal.confirm') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Filter Sheet -->
        <MarksFilterSheet
            :open="showFilterModal"
            :filters="activeFilters"
            @update:open="(v) => (showFilterModal = v)"
            @apply="applyFilters"
        />

        <!-- Manual Mark Entry Dialog -->
        <ManualMarkDialog
            :open="showManualMarkDialog"
            :groups="groups"
            @update:open="showManualMarkDialog = $event"
            @confirm="(data) => emit('save-manual-mark', data)"
        />

        <!-- Import Dialog -->
        <MarksImportDialog
            v-if="processFileFn && createGroupFn"
            :open="showImportModal"
            :groups="groups"
            :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers"
            :process-file-fn="processFileFn"
            :create-group-fn="createGroupFn"
            @update:open="(v) => (showImportModal = v)"
            @queue-complete="emit('queue-complete')"
        />
    </div>
</template>
