<script setup lang="ts">
import type { Task } from '@Tasks/types/tasks'
import type { RowActionItem } from '@/shared/types/table'
import { useTasks } from '@Tasks/composables/useTasks'
import { ClipboardList, Copy, FileUp, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import ConfirmModal from '@/shared/components/ConfirmModal.vue'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import TaskDialog from './dialogs/TaskDialog.vue'
import TasksDataTable from './TasksList/DataTable.vue'

const { t } = useI18n()
const router = useRouter()
const { tasks, loadTasks, saveTask, deleteTask, bulkDeleteTasks } = useTasks()

const searchQuery = ref('')
const bulkMode = ref(false)
const tableRef = ref<InstanceType<typeof TasksDataTable>>()

const showTaskDialog = ref(false)
const editingTask = ref<Task | null>(null)

const showConfirmModal = ref(false)
const confirmAction = ref<() => Promise<void>>(async () => {})
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmText = ref('')
const confirmVariant = ref<'danger' | 'primary'>('danger')

onMounted(() => {
    loadTasks()
})

function handleEdit(task: Task) {
    editingTask.value = task
    showTaskDialog.value = true
}

function handleDelete(task: Task) {
    confirmTitle.value = t('tasks.delete')
    confirmMessage.value = t('tasks.deleteConfirm', { name: task.name })
    confirmText.value = t('common.delete')
    confirmVariant.value = 'danger'
    confirmAction.value = () => deleteTask(task)
    showConfirmModal.value = true
}

async function handleSaveTask(formData: Partial<Task>) {
    const saved = await saveTask(formData, editingTask.value)
    if (saved) showTaskDialog.value = false
}

function handleBulkDelete() {
    const selectedRows = tableRef.value?.table.getFilteredSelectedRowModel().rows ?? []
    const ids = selectedRows.map((r) => r.original.id)
    if (!ids.length) return

    confirmTitle.value = t('tasks.bulkDelete')
    confirmMessage.value = t('tasks.bulkDeleteConfirm', { count: ids.length })
    confirmText.value = t('common.deleteAll')
    confirmVariant.value = 'danger'
    confirmAction.value = async () => {
        await bulkDeleteTasks(ids)
        bulkMode.value = false
    }
    showConfirmModal.value = true
}

async function executeConfirm() {
    showConfirmModal.value = false
    await confirmAction.value()
}

function getTaskActions(task: Task): RowActionItem[] {
    return [
        {
            label: t('common.copyId'),
            icon: Copy,
            onSelect: () => navigator.clipboard.writeText(String(task.id)),
        },
        { type: 'separator' },
        {
            label: t('common.edit'),
            icon: Pencil,
            onSelect: () => handleEdit(task),
        },
        { type: 'separator' },
        {
            label: t('common.delete'),
            icon: Trash2,
            destructive: true,
            onSelect: () => handleDelete(task),
        },
    ]
}
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Zone 1: Page header — always visible -->
        <div class="flex flex-row items-start sm:items-center justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-2xl font-bold tracking-tight truncate">
                    {{ $t('tasks.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
                    {{ $t('tasks.description') }}
                </p>
            </div>
            <div v-if="tasks.length > 0" class="flex items-center gap-2 shrink-0">
                <Button
                    size="sm"
                    class="gap-2"
                    @click="
                        () => {
                            editingTask = null
                            showTaskDialog = true
                        }
                    "
                >
                    <Plus class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ $t('tasks.add') }}</span>
                </Button>
            </div>
        </div>

        <template v-if="tasks.length > 0">
            <!-- Zone 2 + Table -->
            <TasksDataTable
                ref="tableRef"
                :tasks="tasks"
                :search-query="searchQuery"
                :bulk-mode="bulkMode"
                :row-actions="getTaskActions"
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
                                :placeholder="$t('tasks.search')"
                                class="pl-8 h-9 w-full"
                            />
                        </div>
                        <!-- Row 2: bulk (left 50%) | columns (right 50%) -->
                        <div class="grid grid-cols-2 gap-2">
                            <Button
                                v-if="
                                    bulkMode && table.getFilteredSelectedRowModel().rows.length > 0
                                "
                                variant="destructive"
                                size="sm"
                                class="h-9 gap-2 w-full"
                                @click="handleBulkDelete"
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
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search
                                    class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                />
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="$t('tasks.search')"
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
                                @click="handleBulkDelete"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span>{{ $t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                        <DataTableViewOptions :table="table" class="shrink-0" />
                    </div>
                </template>
            </TasksDataTable>
        </template>

        <!-- Empty state -->
        <EmptyState
            v-else
            :title="$t('tasks.emptyState.title')"
            :description="$t('tasks.emptyState.description')"
            :icon="ClipboardList"
            class="min-h-[400px]"
        >
            <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" class="gap-2" @click="router.push({ name: 'Marks' })">
                    <FileUp class="w-4 h-4" />
                    {{ $t('common.importMarks') }}
                </Button>
                <Button
                    class="gap-2"
                    @click="
                        () => {
                            editingTask = null
                            showTaskDialog = true
                        }
                    "
                >
                    <Plus class="w-4 h-4" />
                    {{ $t('tasks.add') }}
                </Button>
            </div>
        </EmptyState>

        <TaskDialog
            :is-open="showTaskDialog"
            :task="editingTask"
            @update:is-open="showTaskDialog = $event"
            @close="showTaskDialog = false"
            @save="handleSaveTask"
        />

        <ConfirmModal
            v-model:open="showConfirmModal"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-text="confirmText"
            :variant="confirmVariant"
            @confirm="executeConfirm"
        />
    </div>
</template>
