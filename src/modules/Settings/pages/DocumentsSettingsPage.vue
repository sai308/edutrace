<script setup lang="ts">
import type { PrintSettings } from '@/shared/types/Settings'
import {
    Database,
    Download,
    Eye,
    FileBracesCorner,
    FileText,
    HardDriveDownload,
    HardDriveUpload,
    HelpCircle,
    Printer,
    Save,
    Trash2,
    UploadCloud,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
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
import { NumberInput } from '@/components/ui/custom/number-input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { generateTemplateBlob } from '@/modules/Sessions/services/templateGenerator'
import DocxViewer from '@/modules/Settings/components/DocxViewer.vue'
import { logger } from '@/shared/lib/logger'
import * as backupService from '@/shared/services/backup.service'
import { databaseService, DB_VERSION } from '@/shared/services/DatabaseService'
import { opfs } from '@/shared/services/opfs'
import { settingsRepository } from '@/shared/services/settings.repository'
import * as statsService from '@/shared/services/stats.service'
import { toast } from '@/shared/services/toast'
import { downloadBlob, downloadJson } from '@/shared/utils/download'

const { t } = useI18n()

// Data Settings
const sessionsInput = ref<HTMLInputElement | null>(null)
const plansInput = ref<HTMLInputElement | null>(null)

const sessionsCount = ref(0)
const sessionsSize = ref(0)
const plansCount = ref(0)
const plansSize = ref(0)

const printSettings = ref<PrintSettings>({
    subject: '',
    formOfControl: '',
    semester: '',
    academicYear: '',
    totalHours: 0,
    examiner: '',
    practicalTeacher: '',
})
const isSavingPrint = ref(false)

const teacherSuggestions = ref<string[]>([])
const showExaminerSuggestions = ref(false)
const showPracticalSuggestions = ref(false)

// DB Info
const dbName = ref('')
const dbVersion = ref(DB_VERSION)

// Delete confirm state
const showDeleteSessions = ref(false)
const isDeletingSessions = ref(false)
const showDeletePlans = ref(false)
const isDeletingPlans = ref(false)

// Template logic
const templateInput = ref<HTMLInputElement | null>(null)
const hasCustomTemplate = ref(false)
const isUploadingTemplate = ref(false)

const showPreviewDialog = ref(false)
const previewBlob = ref<Blob | null>(null)

onMounted(async () => {
    await Promise.all([
        loadStats(),
        loadPrintSettings(),
        loadTeacherSuggestions(),
        loadTemplateStatus(),
    ])
})

async function loadTemplateStatus() {
    try {
        hasCustomTemplate.value = await opfs.fileExists('templates', 'print_template.docx')
    } catch {
        hasCustomTemplate.value = false
    }
}

async function loadTeacherSuggestions() {
    try {
        teacherSuggestions.value = (await settingsRepository.getTeachers()).slice().sort()
    } catch (e) {
        logger.error('Failed to load teacher suggestions:', e)
    }
}

async function loadStats() {
    const counts = await statsService.getEntityCounts()
    sessionsCount.value = counts.documentSessions
    plansCount.value = counts.plans

    const sizes = await statsService.getEntitySizes()
    sessionsSize.value = sizes.documentSessions
    plansSize.value = sizes.plans

    dbName.value = databaseService.getCurrentDbName()
}

async function loadPrintSettings() {
    const settings = await settingsRepository.getPrintSettings()
    printSettings.value = { ...printSettings.value, ...settings }

    // Auto estimate academic year if not set
    if (!printSettings.value.academicYear) {
        updateAcademicYear()
    }
}

function updateAcademicYear() {
    const today = new Date()
    const year = today.getFullYear()
    printSettings.value.academicYear =
        today.getMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

const filteredExaminerSuggestions = computed(() => {
    const text = printSettings.value.examiner || ''
    if (!text) return teacherSuggestions.value.slice(0, 8)
    return teacherSuggestions.value
        .filter((t) => t.toLowerCase().includes(text.toLowerCase()))
        .slice(0, 8)
})

const filteredPracticalSuggestions = computed(() => {
    const text = printSettings.value.practicalTeacher || ''
    if (!text) return teacherSuggestions.value.slice(0, 8)
    return teacherSuggestions.value
        .filter((t) => t.toLowerCase().includes(text.toLowerCase()))
        .slice(0, 8)
})

function hideSuggestions() {
    setTimeout(() => {
        showExaminerSuggestions.value = false
        showPracticalSuggestions.value = false
    }, 150)
}

function handleDownloadStarterTemplate() {
    const blob = generateTemplateBlob()
    downloadBlob(blob, 'session-template-starter.docx')
    toast.success(t('documents.settings.print.downloadTemplateSuccess'))
}

async function savePrintSettings() {
    isSavingPrint.value = true
    try {
        await settingsRepository.savePrintSettings(printSettings.value)
        toast.success(t('documents.settings.print.saveSuccess'))
    } catch (e) {
        logger.error('Save failed:', e)
        toast.error(t('documents.settings.print.saveError'))
    } finally {
        isSavingPrint.value = false
    }
}

// Template Actions
function triggerTemplateUpload() {
    templateInput.value?.click()
}

async function handleTemplateUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    isUploadingTemplate.value = true
    try {
        await opfs.saveFile('templates', 'print_template.docx', file)
        hasCustomTemplate.value = true
        toast.success(t('documents.settings.print.templateUploadSuccess'))
    } catch (e) {
        logger.error('Template upload failed:', e)
        toast.error(t('documents.settings.print.templateUploadFail'))
    } finally {
        isUploadingTemplate.value = false
        if (event.target) {
            ;(event.target as HTMLInputElement).value = ''
        }
    }
}

async function removeCustomTemplate() {
    try {
        await opfs.deleteFile('templates', 'print_template.docx')
        hasCustomTemplate.value = false
        toast.success(t('documents.settings.print.templateRemoveSuccess'))
    } catch (e) {
        logger.error('Template removal failed:', e)
        toast.error(t('documents.settings.print.templateRemoveFail'))
    }
}

async function previewTemplate() {
    try {
        const file = await opfs.getFile('templates', 'print_template.docx')
        previewBlob.value = file
        showPreviewDialog.value = true
    } catch {
        toast.error(
            t('documents.settings.print.templatePreviewFail', 'Failed to load template preview'),
        )
    }
}

// Sessions Actions
async function exportSessions() {
    try {
        const data = await backupService.exportDocumentSessions()
        downloadJson(data, 'sessions')
        toast.success(t('documents.settings.sessions.exportSuccess'))
    } catch (e) {
        logger.error('Export failed:', e)
        toast.error(t('documents.settings.sessions.exportFail'))
    }
}

function triggerSessionsImport() {
    sessionsInput.value?.click()
}

async function handleSessionsImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importDocumentSessions(data)
        toast.success(t('documents.settings.sessions.importSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Import failed:', e)
        toast.error(t('documents.settings.sessions.importFail'))
    }

    if (event.target) {
        ;(event.target as HTMLInputElement).value = ''
    }
}

