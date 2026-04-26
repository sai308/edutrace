---
name: scaffold-module
description: Scaffold a new EduTrace feature module. Use this skill whenever the user says "add a module", "create a module", "new module", "scaffold X module", or asks to add a new feature that would need its own data store. This covers the entire module boilerplate: types, repository, service, page, view, and composable. Always invoke this skill rather than writing module files manually.
---

# scaffold-module

Generates a complete new feature module under `src/modules/<Name>/` following the exact EduTrace conventions.

## Before you write anything

Ask the user for the following if not already provided:
1. **Module name** — PascalCase, e.g. `Equipment`
2. **Store name** — the IndexedDB object store key (must match a name in `IDBCustomSchema` in `src/shared/types/Database.d.ts`). If the store doesn't exist yet, note that the user will need to add it via the `add-migration` skill.
3. **Primary entity fields** — what properties does the main entity have? e.g. `id, name, groupId`
4. **Does it need a Web Worker?** — only if the module does heavy aggregation (like Groups/Summary). Most modules don't.

Confirm before generating.

## What to generate

Create the full directory tree below. Follow each file's template from `references/templates.md`.

```
src/modules/<Name>/
  types/
    <name>.d.ts           ← entity + form data interfaces
  services/
    <name>.repository.ts  ← BaseRepository subclass + singleton export
    <name>.service.ts     ← service class + singleton export
    tests/
      <name>.service.test.ts  ← Vitest tests with mocked repositories
  composables/
    use<Name>.ts          ← reactive state + service calls
  pages/
    <Name>Page.vue        ← route component, onMounted, delegates to view
  views/
    <Name>View.vue        ← presentation, props/emits, table + modals
  components/             ← leave empty (user adds feature components later)
```

Read `references/templates.md` now — it contains the exact code templates for every file.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Module dir | PascalCase | `Equipment` |
| File names | camelCase | `equipment.repository.ts` |
| Vue components | PascalCase | `EquipmentPage.vue` |
| Store name | camelCase | `equipment` |
| Composable | `use<Name>` | `useEquipment` |
| Path alias | `@<Name>` | `@Equipment` — add to `vite.config.ts` and `tsconfig.app.json` |
| i18n namespace | lowercase | `equipment.title`, `equipment.table.name` |

## Steps after generating files

1. **Add path alias** — in both `vite.config.ts` and `tsconfig.app.json`:
   ```
   '@<Name>': fileURLToPath(new URL('./src/modules/<Name>', import.meta.url))
   ```

2. **Add route** — remind the user to use the `add-route` skill to add the page to the router.

3. **Add i18n keys** — remind the user to use the `add-i18n-key` skill to add the i18n namespace to both locale files.

4. **Add DB store** — if the store doesn't exist in `IDBCustomSchema`, remind the user to use the `add-migration` skill.

## What NOT to generate

- Don't invent fields or business logic beyond what the user described — leave method bodies as stubs with `// TODO` comments.
- Don't add error handling in the service beyond what exists in the Groups/Marks examples.
- Don't create the route or locale keys yourself — those are handled by separate skills.
