import type { Task } from '@Tasks/types/tasks'
import type { Unit } from '@Units/types/units'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'
import { unitsRepository } from '../services/units.repository'
import { saveUnit as serviceSaveUnit } from '../services/units.service'

export function useUnits() {
    const { t } = useI18n()
    const units = ref<Unit[]>([])
    const availableTasks = ref<Task[]>([])

    async function loadData(): Promise<void> {
        try {
            const [rawUnits, tasks] = await Promise.all([unitsRepository.getAllUnits(), tasksRepository.getAllTasks()])
            units.value = rawUnits.sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
            availableTasks.value = tasks
        } catch (e: unknown) {
            logger.error('Load units failed', e)
            toast.error(t('modules.toasts.loadError'))
        }
    }

    /**
     * Saves a unit (create or update). Returns true on success, false when a
     * handled error occurred and a toast was already shown.
     */
    async function saveUnit(formData: Partial<Unit>, existingUnit?: Unit | null): Promise<boolean> {
        const isEditing = !!existingUnit?.id
        try {
            await serviceSaveUnit(formData, existingUnit)
            await loadData()
            toast.success(isEditing ? t('modules.toasts.updatedSuccess') : t('modules.toasts.createdSuccess'))
            return true
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'DuplicateUnitError') {
                toast.error(t('modules.toasts.alreadyExists', { name: formData.name }))
            } else {
                logger.error('Save unit failed', e)
                toast.error(t('modules.toasts.saveError'))
            }
            return false
        }
    }

    async function deleteUnit(unit: Unit): Promise<void> {
        try {
            await unitsRepository.bulkDelete([unit.id!])
            await loadData()
            toast.success(t('modules.toasts.deletedSuccess', { name: unit.name }))
        } catch (e: unknown) {
            logger.error('Delete unit failed', e)
            toast.error(t('modules.toasts.deleteError'))
        }
    }

    async function bulkDeleteUnits(ids: number[]): Promise<void> {
        try {
            await unitsRepository.bulkDelete(ids)
            await loadData()
            toast.success(t('modules.toasts.bulkDeletedSuccess', { count: ids.length }))
        } catch (e: unknown) {
            logger.error('Bulk delete units failed', e)
            toast.error(t('modules.toasts.bulkDeleteError'))
        }
    }

    async function saveOrder(orderedUnits: Unit[]): Promise<void> {
        try {
            const updates = orderedUnits.map((unit, index) => ({
                id: unit.id!,
                ordinal: index + 1,
            }))
            await unitsRepository.updateOrdinals(updates)
            await loadData()
            toast.success(t('modules.toasts.orderSaved'))
        } catch (e: unknown) {
            logger.error('Save unit order failed', e)
            toast.error(t('modules.toasts.orderError'))
        }
    }

    return { units, availableTasks, loadData, saveUnit, deleteUnit, bulkDeleteUnits, saveOrder }
}
