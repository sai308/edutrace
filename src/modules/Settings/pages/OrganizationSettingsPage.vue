<script setup lang="ts">
import {
    Database,
    FileBracesCorner,
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
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logger } from '@/shared/lib/logger'
import * as backupService from '@/shared/services/backup.service'
import { databaseService, DB_VERSION } from '@/shared/services/DatabaseService'
import * as statsService from '@/shared/services/stats.service'
import { toast } from '@/shared/services/toast'
import { downloadJson } from '@/shared/utils/download'

const { t } = useI18n()

// Data Settings
const studentsInput = ref<HTMLInputElement | null>(null)
const groupsInput = ref<HTMLInputElement | null>(null)

const studentsCount = ref(0)
const studentsSize = ref(0)
const groupsCount = ref(0)
const groupsSize = ref(0)

// DB Info (shared — same DB for all entities)
const dbName = ref('')
const dbVersion = ref(DB_VERSION)

// Delete confirm state
const showDeleteStudents = ref(false)
const isDeletingStudents = ref(false)
const showDeleteGroups = ref(false)
const isDeletingGroups = ref(false)

onMounted(async () => {
    await loadStats()
})

async function loadStats() {
    const counts = await statsService.getEntityCounts()
    studentsCount.value = counts.members
    groupsCount.value = counts.groups

    const sizes = await statsService.getEntitySizes()
    studentsSize.value = sizes.members
    groupsSize.value = sizes.groups

    dbName.value = databaseService.getCurrentDbName()
}

// Students Actions
async function exportStudents() {
    try {
        const data = await backupService.exportMembers()
        downloadJson(data, 'students')
        toast.success(t('organization.settings.students.exportSuccess'))
    } catch (e) {
        logger.error('Export failed:', e)
        toast.error(t('organization.settings.students.exportFail'))
    }
}

function triggerStudentsImport() {
    studentsInput.value?.click()
}

async function handleStudentsImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importMembers(data)
        toast.success(t('organization.settings.students.importSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Import failed:', e)
        toast.error(t('organization.settings.students.importFail'))
    }

    if (event.target) {
        ;(event.target as HTMLInputElement).value = ''
    }
}

async function handleDeleteStudents() {
    isDeletingStudents.value = true
    try {
        await backupService.clearMembers()
        toast.success(t('organization.settings.students.deleteSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Delete failed:', e)
        toast.error(t('organization.settings.students.deleteFail'))
    } finally {
        isDeletingStudents.value = false
        showDeleteStudents.value = false
    }
}

// Groups Actions
async function exportGroups() {
    try {
        const data = await backupService.exportGroups()
        downloadJson(data, 'groups')
        toast.success(t('organization.settings.groups.exportSuccess'))
    } catch (e) {
        logger.error('Export failed:', e)
        toast.error(t('organization.settings.groups.exportFail'))
    }
}

function triggerGroupsImport() {
    groupsInput.value?.click()
}

async function handleGroupsImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importGroups(data)
        toast.success(t('organization.settings.groups.importSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Import failed:', e)
        toast.error(t('organization.settings.groups.importFail'))
    }

    if (event.target) {
        ;(event.target as HTMLInputElement).value = ''
    }
}

