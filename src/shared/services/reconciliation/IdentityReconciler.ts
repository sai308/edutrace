
import { v4 as uuidv4 } from 'uuid';
import type { Member } from '@Students/types/students';

// Since StudentsRepository is still in JS, we might need to use 'any' or define a partial interface for it
// For now, let's assume studentsRepository has an getAllMembers() method.
// We will refine this once Students module is migrated.

export interface RawStudent {
    name: string;
    email?: string;
    groupName: string;
    [key: string]: any;
}

export interface ReconciledStudent extends RawStudent {
    id: string;
    isNew: boolean;
}

export class IdentityReconciler {
    /**
     * Matches raw student data to existing members.
     */
    async resolveIdentities(rawStudents: RawStudent[], existingMembers: Member[]): Promise<ReconciledStudent[]> {
        // Create lookup maps
        const emailMap = new Map<string, Member>();
        const nameMap = new Map<string, Member>();

        existingMembers.forEach(member => {
            if (member.email) {
                emailMap.set(member.email.toLowerCase(), member);
            }
            if (member.name) {
                nameMap.set(this._normalizeName(member.name), member);
            }
        });

        return rawStudents.map(student => {
            let match: Member | null = null;
            let matchedByEmail = false;

            // Priority 1: Match by Email
            if (student.email && emailMap.has(student.email.toLowerCase())) {
                match = emailMap.get(student.email.toLowerCase())!;
                matchedByEmail = true;
            }

            // Priority 2: Match by Normalized Name (only if no email match)
            if (!match && student.name) {
                const normalizedName = this._normalizeName(student.name);
                if (nameMap.has(normalizedName)) {
                    match = nameMap.get(normalizedName)!;
                }
            }

            // Prepare result
            if (match) {
                return {
                    ...student,
                    ...match, // Keep existing member data
                    // Update email if matched by name but raw has email
                    email: !matchedByEmail && student.email ? student.email : match.email,
                    isNew: false
                } as ReconciledStudent;
            } else {
                return {
                    ...student,
                    id: uuidv4(),
                    isNew: true,
                    // Ensure email is present
                    email: student.email || ''
                } as ReconciledStudent;
            }
        });
    }

    /**
     * Normalizes a name string: lowercase, removed spaces.
     */
    private _normalizeName(name: string): string {
        if (!name) return '';
        return name.toLowerCase().replace(/\s+/g, '');
    }
}
