# Edge-Case Guidelines

This document records performance and correctness edge cases that have been diagnosed and fixed in EduTrace, along with the rules that prevent them from recurring.

---

## 1. Page freeze and memory leak on TanStack table search

### Symptoms

Typing in a search input bound to a TanStack table caused the page to freeze for several hundred milliseconds per keystroke and memory to climb continuously (observed: 308 MB, 182% CPU in Chrome Task Manager with ~500 students loaded).

### Root causes

Five independent issues compounded each other:

**1. No debounce on the search input**

`v-model="searchQuery"` was bound directly to the `<Input>`. Every keystroke synchronously triggered `table.setGlobalFilter()`, which runs TanStack's full filter pass across all rows, then re-renders all visible rows.

**2. Unstable `data` reference in `useVueTable`**

```ts
// BAD — new array reference on every call
const table = useVueTable({
    get data() {
        return props.students.filter((s) => !props.teachers.has(s.name))
    },
})
```

`Array.filter` always returns a new reference. TanStack compares `data` by reference on every render cycle; a new reference means it rebuilds all internal `Row` objects from scratch, allocating hundreds of short-lived objects per keystroke that outpace GC.

**3. `Array.from()` inside column `accessorFn`**

```ts
// BAD — allocates a new array for every row on every filter pass
accessorFn: (row) => Array.from(row.groups).join(' ')
```

`processData` in `studentStatsService` already converts `groups` and `meetIds` from `Set` to `Array` before storing them. The `Array.from` call on an already-plain array created an unnecessary copy per row per keystroke.

**4. Deep `ref` on a large array of complex objects**

```ts
// BAD — Vue deep-proxies every field of every StudentDashboardStats
const students = ref<StudentDashboardStats[]>([])
```

Each field access from a TanStack column accessor went through Vue's reactive proxy and registered a dependency. With hundreds of students and multiple columns, this created enormous tracking overhead per filter evaluation.

**5. `.has()` called on a plain Array (always returns `undefined`)**

The type declared `groups: Set<string>`, but the actual runtime value is `string[]` after `processData`. Calling `.has()` on an Array is `undefined` (falsy), so the group column filter was silently always-false, and a watcher in `StudentsView.vue` that used the same `.has()` call could mutate `selectedGroup` on every data load, causing additional reactive churn.

### Fixes

**Debounce the search input.** Keep a raw `searchInput` ref for the `<Input>` binding and a debounced `searchQuery` ref for the table and URL sync:

```ts
import { useDebounceFn } from '@vueuse/core'

const searchInput = ref('')
const searchQuery = ref('')
const updateSearchQuery = useDebounceFn((v: string) => { searchQuery.value = v }, 200)
```

```html
<Input
    :model-value="searchInput"
    @update:model-value="(v) => { searchInput = String(v); updateSearchQuery(String(v)) }"
/>
```

**Stabilize the `data` reference with `computed`.** Move the filter outside `useVueTable` into a `computed` so TanStack receives the same array reference when the underlying data has not changed:

```ts
const tableData = computed(() =>
    props.students.filter((s) => !props.teachers.has(s.name))
)

const table = useVueTable({
    get data() { return tableData.value },
    // ...
})
```

**Use `shallowRef` for large data arrays.** The composable that loads data should use `shallowRef` so Vue only tracks the array reference itself, not the fields of each item:

```ts
// composables/useStudents.ts
const students = shallowRef<StudentDashboardStats[]>([])
```

**Remove `Array.from()` copies in `accessorFn`.** When the service already converts Sets to Arrays before storing, call `.join()` directly:

```ts
// columns.ts
accessorFn: (row) => (row.groups as unknown as string[]).join(' ')
```

**Use `.includes()` instead of `.has()` for Array membership checks.** Anywhere the type says `Set<string>` but the runtime value is `string[]`:

```ts
// BAD
filterFn: (row, _id, value: string) => row.original.groups.has(value)

// GOOD
filterFn: (row, _id, value: string) => (row.original.groups as unknown as string[]).includes(value)
```

If a Set is genuinely needed (e.g. for O(1) lookup inside a `processData` loop), keep it as a Set in the intermediate computation and only convert to an Array at the end when storing to the reactive ref.

### Rules going forward

- **Always debounce search inputs** that drive a TanStack global filter. 150–200 ms is the right window — responsive enough to feel instant, long enough to skip intermediate keystrokes.
- **Never put `Array.filter` (or any expression that allocates a new reference) directly inside `useVueTable`'s `get data()` getter.** Always use a `computed`.
- **Use `shallowRef` for any module-level data array** loaded from IndexedDB and passed as a prop to a table. Deep reactivity on row objects is never needed since TanStack owns row state.
- **Do not duplicate Set→Array conversions.** If `processData` already materializes a field as an array, treat it as an array everywhere downstream — fix the type if needed.
- **Audit `Set` method calls** (`.has`, `.forEach`, `.add`) on values that cross the `processData` boundary. After `processData` runs, collection fields are plain arrays.
