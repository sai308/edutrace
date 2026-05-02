import type { Unit } from '@Units/types/units'
import { unitsRepository } from './units.repository'

/**
 * Converts a unit name to its normalized form used for uniqueness enforcement.
 * Lowercases and strips all whitespace.
 */
export function normalizeUnitName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '')
}

/**
 * Constructs a complete Unit object from form input.
 * Preserves id, ordinal, and createdAt from existingUnit when editing.
 * Throws if name is empty after trimming.
 */
export function buildUnit(formData: Partial<Unit>, existingUnit?: Unit | null): Unit {
    const name = formData.name?.trim() ?? ''
    if (!name)
        throw new Error('Unit name is required')

    const unit: Unit = {
        name,
        normalizedName: normalizeUnitName(name),
        taskIds: formData.taskIds ?? [],
        testTaskId: formData.testTaskId ?? null,
        taskCoef: Number(formData.taskCoef) || 1,
        testCoef: Number(formData.testCoef) || 1,
        description: formData.description || '',
        createdAt: existingUnit?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    if (existingUnit?.id !== undefined) {
        unit.id = existingUnit.id
        unit.ordinal = existingUnit.ordinal
    }

    return unit
}

/**
 * Duplicate-checks, builds, and persists a unit. Throws DuplicateUnitError if
 * another unit with the same normalizedName already exists.
 */
export async function saveUnit(formData: Partial<Unit>, existingUnit?: Unit | null): Promise<void> {
    const name = formData.name?.trim() ?? ''
    const normalizedName = normalizeUnitName(name)
    const duplicate = await unitsRepository.findUnitByNormalizedName(normalizedName)
    if (duplicate && duplicate.id !== existingUnit?.id) {
        const err = new Error(`Unit "${name}" already exists`)
        err.name = 'DuplicateUnitError'
        throw err
    }

    const unit = buildUnit(formData, existingUnit)
    await unitsRepository.saveUnit(unit)
}
