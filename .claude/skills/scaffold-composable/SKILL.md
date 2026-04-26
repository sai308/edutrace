---
name: scaffold-composable
description: Generate a Vue composable for EduTrace. Use this skill whenever the user wants to create a composable, add a useXxx function, extract reactive logic from a component, or create shared stateful logic. Always invoke this skill rather than writing composable boilerplate manually — the pattern varies by type and the toast/error handling conventions must be consistent.
---

# scaffold-composable

Generates a `use<Name>.ts` composable following one of three established patterns in the codebase.

## Step 1 — Identify the type

Ask the user (or infer from context) which type fits:

| Type | Use when | Examples |
|---|---|---|
| **A — Service bridge** | Wraps a service, exposes CRUD + loading state to a page/view | `useGroups`, `useStudents`, `useAnalyticsDetails` |
| **B — UI state** | Manages presentational state with no service dependency | `useColumnVisibility`, `useQuerySync`, `useModalClose` |
| **C — Parameterized** | Like A or B but takes arguments at call time | `useAnalyticsDetails(meetId)`, `useColumnVisibility(tableId, columns)` |

Also ask:
- **Where does it live?** Module-specific → `src/modules/<Name>/composables/`. Shared across modules → `src/composables/`.
- **What service/repositories does it call?** (Type A/C only)

## Type A — Service bridge

The most common pattern. Wraps a service, manages `isLoading`, surfaces errors as toasts, and reloads after mutations.

```typescript
import { ref } from 'vue';
import { <name>Service } from '../services/<name>.service';
import { toast } from '@/services/toast';
import type { <Name>, <Name>FormData } from '../types/<name>';

export function use<Name>() {
    const items = ref<<Name>[]>([]);
    const isLoading = ref(false);

    async function loadData() {
        isLoading.value = true;
        try {
            items.value = await <name>Service.load<Name>s();
        } catch (error) {
            console.error('Failed to load <name> data:', error);
            toast.error('Failed to load data');
        } finally {
            isLoading.value = false;
        }
    }

    async function save<Name>(formData: <Name>FormData) {
        try {
            const isUpdate = !!formData.id;
            await <name>Service.save<Name>(formData);
            await loadData();
            toast.success(isUpdate ? '<Name> updated' : '<Name> created');
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Error saving <name>');
            throw e;
        }
    }

    async function delete<Name>(id: string | number) {
        try {
            await <name>Service.delete<Name>(id);
            await loadData();
            toast.success('<Name> deleted');
        } catch (e) {
            console.error(e);
            toast.error('Error deleting <name>');
            throw e;
        }
    }

    return { items, isLoading, loadData, save<Name>, delete<Name> };
}
```

**Key conventions:**
- Toast import: `import { toast } from '@/services/toast'` — not `useToast()`
- Always re-call `loadData()` after a mutation so the list stays in sync
- Re-throw errors from mutations so the calling component can react (e.g. keep modal open)
- `isLoading` only wraps `loadData`, not individual mutations

## Type B — UI state

Pure reactive logic, no service calls. Returns state + helper functions.

```typescript
import { ref, computed, watch, type Ref } from 'vue';

export function use<Name>(<params>) {
    const <state> = ref<<Type>>(<initial>);

    // computed derived state if needed
    const <derived> = computed(() => { /* ... */ });

    // watch for side effects (e.g. persist to localStorage)
    watch(<state>, (newVal) => {
        // side effect
    });

    function <action>(<args>) {
        // mutate state
    }

    return { <state>, <derived>, <action> };
}
```

## Type C — Parameterized

Identical to A or B but accepts arguments. The argument is typically an ID or config object used to scope the data fetch.

```typescript
export function use<Name>(<param>: <ParamType>) {
    const data = ref<DataType | null>(null);
    const loading = ref(true);
    const error = ref<any>(null);

    async function load<Name>() {
        loading.value = true;
        error.value = null;
        try {
            data.value = await <name>Service.get<Name>(<param>);
        } catch (err) {
            console.error('Failed to load <name>:', err);
            error.value = err;
            toast.error('Failed to load <name>');
        } finally {
            loading.value = false;
        }
    }

    return { data, loading, error, load<Name> };
}
```

Note: parameterized composables expose `loading` (boolean, starts `true`) rather than `isLoading` (boolean, starts `false`) when the intent is to load immediately on mount.

## Placement

| Situation | Path |
|---|---|
| Used only within one module | `src/modules/<Module>/composables/use<Name>.ts` |
| Used across multiple modules or in shared components | `src/composables/use<Name>.ts` |

Do not create a shared composable for something only one module uses today — move it later if needed.