async function handleDeleteGroups() {
    isDeletingGroups.value = true
    try {
        await backupService.clearGroups()
        toast.success(t('organization.settings.groups.deleteSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Delete failed:', e)
        toast.error(t('organization.settings.groups.deleteFail'))
    } finally {
        isDeletingGroups.value = false
        showDeleteGroups.value = false
    }
}
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                {{ $t('organization.settings.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {{ $t('organization.settings.description') }}
            </p>
        </div>

        <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <!-- Students Data Management -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('organization.settings.students.title') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileBracesCorner class="w-4 h-4 shrink-0" />
                            {{ $t('organization.settings.students.description') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <!-- Export / Import -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            class="h-24 flex flex-col gap-2"
                            @click="exportStudents"
                        >
                            <HardDriveDownload class="w-6 h-6" />
                            <span>{{ $t('organization.settings.students.export') }}</span>
                            <span v-if="studentsCount > 0" class="text-xs text-muted-foreground">
                                {{ studentsCount }}
                                {{ $t('organization.settings.recordsUnit') }} ({{
                                    (studentsSize / 1024).toFixed(1)
                                }}
                                KB)
                            </span>
                        </Button>
                        <Button
                            variant="outline"
                            class="h-24 flex flex-col gap-2"
                            @click="triggerStudentsImport"
                        >
                            <HardDriveUpload class="w-6 h-6" />
                            <span>{{ $t('organization.settings.students.import') }}</span>
                        </Button>
                        <input
                            ref="studentsInput"
                            type="file"
                            accept=".json"
                            class="hidden"
                            @change="handleStudentsImport"
                        />
                    </div>

                    <Separator />

                    <!-- Storage Management -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Database class="w-4 h-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{
                                $t('organization.settings.storageTitle')
                            }}</span>
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
                                        >{{ (studentsSize / 1024).toFixed(1) }} KB</span
                                    >
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.recordsLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{
                                        studentsCount
                                    }}</span>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                class="gap-1.5 w-full sm:w-auto"
                                :disabled="studentsCount === 0"
                                @click="showDeleteStudents = true"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                {{ $t('organization.settings.students.delete') }}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Groups Data Management -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('organization.settings.groups.title') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileBracesCorner class="w-4 h-4 shrink-0" />
                            {{ $t('organization.settings.groups.description') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <!-- Export / Import -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            class="h-24 flex flex-col gap-2"
                            @click="exportGroups"
                        >
                            <HardDriveDownload class="w-6 h-6" />
                            <span>{{ $t('organization.settings.groups.export') }}</span>
                            <span v-if="groupsCount > 0" class="text-xs text-muted-foreground">
                                {{ groupsCount }} {{ $t('organization.settings.recordsUnit') }} ({{
                                    (groupsSize / 1024).toFixed(1)
                                }}
                                KB)
                            </span>
                        </Button>
                        <Button
                            variant="outline"
                            class="h-24 flex flex-col gap-2"
                            @click="triggerGroupsImport"
                        >
                            <HardDriveUpload class="w-6 h-6" />
                            <span>{{ $t('organization.settings.groups.import') }}</span>
                        </Button>
                        <input
                            ref="groupsInput"
                            type="file"
                            accept=".json"
                            class="hidden"
                            @change="handleGroupsImport"
                        />
                    </div>

                    <Separator />

                    <!-- Storage Management -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Database class="w-4 h-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{
                                $t('organization.settings.storageTitle')
                            }}</span>
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
                                        >{{ (groupsSize / 1024).toFixed(1) }} KB</span
                                    >
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('organization.settings.recordsLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ groupsCount }}</span>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                class="gap-1.5 w-full sm:w-auto"
                                :disabled="groupsCount === 0"
                                @click="showDeleteGroups = true"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                {{ $t('organization.settings.groups.delete') }}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>

    <!-- Delete Students Confirmation -->
    <AlertDialog :open="showDeleteStudents" @update:open="showDeleteStudents = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('organization.settings.students.deleteConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('organization.settings.students.deleteConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingStudents">
                    {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingStudents"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteStudents"
                >
                    {{
                        isDeletingStudents
                            ? '...'
                            : $t('organization.settings.students.deleteConfirmBtn')
                    }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Groups Confirmation -->
    <AlertDialog :open="showDeleteGroups" @update:open="showDeleteGroups = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('organization.settings.groups.deleteConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('organization.settings.groups.deleteConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingGroups">
                    {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingGroups"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteGroups"
                >
                    {{
                        isDeletingGroups
                            ? '...'
                            : $t('organization.settings.groups.deleteConfirmBtn')
                    }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
