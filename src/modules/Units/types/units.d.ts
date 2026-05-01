export interface Unit {
    id?: number
    name: string
    normalizedName: string
    taskIds: string[]
    testTaskId: string | null
    taskCoef: number
    testCoef: number
    description?: string
    ordinal?: number
    createdAt?: string
    updatedAt?: string
}
