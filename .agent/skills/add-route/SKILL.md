---
name: add-route
description: Add a new route to the EduTrace router and sidebar. Use this skill whenever the user wants to add a new page, register a new route, add a navigation item to the sidebar, or wire a new module's page into the app. Always invoke this skill rather than editing router/index.ts or DashboardSidebar.vue manually — both files must be updated together and the breadcrumb/meta structure must be correct.
---

# add-route

Updates two files together:
- `src/router/index.ts` — the route definition
- `src/components/layout/DashboardSidebar.vue` — the sidebar nav item

## Step 1 — Clarify the route

Ask the user (if not already clear):
1. **URL path** — which nav section does it belong to?
   - `/attendance/<slug>` — Attendance group
   - `/org/<slug>` — Organization group
   - `/control/<slug>` — Control group
   - `/documents/<slug>` — Documents group
2. **Route name** — PascalCase unique identifier, e.g. `Equipment`
3. **Page component path** — e.g. `@/modules/Equipment/pages/EquipmentPage.vue`
4. **`meta.title`** — an i18n key from `nav.*`, e.g. `nav.equipment`
5. **Does it have a detail route?** — e.g. `/:id` child with its own breadcrumb
6. **Does it pass props?** — set `props: true` if the page uses route params as props
7. **Sidebar nav item** — title text (Ukrainian), icon from `lucide-vue-next`

## Step 2 — Add the route to `src/router/index.ts`

Read the file first. Insert the new route inside the `DashboardLayout` children array, grouped with its nav section siblings.

**Standard page route:**
```ts
{
    path: '<section>/<slug>',
    name: '<RouteName>',
    component: () => import('@/modules/<Name>/pages/<Name>Page.vue'),
    meta: {
        title: 'nav.<slug>',
        breadcrumbs: [
            { title: 'nav.navGroups.<section>', path: '/<section>/<first-route>' }
        ]
    }
},
```

**With a detail child route** (add as a separate sibling, not nested):
```ts
{
    path: '<section>/<slug>/:id',
    name: '<RouteName>Details',
    component: () => import('@/modules/<Name>/pages/<Name>DetailsPage.vue'),
    props: true,
    meta: {
        title: '<name>.details.title',
        breadcrumbs: [
            { title: 'nav.navGroups.<section>', path: '/<section>/<first-route>' },
            { title: 'nav.<slug>', path: '/<section>/<slug>' }
        ]
    }
},
```

**Breadcrumb rules:**
- First breadcrumb is always the nav group (e.g. `nav.navGroups.attendance`)
- Its `path` points to the first real route in that group (see existing entries)
- Detail routes add the list route as a second breadcrumb
- Use the i18n key string, not the translated text — the header component resolves it at render time

## Step 3 — Add the sidebar item to `DashboardSidebar.vue`

Read the file first. Find the correct `navMain` group by its `url` prefix and add the item inside its `items` array.

**Nav item shape:**
```ts
{
    title: '<Ukrainian title>',
    icon: <IconName>,
    url: '/<section>/<slug>',
    isActive: route.path.startsWith('/<section>/<slug>'),
},
```

**Icon selection:**
- Import the icon from `lucide-vue-next` at the top of the script block
- Pick something semantically fitting — browse existing icons already imported as reference
- If unsure, ask the user

**Sidebar placement:** insert before the Settings item in the target group (Settings is always last).

## Step 4 — Add the i18n key

If `nav.<slug>` doesn't exist yet in the locale files, remind the user to add it with the `add-i18n-key` skill. The key must be in both `en-US.json` and `uk-UA.json`.

Note: the sidebar currently uses **hardcoded Ukrainian strings** (not i18n keys). When adding a sidebar item, use the Ukrainian title directly as `title` — don't introduce a `t()` call unless the user explicitly wants to migrate that section to i18n.

## Step 5 — Verify

Run the dev server mentally: check that the path doesn't conflict with an existing route name (duplicates like the two `ControlSettings` entries in the current file should not be repeated).

```bash
pnpm check
```
