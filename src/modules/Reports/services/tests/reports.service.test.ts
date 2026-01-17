import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsService } from '../reports.service';
import { meetsRepository } from '@Analytics/services/meets.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { studentsRepository } from '@Students/services/students.repository';
import { settingsRepository } from '@/shared/services/settings.repository';
import type { Group } from '@Groups/types/groups';

// Mock Worker import
vi.mock('@/workers/parser.worker?worker', () => ({
    default: class {
        constructor() { }
        postMessage = vi.fn();
        terminate = vi.fn();
    }
}));

const { mockParseMeetReport } = vi.hoisted(() => ({
    mockParseMeetReport: vi.fn()
}));

// Mock Comlink
vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        parseMeetReport: mockParseMeetReport
    }),
    expose: vi.fn()
}));

// Mock repositories
vi.mock('../../../Analytics/services/meets.repository');
vi.mock('../../../Groups/services/groups.repository');
vi.mock('../../../Students/services/students.repository');
vi.mock('@/shared/services/settings.repository');

describe('ReportsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Polyfill File if needed
        if (typeof File === 'undefined') {
            (globalThis as any).File = class File {
                name: string;
                parts: any[];
                constructor(parts: any[], filename: string) {
                    this.parts = parts;
                    this.name = filename;
                }
                text() {
                    return Promise.resolve(this.parts[0] || '');
                }
            };
        }
    });

    it('should process files correctly', async () => {
        // Mock data
        const mockFile = {
            name: 'test.csv',
            text: vi.fn().mockResolvedValue('content')
        } as any as File;
        const files = [mockFile];
        const parsedData = {
            meetId: 'm1',
            filename: 'test.csv',
            date: '2023-01-01',
            participants: [{ name: 'S1', duration: 100 }]
        };
        const groupsMap = { 'm1': { name: 'G1' } as Group };

        // Mock impls
        mockParseMeetReport.mockResolvedValue(parsedData);
        (groupsRepository.getGroupMap as any).mockResolvedValue(groupsMap);
        (settingsRepository as any).getDurationLimit = vi.fn().mockResolvedValue(0);
        (meetsRepository.isDuplicateFile as any).mockResolvedValue(false);
        (studentsRepository.getAllMembers as any).mockResolvedValue([]);
        (studentsRepository.bulkPut as any).mockResolvedValue(undefined);
        (meetsRepository.saveMeet as any).mockResolvedValue(undefined);

        // Execute
        const result = await reportsService.processFiles(files);

        // Verify
        expect(result.saved).toBe(1);
        expect(meetsRepository.saveMeet).toHaveBeenCalledWith(parsedData);
    });

    it('should skip duplicates', async () => {
        const mockFile = {
            name: 'dup.csv',
            text: vi.fn().mockResolvedValue('')
        } as any as File;
        const files = [mockFile];
        const parsedData = { meetId: 'm1', filename: 'dup.csv', date: '2023-01-01', participants: [] };

        mockParseMeetReport.mockResolvedValue(parsedData);
        (groupsRepository.getGroupMap as any).mockResolvedValue({});
        (settingsRepository as any).getDurationLimit = vi.fn().mockResolvedValue(0);
        (meetsRepository.isDuplicateFile as any).mockResolvedValue(true);
        (studentsRepository.getAllMembers as any).mockResolvedValue([]);

        const result = await reportsService.processFiles(files);

        expect(result.skipped).toBe(1);
        expect(meetsRepository.saveMeet).not.toHaveBeenCalled();
    });
});
