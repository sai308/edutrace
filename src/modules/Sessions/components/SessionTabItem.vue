<script setup lang="ts">
import type { SessionEntry, SessionReport } from '../models/session.model'
import type { PrintFormData } from './dialogs/SessionPrintDialog.vue'
import type { Group } from '@/modules/Groups/types/groups'
import { studentsRepository } from '@Students/services/students.repository'
import { FileDown, Printer, RefreshCw, Search, UserX } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useFormatters } from '@/shared/composables/useFormatters'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'
import { downloadBlob } from '@/shared/utils/download'
import { computeECTSStats } from '@/shared/utils/grades'
import { SessionStatusEnum } from '../models/session.model'
import { sessionDocumentService } from '../services/sessionDocument.service'
import { sessionsService } from '../services/sessions.service'
import SessionCloseDialog from './dialogs/SessionCloseDialog.vue'
import SessionPrintDialog from './dialogs/SessionPrintDialog.vue'
import SessionPrintTemplate from './SessionPrintTemplate.vue'
import SessionsDataTable from './SessionsList/DataTable.vue'

const props = defineProps<{
    session: SessionReport
    isSyncing?: boolean
    group?: Group | null
    referenceEntries?: SessionEntry[]
}>()

const emit = defineEmits<{
    (e: 'closed'): void
    (e: 'sync'): void
}>()

const { t } = useI18n()
const { formatDateTime } = useFormatters()

const isClosing = ref(false)
const isCloseDialogOpen = ref(false)
const isPrintDialogOpen = ref(false)
const printFormData = ref<PrintFormData | null>(null)
const searchQuery = ref('')

// Download DOCX state
const hasTemplate = ref(false)
const isDocxGenerating = ref(false)
/** Tracks which action opened the shared print dialog */
const printDialogMode = ref<'print' | 'download'>('print')

/** Live studentId → IEP map, resolved from Member records */
const iepMap = ref<Record<string, string | undefined>>({})

onMounted(async () => {
    const [templateExists, map] = await Promise.all([
        sessionDocumentService.hasTemplate(),
        studentsRepository.getIepMap({ includeHidden: true }),
    ])
    hasTemplate.value = templateExists
    iepMap.value = map
})

// Clear cached print form when the session changes so stale data from a
// previous session isn't shown; same-session reprints reuse the cached form.
watch(
    () => props.session.id,
    () => {
        printFormData.value = null
    }
)

function handlePrintClick() {
    printDialogMode.value = 'print'
    isPrintDialogOpen.value = true
}

function handleDownloadClick() {
    printDialogMode.value = 'download'
    isPrintDialogOpen.value = true
}

async function handleDialogAction(formData: PrintFormData) {
    if (printDialogMode.value === 'print') {
        printFormData.value = formData
        setTimeout(() => window.print(), 50)
    } else {
        await handleDocxDownload(formData)
    }
}

async function handleDocxDownload(formData: PrintFormData) {
    isDocxGenerating.value = true
    try {
        const { blob, filename } = await sessionDocumentService.generateDocument(
            props.session,
            props.group ?? null,
            formData
        )
        downloadBlob(blob, filename)
        toast.success(t('sessions.document.downloadSuccess'))
    } catch (e) {
        logger.error('DOCX generation failed:', e)
        toast.error(t('sessions.document.downloadError'))
    } finally {
        isDocxGenerating.value = false
    }
}

const isClosed = computed(() => props.session.status === SessionStatusEnum.CLOSED)

const absentStudents = computed(() => {
    return props.session.entries.filter((e) => e.grade === null)
})

const stats = computed(() => computeECTSStats(props.session.entries.map((e) => e.grade)))

function handleCloseClick() {
    isCloseDialogOpen.value = true
}

async function handleConfirmClose() {
    try {
        isClosing.value = true
        isCloseDialogOpen.value = false
        await sessionsService.closeSession(props.session.id)
        emit('closed')
    } catch (e: any) {
        logger.error('Failed to close session:', e)
        toast.error(e.message || 'Error closing session')
    } finally {
        isClosing.value = false
    }
}
</script>

