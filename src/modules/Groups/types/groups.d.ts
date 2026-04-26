export interface Group {
    id?: string | number
    meetId: string
    name: string
    teacher?: string
    course?: number
}

export interface GroupFormData {
    id?: string | number
    name: string
    meetId: string
    teacher?: string
    course?: number
}

/** Group enriched with aggregated statistics from the worker. */
export interface EnrichedGroup extends Group {
    avgTaskCompletion: number
    avgMark: number
    modeMark: number
    medianMark: number
}

/** Full payload returned by GroupsService.loadGroupsData(). */
export interface GroupsData {
    groups: EnrichedGroup[]
    memberCounts: Record<string, number>
    allMeetIds: string[]
    allTeachers: string[]
}
