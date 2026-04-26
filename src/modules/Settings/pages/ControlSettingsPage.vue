<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import { summaryService } from '@Summary/services/summary.service'
import * as summaryExportService from '@Summary/services/summaryExport.service'
import {
    Database,
    FileBracesCorner,
    FileSpreadsheet,
    FileText,
    HardDriveDownload,
    HardDriveUpload,
    HelpCircle,
    Trash2,
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logger } from '@/shared/lib/logger'
import * as backupService from '@/shared/services/backup.service'
import { databaseService, DB_VERSION } from '@/shared/services/DatabaseService'
import * as statsService from '@/shared/services/stats.service'
import { toast } from '@/shared/services/toast'
import { downloadBlob, downloadJson } from '@/shared/utils/download'

const { t } = useI18n()

// Marks Management
const marksCount = ref(0)
const marksSize = ref(0)
const importMarksInput = ref<HTMLInputElement | null>(null)
const showDeleteMarksConfirm = ref(false)
const isDeletingMarks = ref(false)

// Tasks Management
const tasksCount = ref(0)
const tasksSize = ref(0)
const importTasksInput = ref<HTMLInputElement | null>(null)
const showDeleteTasksConfirm = ref(false)
const isDeletingTasks = ref(false)

// Modules Management
const modulesCount = ref(0)
const unitsCount = ref(0)
const modulesSize = ref(0)
const summarySize = ref(0)
const finalAssessmentsCount = ref(0)

const importModulesInput = ref<HTMLInputElement | null>(null)
const showDeleteModulesConfirm = ref(false)
const isDeletingModules = ref(false)

// Storage Info
const dbName = ref('')
const dbVersion = ref(DB_VERSION)

// Summary Export
const summaryGroups = ref<Group[]>([])
const selectedSummaryGroupId = ref('')
const isSummaryExporting = ref(false)

onMounted(async () => {
    await loadSettings()
})

async function loadSettings() {
    const counts = await statsService.getEntityCounts()
    marksCount.value = counts.marks
    tasksCount.value = counts.tasks
    modulesCount.value = counts.modules
    unitsCount.value = counts.units
    finalAssessmentsCount.value = counts.finalAssessments

    const sizes = await statsService.getEntitySizes()
    marksSize.value = sizes.marks
    tasksSize.value = sizes.tasks
    modulesSize.value = sizes.summary
    summarySize.value = sizes.summary

    dbName.value = databaseService.getCurrentDbName()
    summaryGroups.value = await summaryService.getGroups()
}

// --- Marks Actions ---
async function exportMarks() {
    try {
        const data = await backupService.exportMarks()
        downloadJson(data, 'marks')
        toast.success(t('control.settings.exportMarksSuccess'))
    } catch (e) {
        logger.error('Export marks failed:', e)
        toast.error(t('control.settings.exportMarksFail'))
    }
}
function triggerImportMarks() {
    importMarksInput.value?.click()
}
async function handleImportMarks(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importMarks(data)
        toast.success(t('control.settings.importMarksSuccess'))
        await loadSettings()
    } catch (e) {
        logger.error('Import marks failed:', e)
        toast.error(t('control.settings.importMarksFail'))
    }
    if (event.target) (event.target as HTMLInputElement).value = ''
}
async function handleDeleteMarks() {
    isDeletingMarks.value = true
    try {
        await backupService.clearMarks()
        toast.success(t('control.settings.deleteMarksSuccess'))
        await loadSettings()
    } catch (e) {
        logger.error('Delete marks failed:', e)
        toast.error(t('control.settings.deleteMarksFail'))
    } finally {
        isDeletingMarks.value = false
        showDeleteMarksConfirm.value = false
    }
}