<template>
    <div class="flex flex-col space-y-4 h-full min-h-0">
        <!-- Status Bar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-muted/50 rounded-lg border gap-4">
            <div class="space-y-1 shrink-0 text-center lg:text-left">
                <div class="flex items-center justify-center lg:justify-start gap-2">
                    <span class="font-medium">{{ $t('sessions.status.label') }}</span>
                    <Badge :variant="isClosed ? 'secondary' : 'default'">
                        {{ isClosed ? $t('sessions.status.closed') : $t('sessions.status.open') }}
                    </Badge>
                </div>
                <div class="text-xs sm:text-sm text-muted-foreground text-balance">
                    {{ $t('sessions.status.openedAt') }} {{ formatDateTime(session.openedAt) }}
                </div>
                <div v-if="isClosed && session.closedAt" class="text-xs sm:text-sm text-muted-foreground text-balance">
                    {{ $t('sessions.status.closedAt') }} {{ formatDateTime(session.closedAt) }}
                </div>
            </div>

            <!-- Middle Stats Section -->
            <div class="flex-1 flex justify-center w-full px-2 overflow-x-auto custom-scrollbar">
                <div
                    class="flex items-center gap-3 sm:gap-6 text-xs bg-background border px-4 py-2 rounded-lg shadow-sm min-w-max"
                >
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-green-600 dark:text-green-400">A</span
                        ><span :class="stats.A === 0 ? 'opacity-30' : 'font-medium'">{{ stats.A }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-semibold text-emerald-500 dark:text-emerald-400">B</span
                        ><span :class="stats.B === 0 ? 'opacity-30' : 'font-medium'">{{ stats.B }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-semibold text-yellow-600 dark:text-yellow-500">C</span
                        ><span :class="stats.C === 0 ? 'opacity-30' : 'font-medium'">{{ stats.C }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-medium text-orange-500 dark:text-orange-400">D</span
                        ><span :class="stats.D === 0 ? 'opacity-30' : 'font-medium'">{{ stats.D }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-medium text-orange-600 dark:text-orange-500">E</span
                        ><span :class="stats.E === 0 ? 'opacity-30' : 'font-medium'">{{ stats.E }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-red-500 dark:text-red-400">FX</span
                        ><span :class="stats.FX === 0 ? 'opacity-30' : 'font-medium'">{{ stats.FX }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-red-600 dark:text-red-500">F</span
                        ><span :class="stats.F === 0 ? 'opacity-30' : 'font-medium'">{{ stats.F }}</span>
                    </div>

                    <div class="w-px h-6 bg-border mx-1" />

                    <div class="flex flex-col items-center">
                        <span class="text-muted-foreground flex items-center gap-1 text-[10px] sm:text-xs">
                            <UserX class="w-3 h-3 opacity-60" /> {{ $t('sessions.grades.absent') }}
                        </span>
                        <span :class="stats.absent === 0 ? 'opacity-30' : 'font-medium'">{{ stats.absent }}</span>
                    </div>
                </div>
            </div>

            <div v-if="!isClosed" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <Button
                    variant="outline"
                    :disabled="isSyncing || isClosing"
                    class="w-full sm:w-auto"
                    @click="emit('sync')"
                >
                    <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': isSyncing }" />
                    {{ isSyncing ? $t('sessions.actions.syncing') : $t('sessions.actions.sync') }}
                </Button>
                <Button
                    variant="destructive"
                    :disabled="isClosing || isSyncing"
                    class="w-full sm:w-auto"
                    @click="handleCloseClick"
                >
                    {{ isClosing ? $t('sessions.actions.closing') : $t('sessions.actions.close') }}
                </Button>
            </div>
            <div v-else class="flex flex-wrap justify-center lg:justify-end gap-2">
                <Button variant="outline" class="w-full sm:w-auto" @click="handlePrintClick">
                    <Printer class="w-4 h-4 mr-2" />
                    {{ $t('sessions.actions.print') }}
                </Button>
                <Button
                    v-if="hasTemplate"
                    variant="outline"
                    :disabled="isDocxGenerating"
                    class="w-full sm:w-auto"
                    @click="handleDownloadClick"
                >
                    <FileDown class="w-4 h-4 mr-2" />
                    {{ isDocxGenerating ? $t('sessions.document.generating') : $t('sessions.actions.download') }}
                </Button>
            </div>
        </div>

        <!-- Data Grid -->
        <div class="flex-1 min-h-0 overflow-auto">
            <SessionsDataTable
                :entries="session.entries"
                :reference-entries="referenceEntries"
                :search-query="searchQuery"
            >
                <template #toolbar>
                    <div class="relative flex-1 max-w-xs">
                        <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            v-model="searchQuery"
                            :placeholder="$t('sessions.table.searchPlaceholder')"
                            class="pl-8 h-9"
                        />
                    </div>
                </template>
            </SessionsDataTable>
        </div>

        <SessionCloseDialog
            v-model:open="isCloseDialogOpen"
            :stats="stats"
            :absent-students="absentStudents"
            @confirm="handleConfirmClose"
        />

        <SessionPrintDialog
            v-model:open="isPrintDialogOpen"
            :session="session"
            :group="group ?? null"
            :mode="printDialogMode"
            @confirm="handleDialogAction"
        />

        <!-- Print template rendered into a dedicated portal so @media print can isolate it -->
        <Teleport to="body">
            <div id="session-print-root-portal">
                <SessionPrintTemplate
                    v-if="printFormData"
                    :session="session"
                    :group="group ?? null"
                    :form-data="printFormData"
                    :iep-map="iepMap"
                />
            </div>
        </Teleport>
    </div>
</template>
