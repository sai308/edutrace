import { ref } from 'vue';
import { marksService } from '../services/marks.service';
import { toast } from '@/services/toast';
import type { Group } from '@Groups/types/groups';
import type { FlatMark } from '../types/marks';

export function useMarks() {
    const groups = ref<Group[]>([]);
    const flatMarks = ref<FlatMark[]>([]);
    const isProcessing = ref(false);
    const allMeetIds = ref<string[]>([]);
    const allTeachers = ref<string[]>([]);
    const isLoading = ref(false);

    async function loadGroups() {
        groups.value = await marksService.loadGroups();
    }

    async function loadSuggestions() {
        const { allMeetIds: meets, allTeachers: teachers } = await marksService.loadSuggestions();
        allMeetIds.value = meets;
        allTeachers.value = teachers;
    }

    async function loadMarksData(groupName: string | null = null) {
        isLoading.value = true;
        // clear old data immediately to avoid confusion
        flatMarks.value = [];
        try {
            flatMarks.value = await marksService.loadMarksData(groupName);
        } catch (error) {
            console.error('Failed to load marks data:', error);
            toast.error('Failed to load data');
        } finally {
            isLoading.value = false;
        }
    }

    async function createGroup(groupData: Partial<Group>) {
        try {
            const newGroup = await marksService.createGroup(groupData);

            // Refresh logic - we could optimize this but reloading ensures consistency
            if (newGroup.name) {
                await loadMarksData(newGroup.name);
            }
            await loadGroups(); // Refresh group list for dropdowns

            toast.success(`Group "${newGroup.name}" created.`);
            return newGroup;
        } catch (e: any) {
            if (e.name === 'ConstraintError') {
                toast.error('A group with this Name or Meet ID already exists.');
            } else {
                toast.error('Failed to create group.');
            }
            throw e;
        }
    }

    async function processFile(file: File, groupName: string) {
        isProcessing.value = true;
        try {
            const { newMarksCount, skippedMarksCount } = await marksService.processFile(file, groupName);

            if (newMarksCount > 0) {
                toast.success(`Imported ${newMarksCount} marks.`);
            }
            if (skippedMarksCount > 0) {
                toast.info(`Skipped ${skippedMarksCount} duplicate marks.`);
            }
            if (newMarksCount === 0 && skippedMarksCount === 0) {
                toast.info('No marks found in file.');
            }

            await loadMarksData(groupName);
        } catch (e) {
            console.error('Error processing marks:', e);
            toast.error('Failed to process marks CSV');
            throw e;
        } finally {
            isProcessing.value = false;
        }
    }

    async function toggleSynced(mark: any) {
        if (!mark) return;
        try {
            const newSynced = await marksService.toggleSynced(mark);
            mark.synced = newSynced; // Optimistic / in-place update
        } catch (e) {
            console.error('Error toggling sync:', e);
            toast.error('Failed to update sync status');
        }
    }

    async function deleteMark(id: string | number) {
        try {
            await marksService.deleteMark(id);
            flatMarks.value = flatMarks.value.filter(m => m.id !== id);
            toast.success('Mark deleted');
        } catch (e) {
            console.error('Error deleting mark:', e);
            toast.error('Failed to delete mark');
            throw e;
        }
    }

    async function deleteMarks(ids: (string | number)[]) {
        try {
            await marksService.deleteMarks(ids);
            const idsSet = new Set(ids);
            flatMarks.value = flatMarks.value.filter(m => !idsSet.has(m.id));
            toast.success(`${ids.length} marks deleted`);
        } catch (e) {
            console.error('Error deleting marks:', e);
            toast.error('Failed to delete marks');
            throw e;
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
        deleteMarks
    };
}
