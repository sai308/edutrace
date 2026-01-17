<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from '@/services/toast';
import GroupModal from '../../Groups/components/GroupModal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { useFormatters } from '@/composables/useFormatters';
import { useSort } from '@/composables/useSort';
import { useMarkFormat, type MarkFormat } from '@/composables/useMarkFormat';
import { useQuerySync } from '@/composables/useQuerySync';
import { useColumnVisibility } from '@/composables/useColumnVisibility';
import { useVirtualList } from '@vueuse/core';
import { Calendar, Search, Clock, Trash2, CircleCheckBig, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Loader2, FileUp } from 'lucide-vue-next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import MarksFilterSheet from '../components/MarksFilterSheet.vue';
import MarksImportModal from '../components/MarksImportModal.vue';
import type { Group } from '@/modules/Groups/types/groups';
import type { FlatMark } from '../types/marks';

const { t } = useI18n();

// Extend FlatMark for internal UI state
interface UIMark extends FlatMark {
    showTooltip?: boolean;
}

interface Props {
    marks?: UIMark[];
    groups?: Group[];
    isProcessing?: boolean;
    allMeetIds?: string[];
    allTeachers?: string[];
    isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    marks: () => [],
    groups: () => [],
    isProcessing: false,
    allMeetIds: () => [],
    allTeachers: () => [],
    isLoading: false
});

const emit = defineEmits<{
    (e: 'process-file', payload: { file: File; groupName: string }): void;
    (e: 'create-group', payload: Partial<Group> & { _pendingFile?: File }): void;
    (e: 'delete-mark', id: string | number): void;
    (e: 'bulk-delete-marks', ids: (string | number)[]): void;
    (e: 'toggle-synced', mark: UIMark): void;
    (e: 'refresh'): void;
}>();

const { formatDate, formatTime } = useFormatters();
const { sortField, sortDirection } = useSort('createdAt', 'desc');
const { getFormattedMark, getMarkTooltip } = useMarkFormat();

const searchQuery = ref('');
const selectedFormat = ref<MarkFormat | ''>(''); // '', '5-scale', '100-scale', 'ects'

// Advanced Filters
const showFilterModal = ref(false);
const filterSynced = ref<'all' | 'unsynced'>('unsynced');
const filterDateFrom = ref('');
const filterGroup = ref<string | null>(null);
const filterHideFailed = ref(false);

const activeFilters = computed(() => ({
    synced: filterSynced.value,
    dateFrom: filterDateFrom.value,
    group: filterGroup.value,
    hideFailed: filterHideFailed.value
}));

const activeFilterCount = computed(() => {
    let count = 0;
    if (activeFilters.value.synced !== 'all') count++;
    if (activeFilters.value.dateFrom) count++;
    if (activeFilters.value.group) count++;
    if (activeFilters.value.hideFailed) count++;
    return count;
});

// Column visibility setup
const columns = computed(() => [
    { id: 'added', label: t('marks.table.added'), defaultVisible: true, width: '120px' },
    { id: 'student', label: t('marks.table.student'), defaultVisible: true, width: 'minmax(150px, 2fr)' },
    { id: 'group', label: t('marks.table.group'), defaultVisible: true, width: 'minmax(100px, 1fr)' },
    { id: 'task', label: t('marks.table.task'), defaultVisible: true, width: 'minmax(150px, 1.5fr)' },
    { id: 'mark', label: t('marks.table.mark'), defaultVisible: true, width: '80px' }
]);

const { toggleColumn, isColumnVisible } = useColumnVisibility('marks', columns.value);

// Grid Style logic
const gridStyle = computed(() => {
    // Checkbox column fixed width (40px)
    let cols = ['40px'];

    columns.value.forEach(col => {
        if (isColumnVisible(col.id)) {
            cols.push(col.width);
        }
    });

    // Actions column fixed width (100px)
    cols.push('100px');

    return {
        gridTemplateColumns: cols.join(' ')
    };
});

