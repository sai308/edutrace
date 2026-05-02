import type { Unit } from '../types/units'
import { BaseRepository } from '@/shared/services/BaseRepository'

class UnitsRepository extends BaseRepository<'units'> {
    constructor() {
        super('units')
    }

    async saveUnit(unit: Unit): Promise<string | number> {
        if (!unit.name?.trim())
            throw new Error('Unit name is required')
        if (!unit.normalizedName?.trim())
            throw new Error('Unit normalizedName is required')

        let unitToSave = unit
        if (!unit.id && typeof unit.ordinal === 'undefined') {
            const ordinal = await this.getNextOrdinal()
            unitToSave = { ...unit, ordinal }
        }

        if (unitToSave.id) {
            return this.put(unitToSave)
        }
        return this.add(unitToSave)
    }

    async getAllUnits(): Promise<Unit[]> {
        return this.getAll()
    }

    async findUnitByNormalizedName(normalizedName: string): Promise<Unit | undefined> {
        return this.getFromIndex('normalizedName', normalizedName)
    }

    async getNextOrdinal(): Promise<number> {
        const units = await this.getAllUnits()
        if (!units || units.length === 0)
            return 1
        const maxOrdinal = Math.max(...units.map(u => u.ordinal || 0))
        return maxOrdinal + 1
    }

    async updateOrdinals(updates: { id: number, ordinal: number }[]): Promise<void> {
        const db = await this.getDb()
        const tx = db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)

        for (const update of updates) {
            const unit = await store.get(update.id)
            if (unit) {
                unit.ordinal = update.ordinal
                store.put(unit)
            }
        }
        await tx.done
    }
}

export const unitsRepository = new UnitsRepository()
