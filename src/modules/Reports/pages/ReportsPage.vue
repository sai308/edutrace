<script setup lang="ts">
import type { Meet } from '@Analytics/types/analytics'
import type { RowActionItem } from '@/shared/types/table'
import { useMeets } from '@Analytics/composables/useMeets'
import ReportsDeleteDialog from '@Reports/components/dialogs/ReportsDeleteDialog.vue'
import ReportsImportDialog from '@Reports/components/dialogs/ReportsImportDialog.vue'
import ReportsListDataTable from '@Reports/components/ReportsList/DataTable.vue'
import { Eye, FileText, FileUp, Search, Trash2 } from 'lucide-vue-next'

import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import FileImportDialog from '@/shared/components/FileImportDialog.vue'
import { useReportProcessing } from '../composables/useReportProcessing'

const router = useRouter()
const { t } = useI18n()
const { meets, loadMeets } = useMeets()
const { isProcessing, handleFilesDropped, showFilterModal, processFiles, cancelFilter } = useReportProcessing()

const showDeleteConfirm = ref(false)
const meetToDeleteId = ref<string | null>(null)
const meetIdsToDelete = ref<string[]>([])
const searchQuery = ref('')
const bulkMode = ref(false)
const reportsTableRef = ref<InstanceType<typeof ReportsListDataTable>>()
const showUploadModal = ref(false)

onMounted(() => loadMeets())

function handleDeleteMeet(id: string): void {
    meetToDeleteId.value = id
    showDeleteConfirm.value = true
}

function confirmBulkDelete(ids: string[]): void {
    if (!ids.length)
        return
    meetIdsToDelete.value = ids
    showDeleteConfirm.value = true
}

function getMeetActions(meet: Meet): RowActionItem[] {
    return [
        {
            label: t('common.details'),
            icon: Eye,
            onSelect: () => router.push({ name: 'ReportDetails', params: { id: meet.id } }),
        },
        { type: 'separator' },
        {
            label: t('common.delete'),
            icon: Trash2,
            destructive: true,
            onSelect: () => handleDeleteMeet(meet.id),
        },
    ]
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Zone 1: Page header -->
        <div class="flex flex-row items-start sm:items-center justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-2xl font-bold tracking-tight truncate">
                    {{ t('reports.title') }}
                </h1>
                <!-- Mobile: mandatory counter -->
                <p class="text-sm text-muted-foreground mt-0.5 truncate sm:hidden">
                    <template v-if="meets.length > 0">
                        {{
                            t('reports.subtitle', {
                                count: reportsTableRef?.table?.getFilteredRowModel().rows.length ?? meets.length,
                                total: meets.length,
                            })
                        }}
                    </template>
                    <template v-else>
                        {{ t('reports.description') }}
                    </template>
                </p>
                <!-- Desktop: description -->
                <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
                    {{ t('reports.description') }}
                </p>
            </div>
            <div v-if="meets.length > 0" class="flex items-center gap-2 shrink-0">
                <Button size="sm" class="gap-2" @click="showUploadModal = true">
                    <FileUp class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ t('common.importReports') }}</span>
                </Button>
            </div>
        </div>

        <!-- Zone 2 + Table -->
        <template v-if="meets.length > 0">
            <ReportsListDataTable
                ref="reportsTableRef"
                :meets="meets"
                :search-query="searchQuery"
                :bulk-mode="bulkMode"
                :row-actions="getMeetActions"
            >
                <template #toolbar="{ table }">
                    <!-- ── Mobile (< sm): 2-row layout ── -->
                    <div class="flex flex-col gap-2 sm:hidden">
                        <!-- Row 1: full-width search -->
                        <div class="relative">
                            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                v-model="searchQuery"
                                :placeholder="t('reports.searchPlaceholder')"
                                class="pl-8 h-9 w-full"
                            />
                        </div>
                        <!-- Row 2: bulk (left 50%) | columns (right 50%) -->
                        <div class="grid grid-cols-2 gap-2">
                            <!-- Left: compact delete when rows selected, otherwise bulk toggle -->
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive"
                                size="sm"
                                class="h-9 gap-2 w-full"
                                @click="
                                    confirmBulkDelete(
                                        table.getFilteredSelectedRowModel().rows.map((r: any) => r.original.id),
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
                                <span class="text-sm text-muted-foreground select-none">{{ t('common.bulk') }}</span>
                            </div>
                            <!-- Right: columns picker, compact when rows are selected -->
                            <DataTableViewOptions
                                :table="table"
                                :compact="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                button-class="w-full"
                            />
                        </div>
                    </div>

                    <!-- ── Desktop (≥ sm): original single-row layout ── -->
                    <div class="hidden sm:flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="t('reports.searchPlaceholder')"
                                    class="pl-8 h-9"
                                />
                            </div>
                            <div
                                v-if="!(bulkMode && table.getFilteredSelectedRowModel().rows.length > 0)"
                                class="flex items-center gap-2 shrink-0"
                            >
                                <Switch
                                    :model-value="bulkMode"
                                    class="cursor-pointer"
                                    @update:model-value="bulkMode = $event"
                                />
                                <span class="text-sm text-muted-foreground select-none">{{ t('common.bulk') }}</span>
                            </div>
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive"
                                size="sm"
                                class="h-8 gap-2 shrink-0"
                                @click="
                                    confirmBulkDelete(
                                        table.getFilteredSelectedRowModel().rows.map((r: any) => r.original.id),
                                    )
                                "
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span>{{ t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                        <DataTableViewOptions :table="table" class="shrink-0" />
                    </div>
                </template>
            </ReportsListDataTable>
        </template>

        <!-- No records: page-level empty state -->
        <EmptyState
            v-else
            :title="t('reports.emptyState.title')"
            :description="t('reports.emptyState.description')"
            :icon="FileText"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <Button class="mt-4 gap-2" @click="showUploadModal = true">
                <FileUp class="w-4 h-4" />
                {{ t('common.importReports') }}
            </Button>
        </EmptyState>

        <!-- Dialogs -->
        <ReportsDeleteDialog
            v-model:open="showDeleteConfirm"
            :meet-id="meetToDeleteId"
            :meet-ids="meetIdsToDelete"
            @success="
                () => {
                    meetToDeleteId = null;
                    meetIdsToDelete = [];
                }
            "
        />

        <ReportsImportDialog
            :open="showFilterModal"
            @update:open="(val) => !val && cancelFilter()"
            @select="processFiles"
        />

        <FileImportDialog
            v-model:open="showUploadModal"
            :is-processing="isProcessing"
            :title="t('reports.uploadDialog.title')"
            :description="t('reports.uploadDialog.description')"
            :prompt="t('dropZone.reportsPrompt')"
            @files-dropped="(files) => handleFilesDropped(files, loadMeets)"
        />
    </div>
</template>