// Sorting
useQuerySync({
    search: searchQuery,
    format: selectedFormat,
    synced: filterSynced,
    dateFrom: filterDateFrom,
    group: filterGroup,
    hideFailed: filterHideFailed,
    sort: sortField,
    order: sortDirection
} as any);

// Selection
const selectedMarks = ref(new Set<string | number>());

const showImportModal = ref(false);

// Group Modal State
const showGroupModal = ref(false);
const pendingGroup = ref<Partial<Group> | null>(null);
const pendingFile = ref<File | null>(null);
const fileQueue = ref<File[]>([]); // Queue for multiple files
const isQueueProcessing = ref(false);

function handleSort(field: string) {
    if (sortField.value === field) {
        // Toggle direction
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortDirection.value = 'asc'; // Default new sort to asc
    }
}

// Delete Modal State
const showDeleteModal = ref(false);
const markToDelete = ref<UIMark | null>(null); // Single mark
const isBulkDelete = ref(false);

const filteredMarks = computed(() => {
    let result = [...props.marks];

    // 1. Filters
    if (activeFilters.value.synced === 'unsynced') {
        result = result.filter(m => !m.synced);
    }

    if (activeFilters.value.dateFrom) {
        const fromDate = new Date(activeFilters.value.dateFrom).setHours(0, 0, 0, 0);
        result = result.filter(m => new Date(m.createdAt).getTime() >= fromDate);
    }

    if (activeFilters.value.group) {
        result = result.filter(m => m.groupName === activeFilters.value.group);
    }

    if (activeFilters.value.hideFailed) {
        result = result.filter(m => {
            const max = Number(m.maxPoints) || 100;
            const percent = (Number(m.score) / max) * 100;
            return percent >= 60;
        });
    }

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(m =>
            m.studentName.toLowerCase().includes(query) ||
            m.groupName.toLowerCase().includes(query) ||
            m.taskName.toLowerCase().includes(query)
        );
    }

    // 2. Sorting
    result.sort((a, b) => {
        let valA: any = a[sortField.value as keyof UIMark];
        let valB: any = b[sortField.value as keyof UIMark];

        // Handle specific fields
        if (sortField.value === 'createdAt' || sortField.value === 'taskDate') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
});

const { list, containerProps, wrapperProps } = useVirtualList(filteredMarks, {
    itemHeight: 60,
});

function toggleSelection(id: string | number) {
    if (selectedMarks.value.has(id)) {
        selectedMarks.value.delete(id);
    } else {
        selectedMarks.value.add(id);
    }
}

function toggleSelectAll() {
    if (selectedMarks.value.size === filteredMarks.value.length) {
        selectedMarks.value.clear();
    } else {
        filteredMarks.value.forEach(m => selectedMarks.value.add(m.id));
    }
}

async function processNextInQueue() {
    if (fileQueue.value.length === 0) {
        isQueueProcessing.value = false;
        return;
    }

    isQueueProcessing.value = true;
    const file = fileQueue.value[0];

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Invalid file type. Please upload a CSV file.');
        fileQueue.value.shift(); // Skip invalid file
        processNextInQueue();
        return;
    }

    const filename = file.name;
    const match = filename.match(/^([^_]+)_/);
    const rawPrefix = match ? match[1] : null;

    if (!rawPrefix) {
        toast.error(`Could not determine group from filename: ${filename}`);
        fileQueue.value.shift(); // Skip invalid file
        processNextInQueue();
        return;
    }

    // Check if group exists
    let matchedGroup = props.groups.find(g => g.name === rawPrefix);
    if (!matchedGroup) {
        const normalizedPrefix = rawPrefix.replace(/-/g, '');
        matchedGroup = props.groups.find(g => g.name.replace(/-/g, '') === normalizedPrefix);
    }

    if (matchedGroup) {
        emit('process-file', { file, groupName: matchedGroup.name });
        fileQueue.value.shift(); // Done with this file
        processNextInQueue();
    } else {
        // Prompt to create group
        // Cast rawPrefix string to Partial<Group> requires caution, define minimal structure
        pendingGroup.value = { name: rawPrefix };
        pendingFile.value = file;
        showGroupModal.value = true;
        // Wait for user action (handleCreateGroup or modal close)
    }
}

