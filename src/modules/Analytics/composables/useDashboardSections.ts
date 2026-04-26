import { onMounted, ref } from 'vue'

const STORAGE_KEY = 'analytics_sections_collapsed'

/**
 * Manages which dashboard sections are collapsed, with sessionStorage persistence.
 * Sections are identified by their string id (e.g. 'course-4', 'other').
 */
export function useDashboardSections() {
    const collapsedSections = ref<Set<string>>(new Set())

    onMounted(() => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY)
            if (stored) {
                const ids = JSON.parse(stored)
                if (Array.isArray(ids)) {
                    collapsedSections.value = new Set(ids)
                }
            }
        }
        catch {
            // Corrupt or inaccessible sessionStorage — start with all sections expanded.
        }
    })

    function toggleSection(id: string): void {
        if (collapsedSections.value.has(id)) {
            collapsedSections.value.delete(id)
        }
        else {
            collapsedSections.value.add(id)
        }
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsedSections.value]))
        }
        catch {
            // sessionStorage quota exceeded or blocked — in-memory state still works.
        }
    }

    function isSectionCollapsed(id: string): boolean {
        return collapsedSections.value.has(id)
    }

    return { collapsedSections, toggleSection, isSectionCollapsed }
}
