# Members Module

## Purpose

Manages the full roster of participants in the system — students, teachers, and assistants. Provides create, edit, soft-delete, restore, and hard-delete operations on member records. Members are the shared identity entity referenced by every other module (marks, analytics, sessions, plans).

**Primary users:** Administrators and teachers maintaining the participant directory.

---

## Directory Structure

```
Members/
├── pages/
│   └── MembersPage.vue              Route entry point (thin wrapper)
├── composables/
│   ├── useMembers.ts                All reactive state and CRUD handlers
│   └── tests/
│       └── useMembers.test.ts
├── services/
│   ├── members.service.ts           saveMember(), validateMemberForm()
│   └── tests/
│       └── members.service.test.ts
└── components/
    ├── MembersView.vue              Layout container (thin; delegates to useMembers)
    ├── dialogs/
    │   └── MemberDialog.vue         Create/edit member modal
    └── MembersList/
        ├── DataTable.vue            TanStack table wrapper
        └── columns.ts               Column definitions + getRoleBadgeVariant()
```

> The module uses the `@Members` path alias.  
> It does not own a repository — it reuses `studentsRepository` from the Students module via `@Students/services/students.repository`.

---

## Data Model

### Member
```typescript
{
  id: string
  name: string                              // Required
  email?: string
  groupName: string                         // Required for students; null for teachers/assistants
  role: 'student' | 'teacher' | 'assistant'
  hidden?: boolean                          // Soft-delete flag
  aliases?: string[]                        // Alternative names for identity matching
  createdAt?: string
  iep?: string                              // Individualized Education Plan identifier (students only)
  [key: string]: any
}
```

---

## Architecture

### `useMembers` composable
Owns all reactive state and async CRUD operations consumed by `MembersView.vue`:

| Export | Description |
|---|---|
| `members`, `isLoading`, `searchQuery` | List state |
| `isDialogOpen`, `selectedMember` | Add/edit dialog state |
| `isDeleteDialogOpen`, `isHardDeleteDialogOpen`, `memberToDelete` | Confirm-delete dialog state |
| `allGroups` | Computed — unique sorted group names from current members |
| `loadMembers()` | Fetches all members including hidden |
| `openAddDialog()`, `handleEdit(member)` | Dialog open actions |
| `handleSave(formData)` | Delegates to `membersService.saveMember()` then reloads |
| `confirmDelete(member)`, `executeSoftDelete()` | Soft-delete flow |
| `handleRestore(member)` | Restore hidden member |
| `confirmHardDelete(member)`, `executeHardDelete()` | Permanent delete flow |

### `membersService`
Business logic layer:

| Export | Description |
|---|---|
| `saveMember(formData, existingMember \| null)` | Builds Member payload and delegates to repository |
| `validateMemberForm(formData)` | Pure synchronous validation; returns `{ valid, errors }` |

---

## Business Rules & Logic

### Validation Rules

| Field | Rule |
|---|---|
| `name` | Required — must be non-empty after trim |
| `groupName` | Required for `student` role; ignored for `teacher` / `assistant` |

### Role-Based Field Constraints
- **Students**: `groupName` is required; `iep` field is visible and editable.
- **Teachers / Assistants**: `groupName` is forced to `null`; `iep` field is hidden and cleared.
- Changing role to teacher/assistant automatically clears existing group and IEP values in the form.

### Soft Delete vs Hard Delete
- **Soft delete** (`hidden = true`): member record is retained; displayed as "Deleted" with limited actions.
- **Hard delete**: permanently removes the record; only available for already-soft-deleted members.
- **Restore**: sets `hidden = false`; re-activates the member.

### Group Autocomplete
- Group name field uses a filtered autocomplete dropdown populated from existing groups.
- Dropdown opens on focus and on chevron button click; closes immediately on selection.

### Teacher Role Sync
- When the `teachers` settings list is updated via `settingsRepository.saveTeachers()`, all member records are iterated: members whose names appear in the list receive `role = 'teacher'`; all others revert to `role = 'student'`.

---

## UI Behavior

### MemberDialog
- **Add mode**: blank form, role defaults to `student`.
- **Edit mode**: form pre-filled with existing member data.
- Validation (via `validate()` — UI-local, translated): name required; group required when role is `student`.

### Members Table (TanStack)
Columns: select checkbox, Name, Email, Role, Status, Group, IEP.

- **Role badge**: teacher = `default`, assistant = `outline`, student = `secondary` (computed by `getRoleBadgeVariant()`).
- **Status badge**: Active (green) / Deleted (red, faded).
- **Row actions** (dropdown):
  - Active members: Copy ID, Edit, Delete (soft).
  - Deleted members: Copy ID, Restore, Delete Permanently.
- Sortable on all text columns.

---

## Settings

| Key | Effect on Members |
|---|---|
| `teachers` | Syncs `role` field across all member records when the list changes |
| `defaultTeacher` | Not used directly by Members; consumed by Groups and other modules |
