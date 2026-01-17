import { ref } from 'vue';
import { reportsService } from '../services/reports.service';
import { useMeets } from '@Analytics/composables/useMeets';
import { toast } from '@/services/toast';

export function useReportProcessing() {
    const isProcessing = ref(false);
    const { loadMeets } = useMeets();
    const pendingFiles = ref<File[]>([]);
    const showFilterModal = ref(false);
    const filterCallback = ref<(() => void) | null>(null);

    async function handleFilesDropped(files: File[], onRefreshDashboard: () => void) {
        pendingFiles.value = files;
        filterCallback.value = onRefreshDashboard;
        showFilterModal.value = true;
    }

    async function processFiles(filterMode: 'all' | 'related') {
        if (!pendingFiles.value || pendingFiles.value.length === 0) return;

        isProcessing.value = true;
        showFilterModal.value = false;

        try {
            const stats = await reportsService.processFiles(pendingFiles.value, filterMode);

            if (stats.saved > 0) toast.success(`Successfully processed ${stats.saved} files.`);
            if (stats.skipped > 0) toast.info(`Skipped ${stats.skipped} duplicate files.`);
            if (stats.unrecognized > 0) toast.info(`Skipped ${stats.unrecognized} file(s) with unrecognized group IDs.`);

            await loadMeets();

            if (filterCallback.value && typeof filterCallback.value === 'function') {
                filterCallback.value();
            }
        } catch (e) {
            console.error('Error processing files:', e);
            toast.error('Error processing files.');
        } finally {
            isProcessing.value = false;
            pendingFiles.value = [];
            filterCallback.value = null;
        }
    }

    function cancelFilter() {
        showFilterModal.value = false;
        pendingFiles.value = [];
        filterCallback.value = null;
    }

    return {
        isProcessing,
        pendingFiles,
        showFilterModal,
        handleFilesDropped,
        processFiles,
        cancelFilter
    };
}
