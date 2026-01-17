import { ref } from 'vue';
import { groupsService } from '../services/groups.service';
import type { GroupFormData } from '../types/groups';
import { toast } from '@/services/toast';

export function useGroups() {
    const groups = ref<any[]>([]); // Results from worker might be processed groups
    const memberCounts = ref<Record<string, number>>({});
    const allMeetIds = ref<string[]>([]);
    const allTeachers = ref<string[]>([]);
    const isLoading = ref(false);

    async function loadData() {
        isLoading.value = true;
        try {
            const data = await groupsService.loadGroupsData();
            groups.value = data.groups;
            memberCounts.value = data.memberCounts;
            allMeetIds.value = data.allMeetIds;
            allTeachers.value = data.allTeachers;
        } catch (error) {
            console.error('Failed to load groups data:', error);
            toast.error('Failed to load data');
        } finally {
            isLoading.value = false;
        }
    }

    async function saveGroup(formData: GroupFormData) {
        try {
            const isUpdate = !!formData.id;
            await groupsService.saveGroup(formData);
            await loadData();
            toast.success(isUpdate ? 'Group updated' : 'Group created');
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Error saving group');
            throw e;
        }
    }

    async function deleteGroup(id: string | number) {
        try {
            await groupsService.deleteGroup(id);
            await loadData();
            toast.success('Group deleted');
        } catch (e) {
            console.error(e);
            toast.error('Error deleting group');
            throw e;
        }
    }

    return {
        groups,
        memberCounts,
        allMeetIds,
        allTeachers,
        isLoading,
        loadData,
        saveGroup,
        deleteGroup
    };
}
