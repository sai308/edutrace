---
name: shadcn-vue-migrator
description: Automates the migration from custom Vue components to the shadcn-vue library. Use this when I want to replace a custom UI element with a standardized shadcn-vue component.
---

# shadcn-vue Migrator

## Goal
To efficiently migrate custom, shadcn-like components to official `shadcn-vue` components while maintaining consistent styling and props mapping.

## Instructions
1. **Reference Check**: Always consult `.agent/skills/shadcn-vue-migrator/resources/REFERENCE.md` to identify the correct `shadcn-vue` component for the task.
2. **Analyze existing component**: When asked to migrate a component, read the source code of the custom component to identify its props, slots, and events.
3. **Check shadcn-vue availability**: Check `components.json` to see where UI components are stored. Check if the target `shadcn-vue` component is already installed in `@/components/ui`.
4. **Install if missing**: If the component is missing, execute `pnpm dlx shadcn-vue@latest add [component-name]`.
5. **Refactor Imports**: 
   - Replace local custom imports with `@/components/ui/[component]`.
   - Update component registration in the parent file.
6. **Map Props and Logic**:
   - Map custom props (e.g., `theme="primary"`) to shadcn variants (e.g., `variant="default"`).
   - Ensure `v-model` and event listeners (`@click`, etc.) are preserved.
7. **Validation**: Use the `cn()` utility for dynamic class merging and ensure all `...props` are spread to maintain accessibility attributes.
8. **Cleanup**: After successful migration and verification, ask if the old custom component file should be deleted.

## CLI Integration
Execute `pnpm dlx shadcn-vue@latest add [component]` if the registry item is not present in the local project.

## Constraints
- **Preserve custom logic**: Do not remove any business logic or unique analytics hooks embedded in the custom components.
- **Tailwind Consistency**: Ensure the `tailwind.config.js` is updated if the new component requires specific plugins (like `tailwindcss-animate`).
- **Accessibility**: Verify that the new component maintains or improves the accessibility (ARIA labels) of the original.

## Example Migration
**Input**: "Migrate my custom AppButton.vue usage in Home.vue to shadcn-vue Button."

**Action**: 
1. Agent runs `pnpm dlx shadcn-vue@latest add button`.
2. Agent modifies `Home.vue`:
   - From: `import AppButton from '@/components/AppButton.vue'`
   - To: `import { Button } from '@/components/ui/button'`
3. Agent updates template:
   - From: `<AppButton type="danger" @click="handle">Delete</AppButton>`
   - To: `<Button variant="destructive" @click="handle">Delete</Button>`

### Master Migration Mapping Table

| Legacy/Custom Component | shadcn-vue Target | Installation Command | Mapping Logic & Key Props |
| --- | --- | --- | --- |
| **BaseButton** | **Button** | `npx shadcn-vue@latest add button` | `type` → `variant` (`primary`=default, `danger`=destructive). |
| **BaseInput** | **Input** | `npx shadcn-vue@latest add input` | Extract `label` prop to separate `<Label>` component. |
| **BaseCard** | **Card** | `npx shadcn-vue@latest add card` | Map `header`/`footer` slots to `CardHeader` and `CardFooter`. |
| **BaseDialog** / **BaseModal** | **Dialog** | `npx shadcn-vue@latest add dialog` | `v-model:visible` → `v-model:open`. Use `DialogContent` for body. |
| **BaseBadge** / **BaseTag** | **Badge** | `npx shadcn-vue@latest add badge` | Map `color` or `status` to `variant`. |
| **BaseSelect** | **Select** | `npx shadcn-vue@latest add select` | Map array items to `SelectItem` inside `SelectContent`. |
| **BaseCheckbox** | **Checkbox** | `npx shadcn-vue@latest add checkbox` | Map `v-model` directly. |
| **BaseSwitch** | **Switch** | `npx shadcn-vue@latest add switch` | Standard boolean toggle. |
| **BaseTable** | **Table** | `npx shadcn-vue@latest add table` | Replace template `thead`/`tbody` with `TableHeader`/`TableBody`. |
| **BaseTabs** | **Tabs** | `npx shadcn-vue@latest add tabs` | `v-model` → `default-value`. Map slots to `TabsContent`. |
| **BaseAvatar** | **Avatar** | `npx shadcn-vue@latest add avatar` | Split `src` and `initials` into `AvatarImage` and `AvatarFallback`. |
| **BaseTooltip** | **Tooltip** | `npx shadcn-vue@latest add tooltip` | Wrap target in `TooltipTrigger`. |

### Implementation Guidelines for Edutrace

To maintain consistency during the migration of your educational tracking app, follow these architectural rules:

* **Atomic Refactoring**: Do not migrate entire views at once. Start with the "leaf" components (Buttons, Inputs) before moving to "composite" components (Cards, Dialogs).
* **Form Integration**: For components like `BaseInput`, transition to the official `shadcn-vue` Form pattern which uses **VeeValidate** for schema-based validation.
* **Utility Usage**: Always use the provided `cn()` utility for class merging to ensure your custom Tailwind classes do not conflict with `shadcn-vue` defaults.
* **CLI Automation**: Since you are using a standard CLI setup, you can install multiple components at once using `npx shadcn-vue@latest add button input card`.
