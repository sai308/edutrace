import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';

export interface ColumnDefinition {
    id: string;
    label: string;
    defaultVisible?: boolean;
}

/**
 * Composable for managing column visibility in tables
 */
export function useColumnVisibility(tableId: string, columns: ColumnDefinition[]) {
    const storageKey = `table_columns_${tableId}`;

    // Load saved state from localStorage or use defaults
    const loadSavedState = (): Record<string, boolean> => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load column visibility state:', e);
        }

        // Return default state
        return columns.reduce((acc, col) => {
            acc[col.id] = col.defaultVisible !== false; // Default to true if not specified
            return acc;
        }, {} as Record<string, boolean>);
    };

    const visibleColumns: Ref<Record<string, boolean>> = ref(loadSavedState());

    // Save state to localStorage whenever it changes
    watch(visibleColumns, (newState) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(newState));
        } catch (e) {
            console.error('Failed to save column visibility state:', e);
        }
    }, { deep: true });

    // Toggle a column's visibility
    const toggleColumn = (columnId: string): void => {
        visibleColumns.value[columnId] = !visibleColumns.value[columnId];
    };

    // Reset to default visibility
    const resetColumns = (): void => {
        visibleColumns.value = columns.reduce((acc, col) => {
            acc[col.id] = col.defaultVisible !== false;
            return acc;
        }, {} as Record<string, boolean>);
    };

    // Check if a column is visible
    const isColumnVisible = (columnId: string): boolean => {
        return visibleColumns.value[columnId] !== false;
    };

    // Count of visible columns
    const visibleCount: ComputedRef<number> = computed(() => {
        return Object.values(visibleColumns.value).filter(Boolean).length;
    });

    return {
        visibleColumns,
        toggleColumn,
        resetColumns,
        isColumnVisible,
        visibleCount
    };
}