function handleFilesDropped(files: File[]) {
    if (files.length === 0) return;
    fileQueue.value.push(...Array.from(files));

    if (!isQueueProcessing.value && !showGroupModal.value) {
        processNextInQueue();
    }
    showImportModal.value = false;
}

function handleCreateGroup(groupData: Partial<Group>) {
    if (pendingFile.value) {
        emit('create-group', { ...groupData, _pendingFile: pendingFile.value });
        pendingFile.value = null;
        fileQueue.value.shift(); // Remove processed file from queue

        // Small delay to allow modal to close and state to update
        setTimeout(() => {
            processNextInQueue();
        }, 100);
    } else {
        emit('create-group', groupData);
    }
    showGroupModal.value = false;
}

function handleGroupModalClose() {
    showGroupModal.value = false;
    if (isQueueProcessing.value) {
        // User cancelled group creation for this file
        pendingFile.value = null;
        fileQueue.value.shift(); // Skip this file
        processNextInQueue();
    }
}

function toggleSynced(mark: UIMark) {
    emit('toggle-synced', mark);
}

function confirmDelete(mark: UIMark) {
    markToDelete.value = mark;
    isBulkDelete.value = false;
    showDeleteModal.value = true;
}

function confirmBulkDelete() {
    if (selectedMarks.value.size === 0) return;
    isBulkDelete.value = true;
    showDeleteModal.value = true;
}

function handleDelete() {
    if (isBulkDelete.value) {
        emit('bulk-delete-marks', Array.from(selectedMarks.value));
        selectedMarks.value.clear();
    } else if (markToDelete.value) {
        emit('delete-mark', markToDelete.value.id);
    }
    showDeleteModal.value = false;
    markToDelete.value = null;
    isBulkDelete.value = false;
}

function applyFilters(filters: any) {
    filterSynced.value = filters.synced;
    filterDateFrom.value = filters.dateFrom;
    filterGroup.value = filters.group;
    filterHideFailed.value = filters.hideFailed;
}

function formatTaskName(taskName: string) {
    return taskName.replace(/_/g, ' ');
}

</script>

