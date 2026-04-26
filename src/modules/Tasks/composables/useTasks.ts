import type { Task } from '@Tasks/types/tasks'
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'
import { tasksRepository } from '../services/tasks.repository'
import { saveTask as serviceSaveTask } from '../services/tasks.service'

// Module-level singleton state — shared across all consumers so task list stays
// consistent between sibling components without re-fetching on every mount.
const tasks = shallowRef<Task[]>([])

export function useTasks() {
    const { t } = useI18n()

    async function loadTasks(): Promise<void> {
        tasks.value = await tasksRepository.getAllTasks()
    }

    /**
     * Saves a task (create or update). Returns true on success, false if an
     * error was caught and a toast was shown. The caller decides whether to
     * close the dialog based on the return value.
     */
    async function saveTask(formData: Partial<Task>, existingTask?: Task | null): Promise<boolean> {
        const isEditing = !!existingTask
        try {
            await serviceSaveTask(formData, existingTask)
            await loadTasks()
            toast.success(isEditing ? t('tasks.saveSuccess') : t('tasks.addSuccess'))
            return true
        }
        catch (e: unknown) {
            if (e instanceof Error && e.name === 'ConstraintError') {
                toast.error(t('tasks.duplicateError', { name: String(formData.name) }))
            }
            else {
                logger.error('Save task failed', e)
                toast.error(t('tasks.saveError'))
            }
            return false
        }
    }

    async function deleteTask(task: Task): Promise<void> {
        await tasksRepository.deleteTasks([task.id])
        await loadTasks()
        toast.success(t('tasks.deleteSuccess', { name: task.name }))
    }

    async function bulkDeleteTasks(ids: string[]): Promise<void> {
        await tasksRepository.deleteTasks(ids)
        await loadTasks()
        toast.success(t('tasks.bulkDeleteSuccess', { count: ids.length }))
    }

    return { tasks, loadTasks, saveTask, deleteTask, bulkDeleteTasks }
}
