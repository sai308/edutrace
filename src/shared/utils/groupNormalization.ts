import type { Group } from '@/modules/Groups/types/groups'

/**
 * Normalizes an input group name against a list of existing groups.
 * It removes all non-alphanumeric characters and converts to lowercase for comparison.
 *
 * If a match is found in the existing groups, the exact canonical name of the matching
 * existing group is returned.
 * If no match is found, the original input is returned to allow for new group creation.
 *
 * @param input The raw group name string to normalize (e.g., "КН41").
 * @param existingGroups An array of existing Group objects from the database.
 * @returns The canonical group name if a match exists, otherwise the original input.
 */
export function normalizeGroupName(input: string, existingGroups: Group[]): string {
    if (!input || !input.trim())
        return input ? input.trim() : input

    // eslint-disable-next-line regexp/no-obscure-range
    const normalizedInput = input.replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase()

    // Quick exit if normalization strips everything away
    if (normalizedInput.length === 0)
        return input.trim()

    for (const group of existingGroups) {
        if (!group.name)
            continue
        // eslint-disable-next-line regexp/no-obscure-range
        const normalizedExisting = group.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase()

        if (normalizedInput === normalizedExisting) {
            return group.name // Return the exact, canonical casing/punctuation
        }
    }

    // No match found, return the sanitized string (just trimming outside whitespace)
    return input.trim()
}