<template>
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary" />
        <p>{{ $t('loader.loading') }}</p>
    </div>
    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="space-y-1 w-full md:w-auto">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-bold tracking-tight">{{ $t('marks.title') }}</h2>
                    <span class="text-muted-foreground text-sm">{{ $t('marks.subtitle', {
                        count: filteredMarks.length,
                        total: marks.length
                    }) }}</span>

                    <!-- Bulk Delete -->
                    <Button v-if="selectedMarks.size > 0" @click="confirmBulkDelete" variant="destructive" size="sm"
                        class="gap-2 h-8">
                        <Trash2 class="w-4 h-4" />
                        Видалити
                        <Badge variant="secondary"
                            class="bg-destructive-foreground/20 text-destructive-foreground hover:bg-destructive-foreground/30 px-1 py-0 h-5 min-w-[1.25rem]">
                            {{ selectedMarks.size }}
                        </Badge>
                    </Button>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
                <!-- Group Selector -->
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="outline" size="sm" class="h-9 gap-1">
                            <span class="text-xs text-muted-foreground mr-1">{{ $t('marks.table.group') }}:</span>
                            <span class="font-medium">{{ filterGroup || $t('marks.filterModal.allGroups') }}</span>
                            <ChevronDown class="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-[200px] max-h-[300px] overflow-y-auto">
                        <DropdownMenuItem @click="filterGroup = null">
                            {{ $t('marks.filterModal.allGroups') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem v-for="group in groups" :key="group.id" @click="filterGroup = group.name">
                            {{ group.name }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <!-- Format Selector -->
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="outline" size="sm" class="h-9 gap-1">
                            <span class="text-xs text-muted-foreground mr-1">{{ $t('marks.gradeScale') }}:</span>
                            <span class="font-medium">
                                {{ (selectedFormat === 'raw' || selectedFormat === '') ? $t('marks.scales.default')
                                    :
                                    selectedFormat === '5-scale' ?
                                        $t('marks.scales.5point') :
                                        selectedFormat === '100-scale' ? $t('marks.scales.100point') :
                                            $t('marks.scales.ects')
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

                <!-- Filter Button -->
                <Button variant="outline" size="sm" class="h-9 gap-2"
                    :class="{ 'border-primary/50 bg-primary/5 text-primary': activeFilterCount > 0 }"
                    @click="showFilterModal = true">
                    <Filter class="w-3.5 h-3.5" />
                    {{ $t('marks.filters') }}
                    <Badge v-if="activeFilterCount > 0" variant="secondary"
                        class="ml-auto h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center bg-primary text-primary-foreground pointer-events-none">
                        {{ activeFilterCount }}
                    </Badge>
                </Button>

                <!-- Add Button -->
                <Button size="sm" class="gap-2 h-8" @click="showImportModal = true">
                    <FileUp class="w-4 h-4" />
                    {{ $t('marks.import') || 'Add' }}
                </Button>
            </div>
        </div>

        <!-- Search Row -->
        <div class="flex items-center gap-2">
            <div class="relative flex-1">
                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" :placeholder="$t('marks.searchPlaceholder')"
                    :title="$t('marks.searchTitle')" class="pl-9 bg-background" />
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm" class="h-9 gap-2">
                        <ArrowUpDown class="w-3.5 h-3.5" />
                        {{ $t('marks.columns') || 'Columns' }}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-[200px]">
                    <div class="p-2 space-y-1">
                        <div v-for="column in columns" :key="column.id"
                            class="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            @click="toggleColumn(column.id)">
                            <Checkbox :id="`col-${column.id}`" :checked="isColumnVisible(column.id)"
                                @update:checked="() => toggleColumn(column.id)" />
                            <Label :for="`col-${column.id}`"
                                class="flex-1 cursor-pointer text-sm font-normal pointer-events-none">
                                {{ column.label }}
                            </Label>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <!-- Data Table (Virtual List) -->
        <div v-if="filteredMarks.length > 0"
            class="border rounded-lg bg-card shadow-sm flex flex-col h-[calc(100vh-14rem)]">
            <!-- Header Row (Grid) -->
            <div class="grid gap-2 p-3 bg-muted/50 border-b font-medium text-muted-foreground text-sm sticky top-0 z-10 shrink-0 select-none items-center"
                :style="gridStyle">

                <div class="flex items-center justify-center">
                    <Checkbox :checked="selectedMarks.size === filteredMarks.length && filteredMarks.length > 0"
                        @update:checked="toggleSelectAll" />
                </div>

                <div v-if="isColumnVisible('added')"
                    class="cursor-pointer hover:text-foreground transition-colors select-none"
                    @click="handleSort('createdAt')" :title="$t('marks.table.tooltips.added')">
                    <div class="flex items-center gap-1">
                        {{ $t('marks.table.added') }}
                        <ArrowUp v-if="sortField === 'createdAt' && sortDirection === 'asc'" class="w-3 h-3" />
                        <ArrowDown v-if="sortField === 'createdAt' && sortDirection === 'desc'" class="w-3 h-3" />
                        <ArrowUpDown v-if="sortField !== 'createdAt'" class="w-3 h-3 opacity-50" />
                    </div>
                </div>

                <div v-if="isColumnVisible('student')"
                    class="cursor-pointer hover:text-foreground transition-colors select-none"
                    @click="handleSort('studentName')" :title="$t('marks.table.tooltips.student')">
                    <div class="flex items-center gap-1">
                        {{ $t('marks.table.student') }}
                        <ArrowUp v-if="sortField === 'studentName' && sortDirection === 'asc'" class="w-3 h-3" />
                        <ArrowDown v-if="sortField === 'studentName' && sortDirection === 'desc'" class="w-3 h-3" />
                        <ArrowUpDown v-if="sortField !== 'studentName'" class="w-3 h-3 opacity-50" />
                    </div>
                </div>

                <div v-if="isColumnVisible('group')"
                    class="cursor-pointer hover:text-foreground transition-colors select-none"
                    @click="handleSort('groupName')" :title="$t('marks.table.tooltips.group')">
                    <div class="flex items-center gap-1">
                        {{ $t('marks.table.group') }}
                        <ArrowUp v-if="sortField === 'groupName' && sortDirection === 'asc'" class="w-3 h-3" />
                        <ArrowDown v-if="sortField === 'groupName' && sortDirection === 'desc'" class="w-3 h-3" />
                        <ArrowUpDown v-if="sortField !== 'groupName'" class="w-3 h-3 opacity-50" />
                    </div>
                </div>

                <div v-if="isColumnVisible('task')"
                    class="cursor-pointer hover:text-foreground transition-colors select-none"
                    @click="handleSort('taskName')" :title="$t('marks.table.tooltips.task')">
                    <div class="flex items-center gap-1">
                        {{ $t('marks.table.task') }}
                        <ArrowUp v-if="sortField === 'taskName' && sortDirection === 'asc'" class="w-3 h-3" />
                        <ArrowDown v-if="sortField === 'taskName' && sortDirection === 'desc'" class="w-3 h-3" />
                        <ArrowUpDown v-if="sortField !== 'taskName'" class="w-3 h-3 opacity-50" />
                    </div>
                </div>

                <div v-if="isColumnVisible('mark')" class="text-center" :title="$t('marks.table.tooltips.mark')">
                    {{ $t('marks.table.mark') }}
                </div>

                <div class="text-right">{{ $t('marks.table.actions') }}</div>
            </div>

            <!-- Virtual List Body -->
            <div v-bind="containerProps" class="h-full overflow-y-auto w-full relative custom-scrollbar">
                <div v-bind="wrapperProps" class="w-full">
                    <div v-for="{ index, data: mark } in list" :key="mark.id"
                        class="grid gap-2 p-3 border-b hover:bg-muted/50 transition-colors items-center text-sm"
                        :class="{ 'bg-muted/30': selectedMarks.has(mark.id) }"
                        :style="{ ...gridStyle, height: '60px' }">

                        <div class="flex items-center justify-center">
                            <Checkbox :checked="selectedMarks.has(mark.id)"
                                @update:checked="toggleSelection(mark.id)" />
                        </div>

                        <div v-if="isColumnVisible('added')" class="text-xs text-muted-foreground">
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-1">
                                    <Calendar class="w-3 h-3" />
                                    {{ formatDate(mark.createdAt) }}
                                </div>
                                <div class="flex items-center gap-1 text-[10px] opacity-80">
                                    <Clock class="w-3 h-3" />
                                    {{ formatTime(mark.createdAt) }}
                                </div>
                            </div>
                        </div>

                        <div v-if="isColumnVisible('student')" class="font-medium truncate" :title="mark.studentName">
                            {{ mark.studentName }}
                        </div>

                        <div v-if="isColumnVisible('group')">
                            <Badge variant="secondary" class="cursor-pointer max-w-[120px] truncate"
                                :class="{ 'ring-2 ring-primary': activeFilters.group === mark.groupName }"
                                @click="activeFilters.group = mark.groupName">
                                {{ mark.groupName }}
                            </Badge>
                        </div>

                        <div v-if="isColumnVisible('task')" class="truncate" :title="mark.taskName">
                            <div class="flex flex-col">
                                <span class="truncate">{{ formatTaskName(mark.taskName) }}</span>
                                <span class="text-xs text-muted-foreground">{{ mark.taskDate }}</span>
                            </div>
                        </div>

                        <div v-if="isColumnVisible('mark')" class="text-center relative">
                            <div class="flex items-center justify-center gap-1">
                                <span
                                    class="font-mono font-bold cursor-help border-b border-dotted border-muted-foreground/50 group"
                                    @mouseenter="mark.showTooltip = true" @mouseleave="mark.showTooltip = false">
                                    {{ getFormattedMark(mark, selectedFormat || undefined) }}
                                    <Transition name="fade">
                                        <div v-if="mark.showTooltip"
                                            class="absolute z-10 px-3 py-2.5 bg-card border border-border rounded-md shadow-md text-xs text-card-foreground whitespace-nowrap right-full top-1/2 -translate-y-1/2 mr-2 pointer-events-none transition-opacity duration-200 ease-in-out">
                                            <div v-for="(tooltipLine, index) in getMarkTooltip(mark.score, mark.maxPoints)"
                                                :key="index">{{ tooltipLine }}</div>
                                        </div>
                                    </Transition>
                                </span>
                                <!-- Unsynced Dot -->
                                <div class="w-2 h-2 flex items-center justify-center">
                                    <span v-if="!mark.synced" class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"
                                        :title="$t('marks.tooltips.unSynced')"></span>
                                </div>
                            </div>
                        </div>

                        <div class="text-right flex justify-end gap-1">
                            <Button @click="toggleSynced(mark)" variant="ghost" size="icon" class="h-8 w-8"
                                :class="mark.synced ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-muted-foreground hover:text-primary'"
                                :title="mark.synced ? $t('marks.tooltips.markAsUnsynced') : $t('marks.tooltips.markAsSynced')">
                                <CircleCheckBig class="w-4 h-4" />
                            </Button>
                            <Button @click="confirmDelete(mark)" variant="ghost" size="icon"
                                class="h-8 w-8 text-muted-foreground hover:text-destructive"
                                :title="$t('marks.tooltips.delete')">
                                <Trash2 class="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else
            class="text-center py-12 text-muted-foreground flex flex-col items-center justify-center min-h-[400px]">
            <div v-if="groups.length === 0" class="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div class="bg-muted p-4 rounded-full">
                    <FileUp class="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 class="text-lg font-semibold">{{ $t('marks.emptyState.title') }}</h3>
                <p class="text-sm text-center">
                    {{ $t('marks.emptyState.description') }}
                </p>
                <p class="text-xs text-muted-foreground text-center">
                    {{ $t('marks.emptyState.hint') }}
                </p>
            </div>
            <div v-else>
                {{ searchQuery ? $t('marks.noMatch') : $t('marks.noMarks') }}
            </div>
        </div>

        <!-- Group Modal -->
        <GroupModal :is-open="showGroupModal" :group="pendingGroup" :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers" @close="handleGroupModalClose" @save="handleCreateGroup" />

        <!-- Delete Confirmation Modal -->
        <ConfirmModal :is-open="showDeleteModal"
            :title="isBulkDelete ? $t('marks.deleteModal.bulkTitle') : $t('marks.deleteModal.title')"
            :message="isBulkDelete ? $t('marks.deleteModal.bulkMessage', { count: selectedMarks.size }) : $t('marks.deleteModal.message')"
            :confirm-text="$t('marks.deleteModal.confirm')" @cancel="showDeleteModal = false" @confirm="handleDelete" />

        <!-- Filter Modal -->
        <MarksFilterSheet :is-open="showFilterModal" :filters="activeFilters" :groups="groups"
            @update:is-open="(v) => showFilterModal = v" @apply="applyFilters" />

        <!-- Import Modal -->
        <MarksImportModal :is-open="showImportModal" :is-processing="isProcessing"
            @update:is-open="(v) => showImportModal = v" @files-dropped="handleFilesDropped" />
    </div>
</template>
