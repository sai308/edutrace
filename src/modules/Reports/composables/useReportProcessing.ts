import { useMeets } from '@Analytics/composables/useMeets'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { logger } from '@/shared/lib/logger'
import { WorkerError } from '@/shared/lib/workerError'
import { toast } from '@/shared/services/toast'
import { reportsService } from '../services/reports.service'

export function useReportProcessing() {
    const { t } = useI18n()
    const isProcessing = ref(false)
    const { loadMeets } = useMeets()
    const pendingFiles = ref<File[]>([])
    const showFilterModal = ref(false)
    const filterCallback = ref<(() => void) | null>(null)

    async function handleFilesDropped(files: File[], onRefreshDashboard: () => void): Promise<void> {
        pendingFiles.value = files
        filterCallback.value = onRefreshDashboard
        showFilterModal.value = true
    }

    async function processFiles(filterMode: 'all' | 'related'): Promise<void> {
        if (!pendingFiles.value || pendingFiles.value.length === 0)
            return

        isProcessing.value = true
        showFilterModal.value = false

        try {
            const stats = await reportsService.processFiles(pendingFiles.value, filterMode)

            if (stats.saved > 0)
                toast.success(t('reports.processing.saved', { count: stats.saved }))
            if (stats.skipped > 0)
                toast.info(t('reports.processing.skipped', { count: stats.skipped }))
            if (stats.unrecognized > 0)
                toast.info(t('csvFilter.skippedUnrecognized', { count: stats.unrecognized }))

            await loadMeets()

            if (filterCallback.value) {
                filterCallback.value()
            }
        }
        catch (e) {
            logger.error('Error processing files:', e)
            if (e instanceof WorkerError && e.code === 'PARSE_ERROR') {
                toast.error(e.message)
            }
            else if (e instanceof WorkerError && e.code === 'WORKER_TIMEOUT') {
                toast.error(t('workerErrors.timeout'))
            }
            else if (e instanceof WorkerError && e.code === 'SERIALIZATION_ERROR') {
                toast.error(t('workerErrors.serialization'))
            }
            else {
                toast.error(t('reports.processing.error'))
            }
        }
        finally {
            isProcessing.value = false
            pendingFiles.value = []
            filterCallback.value = null
        }
    }

    function cancelFilter(): void {
        showFilterModal.value = false
        pendingFiles.value = []
        filterCallback.value = null
    }

    return {
        isProcessing,
        pendingFiles,
        showFilterModal,
        handleFilesDropped,
        processFiles,
        cancelFilter,
    }
}
