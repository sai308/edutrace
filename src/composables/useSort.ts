import { ref, type Ref } from 'vue';

export type SortDirection = 'asc' | 'desc';

export function useSort(initialField: string = 'date', initialDirection: SortDirection = 'desc') {
    const sortField: Ref<string> = ref(initialField);
    const sortDirection: Ref<SortDirection> = ref(initialDirection);

    function toggleSort(field: string): void {
        if (sortField.value === field) {
            sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
        } else {
            sortField.value = field;
            sortDirection.value = 'asc'; // Default to asc for new field

            // Special case for date-like fields, usually want desc first
            if (['date', 'createdAt', 'uploadedAt', 'taskDate'].includes(field)) {
                sortDirection.value = 'desc';
            }
        }
    }

    return {
        sortField,
        sortDirection,
        toggleSort
    };
}
