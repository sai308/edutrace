import type { Group } from '@Groups/types/groups'
import type { FlatMark } from '../types/marks'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { activeWorkerTasks, reportWorkerError } from '@/shared/lib/appStatus'
import { logger } from '@/shared/lib/logger'
import { WorkerError } from '@/shared/lib/workerError'
import { toast } from '@/shared/services/toast'
import { marksService } from '../services/marks.service'

// Module-level singletons — all callers share one reactive instance
const groups = ref<Group[]>([])
const flatMarks = ref<FlatMark[]>([])
const isProcessing = ref(false)
const allMeetIds = ref<string[]>([])
const allTeachers = ref<string[]>([])
const isLoading = ref(false)
const pendingToggleIds = new Set<string | number>()

export function useMarks() {
    const { t } = useI18n()

    async function loadGroups() {
        groups.value = await marksService.loadGroups()
    }

    async function loadSuggestions() {
        const { allMeetIds: meets, allTeachers: teachers } = await marksService.loadSuggestions()
        allMeetIds.value = meets
        allTeachers.value = teachers
    }

    async function loadMarksData(groupName: string | null = null) {
        isLoading.value = true
        // clear old data immediately to avoid confusion
        flatMarks.value = []
        try {
            flatMarks.value = await marksService.loadMarksData(groupName)
        }
        catch (error) {
            logger.error('Failed to load marks data:', error)
            toast.error('Failed to load data')
        }
        finally {
            isLoading.value = false
        }
    }

    async function createGroup(groupData: Partial<Group>): Promise<Group> {
        const newGroup = await marksService.createGroup(groupData)
        toast.success(`Group "${newGroup.name}" created.`)
        return newGroup
        // Caller is responsible for refreshing groups list and marks data.
    }

    async function processFile(file: File, groupName: string) {
        isProcessing.value = true
        activeWorkerTasks.value++
        try {
            const { newMarksCount, skippedMarksCount, updatedMarksCount } = await marksService.processFile(
                file,
                groupName,
            )

            if (newMarksCount > 0) {
                toast.success(`Imported ${newMarksCount} marks.`)
            }
            if (updatedMarksCount > 0) {
                toast.info(`Updated ${updatedMarksCount} marks.`)
            }
            if (skippedMarksCount > 0) {
                toast.info(`Skipped ${skippedMarksCount} duplicate marks.`)
            }
            if (newMarksCount === 0 && updatedMarksCount === 0 && skippedMarksCount === 0) {
                toast.info('No marks found in file.')
            }
            // Table reload is triggered once after the full queue drains, not per-file.
        }
        catch (e) {
            logger.error('Error processing marks:', e)
            reportWorkerError()
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
                toast.error(t('workerErrors.unknown'))
            }
            throw e
        }
        finally {
            isProcessing.value = false
            activeWorkerTasks.value = Math.max(0, activeWorkerTasks.value - 1)
        }
    }

    async function toggleSynced(mark: FlatMark, silent = false) {
        if (!mark?.id || pendingToggleIds.has(mark.id))
            return
        pendingToggleIds.add(mark.id)
        try {
            const newSynced = await marksService.toggleSynced(mark)
            mark.synced = newSynced
            if (!silent) {
                toast.success(newSynced ? t('marks.markedAsSynced') : t('marks.markedAsUnsynced'), 2000, {
                    label: t('common.undo'),
                    fn: () => toggleSynced(mark, true),
                })
            }
        }
        catch (e) {
            logger.error('Error toggling sync:', e)
            toast.error('Failed to update sync status')
        }
        finally {
            setTimeout(() => pendingToggleIds.delete(mark.id), 400)
        }
    }

    async function deleteMark(id: string | number) {
        try {
            await marksService.deleteMark(id)
            flatMarks.value = flatMarks.value.filter(m => m.id !== id)
            toast.success('Mark deleted')
        }
        catch (e) {
            logger.error('Error deleting mark:', e)
            toast.error('Failed to delete mark')
            throw e
        }
    }

    async function saveManualMark(data: { groupName: string, studentId: string, taskId: string, score: number }) {
        try {
            const result = await marksService.saveManualMark(data)
            if (result.skipped) {
                toast.info('Mark is already synced — not overwritten')
            }
            else if (result.isNew) {
                toast.success('Mark saved')
            }
            else if (result.updated) {
                toast.success('Mark updated')
            }
            else {
                toast.info('Mark is already up to date')
            }
            await loadMarksData(data.groupName)
        }
        catch (e) {
            logger.error('Error saving manual mark:', e)
            toast.error('Failed to save mark')
            throw e
        }
    }

    async function deleteMarks(ids: (string | number)[]) {
        try {
            await marksService.deleteMarks(ids)
            const idsSet = new Set(ids)
            flatMarks.value = flatMarks.value.filter(m => !idsSet.has(m.id))
            toast.success(`${ids.length} marks deleted`)
        }
        catch (e) {
            logger.error('Error deleting marks:', e)
            toast.error('Failed to delete marks')
            throw e
        }
    }

    return {
        groups,
        flatMarks,
        isProcessing,
        allMeetIds,
        allTeachers,
        isLoading,
        loadGroups,
        loadSuggestions,
        loadMarksData,
        createGroup,
        processFile,
        toggleSynced,
        deleteMark,
        deleteMarks,
        saveManualMark,
    }
}