async function handleDeleteSessions() {
    isDeletingSessions.value = true
    try {
        await backupService.clearSessions()
        toast.success(t('documents.settings.sessions.deleteSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Delete failed:', e)
        toast.error(t('documents.settings.sessions.deleteFail'))
    } finally {
        isDeletingSessions.value = false
        showDeleteSessions.value = false
    }
}

// Plans Actions
async function exportPlans() {
    try {
        const data = await backupService.exportPlans()
        downloadJson(data, 'plans')
        toast.success(t('documents.settings.plans.exportSuccess'))
    } catch (e) {
        logger.error('Export failed:', e)
        toast.error(t('documents.settings.plans.exportFail'))
    }
}

function triggerPlansImport() {
    plansInput.value?.click()
}

async function handlePlansImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
        const text = await file.text()
        const data = JSON.parse(text)
        await backupService.importPlans(data)
        toast.success(t('documents.settings.plans.importSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Import failed:', e)
        toast.error(t('documents.settings.plans.importFail'))
    }

    if (event.target) {
        ;(event.target as HTMLInputElement).value = ''
    }
}

async function handleDeletePlans() {
    isDeletingPlans.value = true
    try {
        await backupService.clearPlans()
        toast.success(t('documents.settings.plans.deleteSuccess'))
        await loadStats()
    } catch (e) {
        logger.error('Delete failed:', e)
        toast.error(t('documents.settings.plans.deleteFail'))
    } finally {
        isDeletingPlans.value = false
        showDeletePlans.value = false
    }
}
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 text-foreground"
    >
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                {{ $t('documents.settings.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {{ $t('documents.settings.description') }}
            </p>
        </div>

        <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <!-- Data Management Section -->
            <div class="space-y-6">
                <!-- Sessions Data Management -->
                <Card>
                    <CardHeader>
                        <CardTitle>{{ $t('documents.settings.sessions.title') }}</CardTitle>
                        <CardDescription>
                            <div class="flex items-center gap-2 mt-2">
                                <FileBracesCorner class="w-4 h-4 shrink-0" />
                                {{ $t('documents.settings.sessions.description') }}
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                class="min-h-[5.5rem] h-auto py-3 flex flex-col gap-2"
                                @click="exportSessions"
                            >
                                <HardDriveDownload class="w-6 h-6" />
                                <span>{{ $t('documents.settings.sessions.export') }}</span>
                                <span
                                    v-if="sessionsCount > 0"
                                    class="text-xs text-muted-foreground"
                                >
                                    {{ sessionsCount }}
                                    {{ $t('organization.settings.recordsUnit') }} ({{
                                        (sessionsSize / 1024).toFixed(1)
                                    }}
                                    KB)
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                class="min-h-[5.5rem] h-auto py-3 flex flex-col gap-2"
                                @click="triggerSessionsImport"
                            >
                                <HardDriveUpload class="w-6 h-6" />
                                <span>{{ $t('documents.settings.sessions.import') }}</span>
                            </Button>
                            <input
                                ref="sessionsInput"
                                type="file"
                                accept=".json"
                                class="hidden"
                                @change="handleSessionsImport"
                            />
                        </div>

                        <Separator />

                        <div class="space-y-3">
                            <div class="flex items-center gap-2">
                                <Database class="w-4 h-4 text-muted-foreground" />
                                <span class="text-sm font-medium">{{
                                    $t('documents.settings.storageTitle')
                                }}</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger as-child>
                                            <Badge
                                                variant="outline"
                                                class="cursor-help px-1.5 py-0 text-xs gap-1 font-normal text-muted-foreground"
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
                                            >{{ (sessionsSize / 1024).toFixed(1) }} KB</span
                                        >
                                    </div>
                                    <div class="flex flex-col gap-0.5">
                                        <span class="text-xs text-muted-foreground">{{
                                            $t('organization.settings.recordsLabel')
                                        }}</span>
                                        <span class="font-medium tabular-nums">{{
                                            sessionsCount
                                        }}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    class="gap-1.5 w-full sm:w-auto"
                                    :disabled="sessionsCount === 0"
                                    @click="showDeleteSessions = true"
                                >
                                    <Trash2 class="w-3.5 h-3.5" />
                                    {{ $t('documents.settings.sessions.delete') }}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plans Data Management -->
                <Card>
                    <CardHeader>
                        <CardTitle>{{ $t('documents.settings.plans.title') }}</CardTitle>
                        <CardDescription>
                            <div class="flex items-center gap-2 mt-2">
                                <FileBracesCorner class="w-4 h-4 shrink-0" />
                                {{ $t('documents.settings.plans.description') }}
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                class="min-h-[5.5rem] h-auto py-3 flex flex-col gap-2"
                                @click="exportPlans"
                            >
                                <HardDriveDownload class="w-6 h-6" />
                                <span>{{ $t('documents.settings.plans.export') }}</span>
                                <span v-if="plansCount > 0" class="text-xs text-muted-foreground">
                                    {{ plansCount }}
                                    {{ $t('organization.settings.recordsUnit') }} ({{
                                        (plansSize / 1024).toFixed(1)
                                    }}
                                    KB)
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                class="min-h-[5.5rem] h-auto py-3 flex flex-col gap-2"
                                @click="triggerPlansImport"
                            >
                                <HardDriveUpload class="w-6 h-6" />
                                <span>{{ $t('documents.settings.plans.import') }}</span>
                            </Button>
                            <input
                                ref="plansInput"
                                type="file"
                                accept=".json"
                                class="hidden"
                                @change="handlePlansImport"
                            />
                        </div>

                        <Separator />

                        <div class="space-y-3">
                            <div class="flex items-center gap-2">
                                <Database class="w-4 h-4 text-muted-foreground" />
                                <span class="text-sm font-medium">{{
                                    $t('documents.settings.storageTitle')
                                }}</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger as-child>
                                            <Badge
                                                variant="outline"
                                                class="cursor-help px-1.5 py-0 text-xs gap-1 font-normal text-muted-foreground"
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
                                            >{{ (plansSize / 1024).toFixed(1) }} KB</span
                                        >
                                    </div>
                                    <div class="flex flex-col gap-0.5">
                                        <span class="text-xs text-muted-foreground">{{
                                            $t('organization.settings.recordsLabel')
                                        }}</span>
                                        <span class="font-medium tabular-nums">{{
                                            plansCount
                                        }}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    class="gap-1.5 w-full sm:w-auto"
                                    :disabled="plansCount === 0"
                                    @click="showDeletePlans = true"
                                >
                                    <Trash2 class="w-3.5 h-3.5" />
                                    {{ $t('documents.settings.plans.delete') }}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Print Defaults Section -->
            <div>
                <Card class="h-full">
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <Printer class="w-5 h-5" />
                            {{ $t('documents.settings.print.title') }}
                        </CardTitle>
                        <CardDescription>
                            {{ $t('documents.settings.print.description') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="grid gap-6">
                            <div class="grid gap-2">
                                <Label for="subject" class="text-sm font-semibold">{{
                                    $t('documents.settings.print.subject')
                                }}</Label>
                                <Input
                                    id="subject"
                                    v-model="printSettings.subject"
                                    class="bg-background/50"
                                />
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                <div class="grid gap-2">
                                    <Label class="text-sm font-semibold">{{
                                        $t('documents.settings.print.formOfControl')
                                    }}</Label>
                                    <Select v-model="printSettings.formOfControl">
                                        <SelectTrigger
                                            class="w-full bg-background/50 min-w-[120px]"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                :value="$t('sessions.printDialog.forms.exam')"
                                            >
                                                {{ $t('sessions.printDialog.forms.exam') }}
                                            </SelectItem>
                                            <SelectItem
                                                :value="$t('sessions.printDialog.forms.credit')"
                                            >
                                                {{ $t('sessions.printDialog.forms.credit') }}
                                            </SelectItem>
                                            <SelectItem
                                                :value="$t('sessions.printDialog.forms.diffCredit')"
                                            >
                                                {{
                                                    $t('sessions.printDialog.forms.diffCreditShort')
                                                }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="grid gap-2">
                                    <Label class="text-sm font-semibold">{{
                                        $t('documents.settings.print.semester')
                                    }}</Label>
                                    <Select v-model="printSettings.semester">
                                        <SelectTrigger
                                            class="w-full bg-background/50 min-w-[140px]"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="s in 8"
                                                :key="s"
                                                :value="s.toString()"
                                            >
                                                {{ s }}
                                                {{ $t('documents.settings.print.semesterSuffix') }}
                                                ({{ Math.ceil(s / 2) }}
                                                {{ $t('documents.settings.print.courseUnit') }})
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="grid gap-2">
                                    <Label for="totalHours" class="text-sm font-semibold">{{
                                        $t('documents.settings.print.totalHours')
                                    }}</Label>
                                    <NumberInput
                                        id="totalHours"
                                        v-model="printSettings.totalHours"
                                        :min="0"
                                        variant="vertical"
                                        class="w-full bg-background/50 h-10"
                                    />
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="grid gap-2 relative">
                                    <Label for="examiner" class="text-sm font-semibold">{{
                                        $t('documents.settings.print.examiner')
                                    }}</Label>
                                    <Input
                                        id="examiner"
                                        v-model="printSettings.examiner"
                                        class="bg-background/50"
                                        @focus="showExaminerSuggestions = true"
                                        @blur="hideSuggestions"
                                    />
                                    <div
                                        v-if="
                                            showExaminerSuggestions &&
                                            filteredExaminerSuggestions.length > 0
                                        "
                                        class="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto"
                                    >
                                        <button
                                            v-for="suggestion in filteredExaminerSuggestions"
                                            :key="suggestion"
                                            class="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                            @mousedown.prevent="
                                                printSettings.examiner = suggestion
                                                showExaminerSuggestions = false
                                            "
                                        >
                                            {{ suggestion }}
                                        </button>
                                    </div>
                                </div>
                                <div class="grid gap-2 relative">
                                    <Label for="practicalTeacher" class="text-sm font-semibold">{{
                                        $t('documents.settings.print.practicalTeacher')
                                    }}</Label>
                                    <Input
                                        id="practicalTeacher"
                                        v-model="printSettings.practicalTeacher"
                                        class="bg-background/50"
                                        @focus="showPracticalSuggestions = true"
                                        @blur="hideSuggestions"
                                    />
                                    <div
                                        v-if="
                                            showPracticalSuggestions &&
                                            filteredPracticalSuggestions.length > 0
                                        "
                                        class="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto"
                                    >
                                        <button
                                            v-for="suggestion in filteredPracticalSuggestions"
                                            :key="suggestion"
                                            class="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                            @mousedown.prevent="
                                                printSettings.practicalTeacher = suggestion
                                                showPracticalSuggestions = false
                                            "
                                        >
                                            {{ suggestion }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator class="my-4 opacity-50" />

                        <div class="space-y-4">
                            <div>
                                <h3 class="text-sm font-semibold flex items-center gap-2">
                                    <FileText class="w-4 h-4 text-muted-foreground shrink-0" />
                                    {{ $t('documents.settings.print.template') }}
                                </h3>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ $t('documents.settings.print.templateDescription') }}
                                </p>
                            </div>

                            <!-- Starter template download -->
                            <div
                                class="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/10 border-dashed"
                            >
                                <div class="flex flex-col gap-0.5">
                                    <span class="text-sm font-medium">{{
                                        $t('documents.settings.print.downloadTemplate')
                                    }}</span>
                                    <span class="text-xs text-muted-foreground">{{
                                        $t('documents.settings.print.downloadTemplateHint')
                                    }}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    class="gap-1.5 shrink-0 ml-4"
                                    @click="handleDownloadStarterTemplate"
                                >
                                    <Download class="w-3.5 h-3.5" />
                                    <span class="hidden sm:inline">{{
                                        $t('documents.settings.print.downloadTemplate')
                                    }}</span>
                                </Button>
                            </div>

                            <div
                                class="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="p-2 rounded-full"
                                        :class="
                                            hasCustomTemplate
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted-foreground/10 text-muted-foreground'
                                        "
                                    >
                                        <FileText class="w-4 h-4" />
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-sm font-medium">
                                            {{
                                                hasCustomTemplate
                                                    ? $t(
                                                          'documents.settings.print.templateUploaded',
                                                      )
                                                    : $t('documents.settings.print.templateDefault')
                                            }}
                                        </span>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <input
                                        ref="templateInput"
                                        type="file"
                                        accept=".docx"
                                        class="hidden"
                                        @change="handleTemplateUpload"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="gap-1.5"
                                        :disabled="isUploadingTemplate"
                                        @click="triggerTemplateUpload"
                                    >
                                        <UploadCloud class="w-3.5 h-3.5" />
                                        <span class="hidden sm:inline">{{
                                            $t('documents.settings.print.uploadTemplate')
                                        }}</span>
                                    </Button>
                                    <Button
                                        v-if="hasCustomTemplate"
                                        variant="outline"
                                        size="sm"
                                        class="gap-1.5"
                                        @click="previewTemplate"
                                    >
                                        <Eye class="w-3.5 h-3.5" />
                                        <span class="hidden sm:inline">{{
                                            $t(
                                                'documents.settings.print.previewTemplate',
                                                'Preview',
                                            )
                                        }}</span>
                                    </Button>
                                    <Button
                                        v-if="hasCustomTemplate"
                                        variant="destructive"
                                        size="sm"
                                        class="gap-1.5"
                                        @click="removeCustomTemplate"
                                    >
                                        <Trash2 class="w-3.5 h-3.5" />
                                        <span class="hidden sm:inline">{{
                                            $t('documents.settings.print.removeTemplate')
                                        }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Separator class="my-4 opacity-50" />

                        <Button
                            class="w-full gap-2 mt-4"
                            :disabled="isSavingPrint"
                            @click="savePrintSettings"
                        >
                            <Save class="w-4 h-4" />
                            {{ $t('documents.settings.print.save') }}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>

    <!-- Alert Dialogs -->
    <AlertDialog :open="showDeleteSessions" @update:open="showDeleteSessions = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('documents.settings.sessions.deleteConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('documents.settings.sessions.deleteConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingSessions">
                    {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingSessions"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeleteSessions"
                >
                    {{
                        isDeletingSessions
                            ? '...'
                            : $t('documents.settings.sessions.deleteConfirmBtn')
                    }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="showDeletePlans" @update:open="showDeletePlans = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('documents.settings.plans.deleteConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('documents.settings.plans.deleteConfirmMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeletingPlans">
                    {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeletingPlans"
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click.prevent="handleDeletePlans"
                >
                    {{ isDeletingPlans ? '...' : $t('documents.settings.plans.deleteConfirmBtn') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog :open="showPreviewDialog" @update:open="showPreviewDialog = $event">
        <DialogContent
            class="max-w-[95vw] w-full lg:max-w-[85vw] xl:max-w-[1200px] h-[95vh] max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden"
        >
            <DialogHeader
                class="px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
            >
                <DialogTitle>
                    {{ $t('documents.settings.print.templatePreviewTitle', 'Template Preview') }}
                </DialogTitle>
                <DialogDescription class="hidden"> Preview of the docx template </DialogDescription>
            </DialogHeader>
            <div class="flex-1 overflow-hidden bg-muted/10 p-0 sm:p-4">
                <DocxViewer v-if="showPreviewDialog" :document-blob="previewBlob" />
            </div>
        </DialogContent>
    </Dialog>
</template>
