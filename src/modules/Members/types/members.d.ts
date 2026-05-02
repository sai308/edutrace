export interface Member {
    id: string
    name: string
    email?: string
    groupName: string | null
    role: 'student' | 'teacher' | 'assistant'
    hidden?: boolean
    aliases?: string[]
    createdAt?: string
    iep?: string
    [key: string]: any
}

export interface MemberFormData {
    name: string
    email: string
    groupName: string | null
    role: 'student' | 'teacher' | 'assistant'
    iep: string
}
