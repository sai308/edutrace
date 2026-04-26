<script setup lang="ts">
import { Database, FileBracesCorner, HardDriveDownload, HardDriveUpload, HelpCircle, Trash2 } from 'lucide-vue-next'
import { onMounted, ref, watch } from 'vue'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logger } from '@/shared/lib/logger'
import * as backupService from '@/shared/services/backup.service'
import { databaseService, DB_VERSION } from '@/shared/services/DatabaseService'
import { settingsRepository } from '@/shared/services/settings.repository'
import * as statsService from '@/shared/services/stats.service'
import { toast } from '@/shared/services/toast'
import { downloadJson } from '@/shared/utils/download'

const { t } = useI18n()

// Parsing Settings
const durationLimit = ref(0)
const isSquashEnabled = ref(false)
const sessionSquashThreshold = ref(10)
const reportsCount = ref(0)
const reportsSize = ref(0)

// Storage Management
const dbName = ref('')
const dbVersion = ref(DB_VERSION)
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

// Data Settings
const importInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
    await loadSettings()
})

async function loadSettings() {
    durationLimit.value = await settingsRepository.getDurationLimit()
    isSquashEnabled.value = !!(await settingsRepository.getSessionSquash())
    sessionSquashThreshold.value = await settingsRepository.getSessionSquashThreshold()

    // Load counts
    const counts = await statsService.getEntityCounts()
    reportsCount.value = counts.reports
    const sizes = await statsService.getEntitySizes()
    reportsSize.value = sizes.reports

    // Load DB info
    dbName.value = databaseService.getCurrentDbName()
}

async function saveDurationLimit() {
    await settingsRepository.saveDurationLimit(durationLimit.value)
    toast.success(t('reports.settings.durationSaved'))
}

watch(isSquashEnabled, async (val) => {
    await settingsRepository.saveSessionSquash(val)
})

async function saveSessionSquashThreshold() {
    await settingsRepository.saveSessionSquashThreshold(sessionSquashThreshold.value)
    toast.success(t('reports.settings.squashSaved'))
}

// Data Actions
async function exportReports() {
    try {
        const data = await backupService.exportReports()
        downloadJson(data, 'reports')
        toast.success(t('reports.settings.exportSuccess'))
    }
    catch (e) {
        logger.error('Export failed:', e)
        toast.error(t('reports.settings.exportFail'))
    }
}

function triggerImport() {
    importInput.value?.click()
}

async function handleImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file)
        return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importReports(data)
        toast.success(t('reports.settings.importSuccess'))

        // Refresh counts
        await loadSettings()
    }
    catch (e) {
        logger.error('Import failed:', e)
        toast.error(t('reports.settings.importFail'))
    }

    // Reset input
    if (event.target) {
        ;(event.target as HTMLInputElement).value = ''
    }
}

