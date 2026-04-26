<script setup lang="ts">
import type { Workspace } from '@/shared/types/workspaces'
import { useColorMode } from '@vueuse/core'
import * as LucideIcons from 'lucide-vue-next'
import {
    Boxes,
    ClipboardCheck,
    ClipboardCopy,
    Code2,
    Database,
    Download,
    Globe,
    Moon,
    Sun,
    Trash2,
    Upload,
    WifiOff,
} from 'lucide-vue-next'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { localeService } from '@/services/locale'
import { logger } from '@/shared/lib/logger'
import { databaseService, DB_VERSION } from '@/shared/services/DatabaseService'
import { toast } from '@/shared/services/toast'
import { workspaceRepository } from '@/shared/services/workspace.repository'
import { downloadJson } from '@/shared/utils/download'

declare const __APP_VERSION__: string

const { t, locale } = useI18n()
const colorMode = useColorMode()

// ─── Appearance ───────────────────────────────────────────────────────────────

const availableLocales = [
    { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { code: 'uk-UA', label: 'Українська', flag: '🇺🇦' },
]

const selectedLocale = ref(locale.value)

watch(selectedLocale, (code) => {
    locale.value = code
    localeService.setLocale(code)
})

const themeOptions = [
    { value: 'light' as const, icon: Sun, labelKey: 'globalSettings.appearance.theme.light' },
    { value: 'dark' as const, icon: Moon, labelKey: 'globalSettings.appearance.theme.dark' },
]

// ─── Workspaces ───────────────────────────────────────────────────────────────

const workspaces = ref<Workspace[]>([])
const currentWorkspaceId = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const isExportingAll = ref(false)

const deleteTarget = ref<Workspace | null>(null)
const isDeleting = ref(false)

function getWorkspaceIcon(name?: string) {
    if (!name) return Database
    return ((LucideIcons as Record<string, unknown>)[name] as typeof Database) ?? Database
}

function loadWorkspaces() {
    workspaces.value = workspaceRepository.getWorkspaces()
    currentWorkspaceId.value = workspaceRepository.getCurrentWorkspaceId()
}

async function exportWorkspace(ws: Workspace) {
    try {
        const data = await workspaceRepository.exportWorkspaces([ws.id])
        const slug = ws.name.toLowerCase().replace(/\s+/g, '-')
        downloadJson(data, `edutrace-workspace-${slug}-${getTimestamp()}.json`)
        toast.success(t('globalSettings.workspaces.exportSuccess'))
    } catch (e) {
        logger.error('Workspace export failed:', e)
        toast.error(t('globalSettings.workspaces.exportFailed'))
    }
}

async function exportAllWorkspaces() {
    isExportingAll.value = true
    try {
        const ids = workspaces.value.map((w) => w.id)
        const data = await workspaceRepository.exportWorkspaces(ids)
        downloadJson(data, `edutrace-all-workspaces-${getTimestamp()}.json`)
        toast.success(t('globalSettings.workspaces.exportAllSuccess'))
    } catch (e) {
        logger.error('All-workspaces export failed:', e)
        toast.error(t('globalSettings.workspaces.exportFailed'))
    } finally {
        isExportingAll.value = false
    }
}

async function handleImportFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.type !== 'multi-workspace-backup' || !Array.isArray(data.workspaces)) {
            toast.error(t('globalSettings.workspaces.importInvalidFormat'))
            return
        }
        const ids = (data.workspaces as Array<{ id: string }>).map((w) => w.id)
        await workspaceRepository.importWorkspaces(data, ids)
        toast.success(t('globalSettings.workspaces.importSuccess', { count: ids.length }))
        loadWorkspaces()
    } catch (e) {
        logger.error('Workspace import failed:', e)
        toast.error(t('globalSettings.workspaces.importFailed'))
    } finally {
        ;(event.target as HTMLInputElement).value = ''
    }
}