// --- Tasks Actions ---
async function exportTasks() {
    try {
        const data = await backupService.exportTasks()
        downloadJson(data, 'tasks')
        toast.success(t('control.settings.exportTasksSuccess'))
    } catch (e) {
        logger.error('Export tasks failed:', e)
        toast.error(t('control.settings.exportTasksFail'))
    }
}
function triggerImportTasks() {
    importTasksInput.value?.click()
}
async function handleImportTasks(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.tasks) {
            throw new Error('Invalid Task Data')
        }
        await backupService.importTasks(data)
        toast.success(t('control.settings.importTasksSuccess'))
        await loadSettings()
    } catch (e) {
        logger.error('Import tasks failed:', e)
        toast.error(t('control.settings.importTasksFail'))
    }
    if (event.target) (event.target as HTMLInputElement).value = ''
}
async function handleDeleteTasks() {
    isDeletingTasks.value = true
    try {
        await backupService.clearTasks()
        toast.success(t('control.settings.deleteTasksSuccess'))
        await loadSettings()
    } catch (e) {
        logger.error('Delete tasks failed:', e)
        toast.error(t('control.settings.deleteTasksFail'))
    } finally {
        isDeletingTasks.value = false
        showDeleteTasksConfirm.value = false
    }
}

// --- Summary Export Actions ---
async function handleExportSummaryAs(format: 'csv' | 'docx') {
    const group = summaryGroups.value.find((g) => String(g.id) === selectedSummaryGroupId.value)
    if (!group) {
        toast.error(t('control.settings.summaryExport.noGroup'))
        return
    }

    isSummaryExporting.value = true
    try {
        const modules = await summaryService.getModulesByGroup(group.name)
        const { students } = await summaryService.loadExamData(group, { modules, t: t as any })

        if (students.length === 0) {
            toast.error(t('control.settings.summaryExport.noData'))
            return
        }

        const date = new Date().toISOString().split('T')[0]
        const filename = `summary-${group.name}-${date}`

        if (format === 'csv') {
            const blob = summaryExportService.exportSummaryCsv(students, group.name)
            downloadBlob(blob, `${filename}.csv`)
        } else {
            const blob = summaryExportService.exportSummaryDocx(students, group.name)
            downloadBlob(blob, `${filename}.docx`)
        }

        toast.success(t('control.settings.summaryExport.exportSuccess'))
    } catch (e) {
        logger.error('Summary export failed:', e)
        toast.error(t('control.settings.summaryExport.exportFail'))
    } finally {
        isSummaryExporting.value = false
    }
}

