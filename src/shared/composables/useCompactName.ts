import { useMediaQuery } from '@vueuse/core'

/**
 * Returns a reactive flag that is `true` when the viewport is narrower than
 * the Tailwind `sm` breakpoint (640 px).
 *
 * Pass `isCompact` into a column factory so the student/name cell can render
 * only the first word (surname in Ukrainian/Eastern-name-order conventions)
 * on small screens instead of the full name.
 *
 * @example
 * const { isCompact } = useCompactName();
 * const columns = computed(() => createColumns(..., isCompact));
 */
export function useCompactName() {
    const isCompact = useMediaQuery('(max-width: 639px)')
    return { isCompact }
}