// Storage Management Actions
async function handleDeleteReports() {
    isDeleting.value = true
    try {
        await backupService.clearReports()
        toast.success(t('reports.settings.deleteSuccess'))
        await loadSettings()
    }
    catch (e) {
        logger.error('Delete failed:', e)
        toast.error(t('reports.settings.deleteFail'))
    }
    finally {
        isDeleting.value = false
        showDeleteConfirm.value = false
    }
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                {{ $t('reports.settings.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {{ $t('reports.settings.description') }}
            </p>
        </div>

        <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <!-- Parsing Settings -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('reports.settings.parsingTitle') }}</CardTitle>
                    <CardDescription>
                        {{ $t('reports.settings.parsingDescription') }}
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4 md:space-y-6">
                    <!-- Duration Limit -->
                    <div class="space-y-2">
                        <Label for="duration-limit">{{ $t('reports.settings.durationLimitLabel') }}</Label>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <Input
                                id="duration-limit"
                                v-model.number="durationLimit"
                                type="number"
                                min="0"
                                placeholder="e.g. 75"
                                class="w-full sm:w-24 sm:shrink-0"
                            />
                            <Button variant="secondary" class="sm:flex-none" @click="saveDurationLimit">
                                {{ $t('reports.settings.saveBtn') }}
                            </Button>
                        </div>
                        <p class="text-[0.8rem] text-muted-foreground">
                            {{ $t('reports.settings.durationLimitHelp') }}
                        </p>
                    </div>

                    <Separator />

                    <!-- Session Squash -->
                    <div class="flex items-center justify-between space-x-2">
                        <div class="space-y-0.5">
                            <Label class="text-base">{{ $t('reports.settings.squashLabel') }}</Label>
                            <p class="text-[0.8rem] text-muted-foreground">
                                {{ $t('reports.settings.squashHelp') }}
                            </p>
                        </div>
                        <Switch v-model="isSquashEnabled" />
                    </div>

                    <div
                        class="space-y-2 pt-2 animate-in slide-in-from-top-2"
                        :class="{ 'opacity-50': !isSquashEnabled }"
                    >
                        <Label for="squash-threshold">{{ $t('reports.settings.squashThresholdLabel') }}</Label>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <Input
                                id="squash-threshold"
                                v-model.number="sessionSquashThreshold"
                                type="number"
                                min="1"
                                max="60"
                                :disabled="!isSquashEnabled"
                                class="w-full sm:w-24 sm:shrink-0"
                            />
                            <Button
                                variant="secondary"
                                :disabled="!isSquashEnabled"
                                class="sm:flex-none"
                                @click="saveSessionSquashThreshold"
                            >
                                {{ $t('reports.settings.saveBtn') }}
                            </Button>
                        </div>
                        <p class="text-[0.8rem] text-muted-foreground">
                            {{ $t('reports.settings.squashThresholdHelp') }}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <!-- Data Actions -->
            <Card>
                <CardHeader>
                    <CardTitle>{{ $t('reports.settings.dataTitle') }}</CardTitle>
                    <CardDescription>
                        <div class="flex items-center gap-2 mt-2">
                            <FileBracesCorner class="w-4 h-4 shrink-0" />
                            {{ $t('reports.settings.dataDescription') }}
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <!-- Export / Import -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="exportReports">
                            <HardDriveDownload class="w-6 h-6" />
                            <span>{{ $t('reports.settings.exportReports') }}</span>
                            <span v-if="reportsCount > 0" class="text-xs text-muted-foreground">
                                {{
                                    $t('reports.settings.recordsAndSize', {
                                        count: reportsCount,
                                        size: (reportsSize / 1024).toFixed(1),
                                    })
                                }}
                            </span>
                        </Button>
                        <Button variant="outline" class="h-24 flex flex-col gap-2" @click="triggerImport">
                            <HardDriveUpload class="w-6 h-6" />
                            <span>{{ $t('reports.settings.importReports') }}</span>
                        </Button>
                        <input ref="importInput" type="file" accept=".json" class="hidden" @change="handleImport">
                    </div>

                    <Separator />

                    <!-- Storage Management -->
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <Database class="w-4 h-4 text-muted-foreground" />
                            <span class="text-sm font-medium">{{ $t('reports.settings.storageTitle') }}</span>
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
                                                $t('reports.settings.dbBadgeTooltip', {
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
                                        $t('reports.settings.storageUsedLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ (reportsSize / 1024).toFixed(1) }} KB</span>
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('reports.settings.recordsLabel')
                                    }}</span>
                                    <span class="font-medium tabular-nums">{{ reportsCount }}</span>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                class="gap-1.5 w-full sm:w-auto"
                                :disabled="reportsCount === 0"
                                @click="showDeleteConfirm = true"
                            >
                                <Trash2 class="w-3.5 h-3.5" />
                                {{ $t('reports.settings.deleteReports') }}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{{ $t('reports.settings.deleteConfirmTitle') }}</AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('reports.settings.deleteConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeleting">
                    {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeleting"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteReports"
                >
                    {{ isDeleting ? '...' : $t('reports.settings.deleteConfirmBtn') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