// --- Modules & Summary Actions ---
async function exportModules() {
    try {
        const data = await backupService.exportSummary()
        downloadJson(data, 'modules')
        toast.success(t('control.settings.exportModulesSuccess'))
    } catch (e) {
        logger.error('Export modules failed:', e)
        toast.error(t('control.settings.exportModulesFail'))
    }
}
function triggerImportModules() {
    importModulesInput.value?.click()
}
async function handleImportModules(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importSummary(data)
        toast.success(t('control.settings.importModulesSuccess'))
        await loadSettings()
    } catch (e) {
        logger.error('Import modules failed:', e)
        toast.error(t('control.settings.importModulesFail'))
    }
    if (event.target) (event.target as HTMLInputElement).value = ''
}
async function handleDeleteModules() {
    isDeletingModules.value = true
    try {
        await backupService.clearSummary()
        toast.success(t('control.settings.deleteModulesSuccess'))
        await loadSettings()
    } catch (e) {
        logger.error('Delete modules failed:', e)
        toast.error(t('control.settings.deleteModulesFail'))
    } finally {
        isDeletingModules.value = false
        showDeleteModulesConfirm.value = false
    }
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                {{ $t('control.settings.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {{ $t('control.settings.description') }}
            </p>
        </div>

        <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <!-- Marks Management -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('control.settings.marksTitle') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileBracesCorner class="w-4 h-4 shrink-0" />
                            {{ $t('control.settings.marksDescription') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="exportMarks">
                            <HardDriveDownload class="w-6 h-6" />
                            <span>{{ $t('control.settings.exportMarks') }}</span>
                            <span v-if="marksCount > 0" class="text-xs text-muted-foreground">
                                {{ marksCount }} records ({{ (marksSize / 1024).toFixed(1) }} KB)
                            </span>
                        </Button>
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="triggerImportMarks">
                            <HardDriveUpload class="w-6 h-6" />
                            <span>{{ $t('control.settings.importMarks') }}</span>
                        </Button>
                        <input
                            ref="importMarksInput"
                            type="file"
                            accept=".json"
                            class="hidden"
                            @change="handleImportMarks"
                        />
                    </div>

                    <Separator />

                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Database class="w-4 h-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{ $t('control.settings.storageTitle') }}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Badge
                                            variant="outline"
                                            class="cursor-help px-1.5 py-0 text-xs gap-1 font-normal"
                                        >
                                            <HelpCircle class="w-3 h-3" />
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent align="start" class="max-w-xs">
                                        <p class="font-mono text-xs">
                                            {{
                                                $t('organization.settings.dbBadgeTooltip', {
                                                    name: dbName,
                                                    version: dbVersion,
                                                })
                                            }}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div
                            class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-lg border px-4 py-3 bg-muted/30 gap-4"
                        >
                            <div class="flex gap-6 text-sm justify-between sm:justify-start">
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.storageUsedLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ (marksSize / 1024).toFixed(1) }} KB</span>
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.recordsLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ marksCount }}</span>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                class="gap-1.5 w-full sm:w-auto"
                                :disabled="marksCount === 0"
                                @click="showDeleteMarksConfirm = true"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                {{ $t('common.delete') }}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Tasks Management -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('control.settings.tasksTitle') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileBracesCorner class="w-4 h-4 shrink-0" />
                            {{ $t('control.settings.tasksDescription') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="exportTasks">
                            <HardDriveDownload class="w-6 h-6" />
                            <span>{{ $t('control.settings.exportTasks') }}</span>
                            <span v-if="tasksCount > 0" class="text-xs text-muted-foreground">
                                {{ tasksCount }} records ({{ (tasksSize / 1024).toFixed(1) }} KB)
                            </span>
                        </Button>
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="triggerImportTasks">
                            <HardDriveUpload class="w-6 h-6" />
                            <span>{{ $t('control.settings.importTasks') }}</span>
                        </Button>
                        <input
                            ref="importTasksInput"
                            type="file"
                            accept=".json"
                            class="hidden"
                            @change="handleImportTasks"
                        />
                    </div>

                    <Separator />

                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Database class="w-4 h-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{ $t('control.settings.storageTitle') }}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Badge
                                            variant="outline"
                                            class="cursor-help px-1.5 py-0 text-xs gap-1 font-normal"
                                        >
                                            <HelpCircle class="w-3 h-3" />
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent align="start" class="max-w-xs">
                                        <p class="font-mono text-xs">
                                            {{
                                                $t('organization.settings.dbBadgeTooltip', {
                                                    name: dbName,
                                                    version: dbVersion,
                                                })
                                            }}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div
                            class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-lg border px-4 py-3 bg-muted/30 gap-4"
                        >
                            <div class="flex gap-6 text-sm justify-between sm:justify-start">
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.storageUsedLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ (tasksSize / 1024).toFixed(1) }} KB</span>
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.recordsLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ tasksCount }}</span>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                class="gap-1.5 w-full sm:w-auto"
                                :disabled="tasksCount === 0"
                                @click="showDeleteTasksConfirm = true"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                {{ $t('common.delete') }}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Modules Management -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('control.settings.modulesTitle') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileBracesCorner class="w-4 h-4 shrink-0" />
                            {{ $t('control.settings.modulesDescription') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="exportModules">
                            <HardDriveDownload class="w-6 h-6" />
                            <span>{{ $t('control.settings.exportModules') }}</span>
                            <span
                                v-if="modulesCount + finalAssessmentsCount + unitsCount > 0"
                                class="text-xs text-muted-foreground"
                            >
                                {{ modulesCount + finalAssessmentsCount + unitsCount }} records ({{
                                    (summarySize / 1024).toFixed(1)
                                }}
                                KB)
                            </span>
                        </Button>
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="triggerImportModules">
                            <HardDriveUpload class="w-6 h-6" />
                            <span>{{ $t('control.settings.importModules') }}</span>
                        </Button>
                        <input
                            ref="importModulesInput"
                            type="file"
                            accept=".json"
                            class="hidden"
                            @change="handleImportModules"
                        />
                    </div>

                    <Separator />

                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Database class="w-4 h-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{ $t('control.settings.storageTitle') }}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger as-child>
                                        <Badge
                                            variant="outline"
                                            class="cursor-help px-1.5 py-0 text-xs gap-1 font-normal"
                                        >
                                            <HelpCircle class="w-3 h-3" />
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent align="start" class="max-w-xs">
                                        <p class="font-mono text-xs">
                                            {{
                                                $t('organization.settings.dbBadgeTooltip', {
                                                    name: dbName,
                                                    version: dbVersion,
                                                })
                                            }}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div
                            class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-lg border px-4 py-3 bg-muted/30 gap-4"
                        >
                            <div class="flex gap-6 text-sm justify-between sm:justify-start">
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.storageUsedLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums"
                                        >{{ (summarySize / 1024).toFixed(1) }} KB</span
                                    >
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.recordsLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{
                                        modulesCount + finalAssessmentsCount + unitsCount
                                    }}</span>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                class="gap-1.5 w-full sm:w-auto"
                                :disabled="modulesCount + finalAssessmentsCount + unitsCount === 0"
                                @click="showDeleteModulesConfirm = true"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                {{ $t('common.delete') }}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <!-- Summary Export -->
            <Card class="lg:col-span-2">
                <CardHeader>
                    <CardTitle>{{ $t('control.settings.summaryExport.title') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileText class="w-4 h-4 shrink-0" />
                            {{ $t('control.settings.summaryExport.description') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <Select v-model="selectedSummaryGroupId" class="w-full sm:w-[240px]">
                            <SelectTrigger class="w-full sm:w-[240px]">
                                <SelectValue :placeholder="$t('control.settings.summaryExport.selectGroup')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="group in summaryGroups" :key="group.id" :value="String(group.id)">
                                    {{ group.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <div class="flex w-full gap-3 sm:w-auto">
                            <Button
                                variant="outline"
                                class="flex-1 gap-2"
                                :disabled="!selectedSummaryGroupId || isSummaryExporting"
                                @click="handleExportSummaryAs('csv')"
                            >
                                <FileSpreadsheet class="w-4 h-4 shrink-0" />
                                <span class="truncate">{{ $t('control.settings.summaryExport.exportCsv') }}</span>
                            </Button>
                            <Button
                                variant="outline"
                                class="flex-1 gap-2"
                                :disabled="!selectedSummaryGroupId || isSummaryExporting"
                                @click="handleExportSummaryAs('docx')"
                            >
                                <FileText class="w-4 h-4 shrink-0" />
                                <span class="truncate">{{ $t('control.settings.summaryExport.exportDocx') }}</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>

    <!-- Marks Delete Dialog -->
    <AlertDialog :open="showDeleteMarksConfirm" @update:open="showDeleteMarksConfirm = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('control.settings.deleteMarksConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('control.settings.deleteMarksConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingMarks">
                    {{ $t('common.cancel', 'Cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingMarks"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteMarks"
                >
                    {{ isDeletingMarks ? '...' : $t('common.clear') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <!-- Tasks Delete Dialog -->
    <AlertDialog :open="showDeleteTasksConfirm" @update:open="showDeleteTasksConfirm = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('control.settings.deleteTasksConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('control.settings.deleteTasksConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingTasks">
                    {{ $t('common.cancel', 'Cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingTasks"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteTasks"
                >
                    {{ isDeletingTasks ? '...' : $t('common.clear') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <!-- Modules Delete Dialog -->
    <AlertDialog :open="showDeleteModulesConfirm" @update:open="showDeleteModulesConfirm = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('control.settings.deleteModulesConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('control.settings.deleteModulesConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingModules">
                    {{ $t('common.cancel', 'Cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingModules"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteModules"
                >
                    {{ isDeletingModules ? '...' : $t('common.clear') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