async function confirmDeleteWorkspace() {
    if (!deleteTarget.value) return
    isDeleting.value = true
    try {
        await workspaceRepository.deleteWorkspace(deleteTarget.value.id)
        toast.success(t('globalSettings.workspaces.deleteSuccess'))
        loadWorkspaces()
    } catch (e) {
        logger.error('Workspace delete failed:', e)
        toast.error(t('globalSettings.workspaces.deleteFailed'))
    } finally {
        isDeleting.value = false
        deleteTarget.value = null
    }
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

const dbName = ref('')
const copied = ref(false)

function copyDiagnostics() {
    const report = logger.buildReport(DB_VERSION, locale.value)
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    })
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
    loadWorkspaces()
    dbName.value = databaseService.getCurrentDbName()
})

function getTimestamp() {
    return new Date().toISOString().split('T')[0]
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                {{ $t('globalSettings.title') }}
            </h1>
            <p class="text-muted-foreground">
                {{ $t('globalSettings.description') }}
            </p>
        </div>

        <!-- Row 1: Appearance + Workspaces -->
        <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <!-- Appearance -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Globe class="size-4" />
                        {{ $t('globalSettings.appearance.title') }}
                    </CardTitle>
                    <CardDescription>
                        {{ $t('globalSettings.appearance.description') }}
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-5">
                    <!-- Language -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium">
                            {{ $t('globalSettings.appearance.language.label') }}
                        </label>
                        <Select v-model="selectedLocale">
                            <SelectTrigger class="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
                                    <div class="flex items-center">
                                        <span class="text-base leading-none">{{ loc.flag }}</span>
                                        <span>&nbsp;&nbsp;{{ loc.label }}</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-[0.8rem] text-muted-foreground">
                            {{ $t('globalSettings.appearance.language.description') }}
                        </p>
                    </div>

                    <Separator />

                    <!-- Theme -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium">
                            {{ $t('globalSettings.appearance.theme.label') }}
                        </label>
                        <div class="flex gap-2">
                            <Button
                                v-for="opt in themeOptions"
                                :key="opt.value"
                                :variant="colorMode === opt.value ? 'default' : 'outline'"
                                size="sm"
                                class="flex-1 gap-1.5"
                                @click="colorMode = opt.value"
                            >
                                <component :is="opt.icon" class="size-3.5" />
                                {{ $t(opt.labelKey) }}
                            </Button>
                        </div>
                        <p class="text-[0.8rem] text-muted-foreground">
                            {{ $t('globalSettings.appearance.theme.description') }}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <!-- Workspaces -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Boxes class="size-4" />
                        {{ $t('globalSettings.workspaces.title') }}
                    </CardTitle>
                    <CardDescription>
                        {{ $t('globalSettings.workspaces.description') }}
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-3">
                    <!-- Workspace list -->
                    <div class="space-y-1.5">
                        <div
                            v-for="ws in workspaces"
                            :key="ws.id"
                            class="flex items-center gap-2 rounded-md border px-3 py-2"
                            :class="ws.id === currentWorkspaceId ? 'bg-muted/40 border-primary/30' : ''"
                        >
                            <component :is="getWorkspaceIcon(ws.icon)" class="size-4 shrink-0 text-muted-foreground" />
                            <span class="flex-1 truncate text-sm font-medium">{{ ws.name }}</span>
                            <Badge v-if="ws.id === currentWorkspaceId" variant="secondary" class="text-xs shrink-0">
                                {{ $t('globalSettings.workspaces.active') }}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="size-7 shrink-0"
                                :title="$t('globalSettings.workspaces.export')"
                                @click="exportWorkspace(ws)"
                            >
                                <Download class="size-3.5" />
                            </Button>
                            <Button
                                v-if="ws.id !== currentWorkspaceId"
                                variant="ghost"
                                size="icon"
                                class="size-7 shrink-0 text-destructive hover:text-destructive"
                                :title="$t('common.delete')"
                                @click="deleteTarget = ws"
                            >
                                <Trash2 class="size-3.5" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <!-- Actions -->
                    <div class="flex w-full gap-3 sm:w-auto">
                        <Button variant="outline" size="sm" class="gap-1.5 flex-1" @click="importInput?.click()">
                            <Upload class="size-3.5 shrink-0" />
                            <span class="truncate">{{ $t('globalSettings.workspaces.import') }}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            class="gap-1.5 flex-1"
                            :disabled="isExportingAll"
                            @click="exportAllWorkspaces"
                        >
                            <Download class="size-3.5 shrink-0" />
                            <span class="truncate">{{ $t('globalSettings.workspaces.exportAll') }}</span>
                        </Button>
                    </div>

                    <input ref="importInput" type="file" accept=".json" class="hidden" @change="handleImportFile" />
                </CardContent>
            </Card>
        </div>

        <!-- Sync — coming soon -->
        <Card class="border-dashed opacity-70">
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <WifiOff class="size-4 shrink-0" />
                    <span class="truncate">{{ $t('globalSettings.sync.title') }}</span>
                    <Badge variant="secondary" class="text-xs shrink-0">
                        {{ $t('globalSettings.sync.comingSoon') }}
                    </Badge>
                </CardTitle>
                <CardDescription>{{ $t('globalSettings.sync.description') }}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="outline" size="sm" class="w-full sm:w-auto gap-1.5" disabled>
                    <Code2 class="size-3.5 shrink-0" />
                    <span class="truncate">{{ $t('globalSettings.sync.configure') }}</span>
                </Button>
            </CardContent>
        </Card>

        <!-- Developer & Diagnostics -->
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <Code2 class="size-4" />
                    {{ $t('globalSettings.dev.title') }}
                </CardTitle>
                <CardDescription>{{ $t('globalSettings.dev.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <!-- Version info -->
                <dl class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="rounded-md border bg-muted/30 px-3 py-2">
                        <dt class="text-[0.75rem] text-muted-foreground">
                            {{ $t('globalSettings.dev.appVersion') }}
                        </dt>
                        <dd class="mt-0.5 font-mono text-sm font-medium">
                            {{ __APP_VERSION__ }}
                        </dd>
                    </div>
                    <div class="rounded-md border bg-muted/30 px-3 py-2">
                        <dt class="text-[0.75rem] text-muted-foreground">
                            {{ $t('globalSettings.dev.dbVersion') }}
                        </dt>
                        <dd class="mt-0.5 font-mono text-sm font-medium">v{{ DB_VERSION }}</dd>
                    </div>
                    <div class="rounded-md border bg-muted/30 px-3 py-2 min-w-0">
                        <dt class="text-[0.75rem] text-muted-foreground">
                            {{ $t('globalSettings.dev.dbName') }}
                        </dt>
                        <dd class="mt-0.5 font-mono text-sm font-medium truncate" :title="dbName">
                            {{ dbName }}
                        </dd>
                    </div>
                </dl>

                <Separator />

                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p class="text-[0.8rem] text-muted-foreground flex-1 pr-4">
                        {{ $t('globalSettings.dev.diagnosticsDescription') }}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        class="w-full sm:w-auto gap-1.5 shrink-0"
                        @click="copyDiagnostics"
                    >
                        <ClipboardCheck v-if="copied" class="size-3.5 shrink-0 text-green-500" />
                        <ClipboardCopy v-else class="size-3.5 shrink-0" />
                        <span class="truncate">{{
                            copied ? $t('globalSettings.dev.copied') : $t('globalSettings.dev.copyDiagnostics')
                        }}</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>

    <!-- Delete workspace confirm -->
    <AlertDialog
        :open="!!deleteTarget"
        @update:open="
            (v) => {
                if (!v) deleteTarget = null
            }
        "
    >
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('globalSettings.workspaces.deleteConfirmTitle') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{
                        $t('globalSettings.workspaces.deleteConfirmMessage', {
                            name: deleteTarget?.name,
                        })
                    }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="deleteTarget = null">
                    {{ $t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    :disabled="isDeleting"
                    @click="confirmDeleteWorkspace"
                >
                    {{ $t('common.delete') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
