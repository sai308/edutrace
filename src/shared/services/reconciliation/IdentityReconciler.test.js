
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityReconciler } from './IdentityReconciler';
import { studentsRepository } from '@Students/services/students.repository';

// Mock dependencies
vi.mock('@Students/services/students.repository', () => ({
    studentsRepository: {
        getAllMembers: vi.fn()
    }
}));

vi.mock('uuid', () => ({
    v4: () => 'new-uuid-1234'
}));

describe('IdentityReconciler', () => {
    let reconciler;

    beforeEach(() => {
        reconciler = new IdentityReconciler();
        vi.clearAllMocks();
    });

    it('should match by email (Priority 1)', async () => {
        const existingMembers = [
            { id: '1', name: 'John Doe', email: 'john@example.com' }
        ];

        const rawStudents = [
            { name: 'Johnny Doe', email: 'john@example.com', groupName: 'A1' }
        ];

        const result = await reconciler.resolveIdentities(rawStudents, existingMembers);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
        expect(result[0].isNew).toBe(false);
        // Name should ideally come from existing if completely matched, or we might keep raw if we want to update? 
        // The requirement says: "Return an array of "hydrated" student objects containing: All original fields... id... isNew... email"
        // And implementation does `...student, ...match`. So match overrides student for overlapping keys (like name).
        // Let's verify that behavior.
        expect(result[0].name).toBe('John Doe');
    });

    it('should match by normalized name (Priority 2)', async () => {
        const existingMembers = [
            { id: '2', name: 'Jane Doe', email: '' }
        ];

        const rawStudents = [
            { name: 'jane doe ', email: 'jane@example.com', groupName: 'A1' }
        ];

        const result = await reconciler.resolveIdentities(rawStudents, existingMembers);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
        expect(result[0].isNew).toBe(false);
        expect(result[0].email).toBe('jane@example.com'); // hydrated with new email
    });

    it('should create new identity if no match found', async () => {
        const rawStudents = [
            { name: 'New Student', email: 'new@example.com', groupName: 'A1' }
        ];

        const result = await reconciler.resolveIdentities(rawStudents, []);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('new-uuid-1234');
        expect(result[0].isNew).toBe(true);
        expect(result[0].name).toBe('New Student');
    });

    it('should handle multiple students', async () => {
        const existingMembers = [
            { id: '1', name: 'Existing One', email: 'one@example.com' }
        ];
        studentsRepository.getAllMembers.mockResolvedValue(existingMembers);

        const rawStudents = [
            { name: 'Existing One', email: 'other@example.com', groupName: 'A1' }, // Match by name, update email? No wait, email mismatch.
            // If email is provided and doesn't match, we fall back to name match?
            // "Priority 1: Match by Email. Priority 2: Match by Normalized Name (only if email match fails)."
            // So if email is present but NOT in DB, we try name.
            { name: 'New Two', groupName: 'A1' }
        ];

        // Wait, for the first one: "Existing One" has email "one@example.com" in DB.
        // Raw has "other@example.com". 
        // 1. Match by Email: "other@example.com" not in DB.
        // 2. Match by Name: "Existing One" matches "Existing One". 
        // Should match ID '1' and update email to 'other@example.com'.

        const result = await reconciler.resolveIdentities(rawStudents, existingMembers);

        expect(result).toHaveLength(2);

        // First student
        expect(result[0].id).toBe('1');
        expect(result[0].isNew).toBe(false);
        expect(result[0].email).toBe('other@example.com');

        // Second student
        expect(result[1].id).toBe('new-uuid-1234');
        expect(result[1].isNew).toBe(true);
    });
});
