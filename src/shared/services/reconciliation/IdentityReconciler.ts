import type { Member } from '@Students/types/students'
import { v4 as uuidv4 } from 'uuid'

// Since StudentsRepository is still in JS, we might need to use 'any' or define a partial interface for it
// For now, let's assume studentsRepository has an getAllMembers() method.
// We will refine this once Students module is migrated.

export interface RawStudent {
    name: string
    email?: string
    groupName: string
    [key: string]: any
}

export interface ReconciledStudent extends RawStudent {
    id: string
    isNew: boolean
}

export class IdentityReconciler {
    /**
     * Matches raw student data to existing members.
     */
    async resolveIdentities(rawStudents: RawStudent[], existingMembers: Member[]): Promise<ReconciledStudent[]> {
        // Create lookup maps
        const emailMap = new Map<string, Member>()
        const nameMap = new Map<string, Member>()

        existingMembers.forEach((member) => {
            if (member.email) {
                emailMap.set(member.email.toLowerCase(), member)
            }
            if (member.name) {
                nameMap.set(this._normalizeName(member.name), member)
            }
        })

        const results: ReconciledStudent[] = []

        for (const student of rawStudents) {
            let match: Member | null = null
            let matchedByEmail = false

            // Priority 1: Match by Email
            if (student.email && emailMap.has(student.email.toLowerCase())) {
                match = emailMap.get(student.email.toLowerCase())!
                matchedByEmail = true
            }

            // Priority 2: Match by Normalized Name (only if no email match)
            if (!match && student.name) {
                const normalizedName = this._normalizeName(student.name)
                if (nameMap.has(normalizedName)) {
                    match = nameMap.get(normalizedName)!
                }
            }

            let result: ReconciledStudent

            if (match) {
                result = {
                    ...student,
                    ...match, // Keep existing member data
                    // Update email if matched by name but raw has email
                    email: !matchedByEmail && student.email ? student.email : match.email,
                    // Update groupName if existing is 'Unknown' or empty, and new is valid
                    groupName:
                        (match.groupName === 'Unknown' || !match.groupName) &&
                        student.groupName &&
                        student.groupName !== 'Unknown'
                            ? student.groupName
                            : match.groupName,
                    isNew: false,
                } as ReconciledStudent
            } else {
                result = {
                    ...student,
                    id: uuidv4(),
                    isNew: true,
                    // Ensure email is present
                    email: student.email || '',
                } as ReconciledStudent

                // Add newly created student to maps to prevent duplicates within the same batch
                const newMember = result as unknown as Member
                if (result.email) {
                    emailMap.set(result.email.toLowerCase(), newMember)
                }
                if (result.name) {
                    nameMap.set(this._normalizeName(result.name), newMember)
                }
            }
            results.push(result)
        }

        return results
    }

    /**
     * Normalizes a name string: lowercase, removed spaces.
     */
    private _normalizeName(name: string): string {
        if (!name) return ''
        return name.toLowerCase().replace(/\s+/g, '')
    }
}
