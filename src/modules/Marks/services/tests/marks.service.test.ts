import { describe, it, expect, vi, beforeEach } from 'vitest';
import { marksService } from '../marks.service';
import { marksRepository } from '../marks.repository';
import { tasksRepository } from '../tasks.repository';
import { groupsRepository } from '@Groups/services/groups.repository';
import { studentsRepository } from '@Students/services/students.repository';
import type { Group } from '@Groups/types/groups';

// Mock repositories
vi.mock('../marks.repository');
vi.mock('../tasks.repository');
vi.mock('../../../Groups/services/groups.repository');
vi.mock('../../../Students/services/students.repository');
vi.mock('../../../Analytics/services/meets.repository');

// Mock Worker import
vi.mock('@/workers/parser.worker?worker', () => ({
    default: class {
        constructor() { }
        postMessage = vi.fn();
        terminate = vi.fn();
    }
}));

const { mockParseMarksCSV } = vi.hoisted(() => ({
    mockParseMarksCSV: vi.fn()
}));

// Mock Comlink to return the parser method
vi.mock('comlink', () => ({
    wrap: vi.fn().mockReturnValue({
        parseMarksCSV: mockParseMarksCSV
    }),
    expose: vi.fn()
}));

describe('MarksService', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Polyfill File if needed
        if (typeof File === 'undefined') {
            (globalThis as any).File = class File {
                name: string;
                parts: any[];
                options: any;
                constructor(parts: any[], filename: string, options: any) {
                    this.parts = parts;
                    this.name = filename;
                    this.options = options;
                }
                text() {
                    return Promise.resolve(this.parts[0] || '');
                }
            };
        }
    });

    describe('processFile', () => {
        it('should orchestrate file processing correctly', async () => {
            // Mock Parser Output
            mockParseMarksCSV.mockResolvedValue({
                tasks: [{ name: 'Task1' }],
                studentsData: [
                    {
                        student: { name: 'S1' },
                        marks: [{ taskIndex: 0, score: 90 }]
                    }
                ]
            });

            // Mock Repositories
            (studentsRepository.getAllMembers as any).mockResolvedValue([]);
            (studentsRepository.bulkPut as any).mockResolvedValue(undefined);
            (tasksRepository.getTasksByGroup as any).mockResolvedValue([]);
            (tasksRepository.bulkPut as any).mockResolvedValue(undefined);
            (tasksRepository as any).saveTask = vi.fn().mockResolvedValue({ id: 't1' });
            (studentsRepository as any).saveMember = vi.fn().mockResolvedValue('s1');
            (marksRepository.getAllMarks as any).mockResolvedValue([]);
            (marksRepository.bulkSaveSafe as any).mockResolvedValue({ added: 1, updated: 0, skipped: 0 });
            (marksRepository as any).saveMark = vi.fn().mockResolvedValue({ isNew: true });

            // Execute - mock file object directly
            const mockFile = {
                name: 'test.csv',
                text: vi.fn().mockResolvedValue('csv content')
            };
            const result = await marksService.processFile(mockFile as any, 'Group1');

            // Verify
            expect(mockParseMarksCSV).toHaveBeenCalled();
            expect(studentsRepository.bulkPut).toHaveBeenCalled();
            expect(tasksRepository.bulkPut).toHaveBeenCalled();
            expect(marksRepository.bulkSaveSafe).toHaveBeenCalled();

            expect(result.newMarksCount).toBe(1);
            expect(result.skippedMarksCount).toBe(0);
            expect(result.updatedMarksCount).toBe(0);
        });
    });

    describe('deleteMarks', () => {
        it('should call repository deleteMarks', async () => {
            await marksService.deleteMarks(['m1', 'm2']);
            expect(marksRepository.deleteMarks).toHaveBeenCalledWith(['m1', 'm2']);
        });
    });

    describe('createGroup', () => {
        it('should generate an ID if missing and call repository.add', async () => {
            const groupData: Partial<Group> = { name: 'New Group' };
            const result = await marksService.createGroup(groupData);

            expect(result.id).toBeDefined();
            expect(result.name).toBe('New Group');
            expect(groupsRepository.add).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Group',
                id: result.id
            }));
        });

        it('should use existing ID if provided', async () => {
            const groupData: Partial<Group> = { id: 'existing-id', name: 'Existing Group' };
            const result = await marksService.createGroup(groupData as Group);

            expect(result.id).toBe('existing-id');
            expect(groupsRepository.add).toHaveBeenCalledWith(groupData);
        });
    });

    describe('loadGroups', () => {
        it('should return groups sorted naturally', async () => {
            const unsortedGroups = [
                { name: 'Group 10' },
                { name: 'Group 2' },
                { name: 'Group 1' }
            ] as Group[];
            (groupsRepository.getAll as any).mockResolvedValue(unsortedGroups);

            const result = await marksService.loadGroups();

            expect(result).toHaveLength(3);
            expect(result[0]?.name).toBe('Group 1');
            expect(result[1]?.name).toBe('Group 2');
            expect(result[2]?.name).toBe('Group 10');
        });
    });
});
