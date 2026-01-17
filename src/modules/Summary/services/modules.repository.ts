import { BaseRepository } from '@/shared/services/BaseRepository';
import type { Module } from '../types/summary';

class ModulesRepository extends BaseRepository<'modules'> {
    constructor() {
        super('modules');
    }

    async saveModule(module: Module): Promise<string | number> {
        if (module.id) {
            return this.put(module);
        }
        return this.add(module);
    }

    async getAllModules(): Promise<Module[]> {
        return this.getAll();
    }

    async getModulesByGroup(groupName: string): Promise<Module[]> {
        return this.getAllFromIndex('groupName', groupName);
    }

    async getModuleById(id: string | number): Promise<Module | undefined> {
        return this.getById(id as any);
    }

    async deleteModule(id: string | number): Promise<void> {
        return this.delete(id as any);
    }
}

export const modulesRepository = new ModulesRepository();
