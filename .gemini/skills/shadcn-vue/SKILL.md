---
name: shadcn-vue
description: Add, install, or create shadcn-vue UI components in EduTrace. Use this skill whenever the user wants to add a UI component, install a shadcn component, create a custom component wrapper, customize an existing component's variants or styles, or use Reka UI primitives. Always invoke this skill rather than writing component boilerplate manually — the patterns for props forwarding, cn(), cva, and data-slot must be consistent across all components.
---

# shadcn-vue

Manages UI components in `src/components/ui/`. This project uses shadcn-vue (New York style, Reka UI primitives, Tailwind CSS v4, `lucide` icons).

**Config**: `components.json` at the project root — `style: "new-york"`, `typescript: true`, `baseColor: "slate"`, `iconLibrary: "lucide"`.

## Step 1 — Decide the path

Three cases:

| Situation | Action |
|---|---|
| Component exists in shadcn-vue registry | Install via CLI (fastest, correct) |
| Component doesn't exist in registry | Scaffold manually following project patterns |
| Component exists but needs customization | Edit the existing files in `src/components/ui/<name>/` |

If unsure whether a component is in the registry, assume it is and try the CLI first.

## Case A — Install from registry

```bash
pnpm dlx shadcn-vue@latest add <component-name>
```

Examples: `button`, `dialog`, `table`, `select`, `tabs`, `sheet`, `popover`, `calendar`, `date-picker`, `data-table`, `sonner`, `toast`.

After install, the component lands in `src/components/ui/<name>/` with its `.vue` files and `index.ts`.

**Do not manually recreate a component that the CLI can install.** The CLI handles Reka UI peer imports and generates the correct structure for the current shadcn-vue version.

If the user wants multiple components at once:
```bash
pnpm dlx shadcn-vue@latest add button dialog select
```

## Case B — Scaffold a custom component

When the component isn't in the registry. Follow these exact patterns from the codebase.

### Folder structure

```
src/components/ui/<name>/
  <Name>.vue     ← main component (or multiple for compound components)
  index.ts       ← re-exports + optional cva variants
```

### Pattern 1 — Simple wrapper with `Primitive` (polymorphic, supports `as`/`asChild`)

Use when the component is a single element that needs variant styling. See: `Button`, `Badge`.

**`index.ts`:**
```typescript
import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as <Name> } from "./<Name>.vue"

export const <name>Variants = cva(
  "<base-tailwind-classes>",
  {
    variants: {
      variant: {
        default: "<classes>",
        // ...
      },
      size: {
        default: "<classes>",
        sm: "<classes>",
        lg: "<classes>",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type <Name>Variants = VariantProps<typeof <name>Variants>
```

**`<Name>.vue`:**
```vue
<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { <Name>Variants } from "."
import { Primitive } from "reka-ui"
import { cn } from "@/lib/utils"
import { <name>Variants } from "."

interface Props extends PrimitiveProps {
  variant?: <Name>Variants["variant"]
  size?: <Name>Variants["size"]
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  as: "div",
})
</script>

<template>
  <Primitive
    data-slot="<name>"
    :as="as"
    :as-child="asChild"
    :class="cn(<name>Variants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
```

### Pattern 2 — Reka UI primitive wrapper (forwarded props + emits)

Use when wrapping a specific Reka UI primitive that has its own props/emits. See: `Switch`, `TooltipContent`, `Checkbox`.

```vue
<script setup lang="ts">
import type { <RekaComponent>Emits, <RekaComponent>Props } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { <RekaComponent>, useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<<RekaComponent>Props & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<<RekaComponent>Emits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <RekaComponent
    data-slot="<name>"
    v-bind="forwarded"
    :class="cn('<tailwind-classes>', props.class)"
  >
    <slot />
  </RekaComponent>
</template>
```

When the component needs `inheritAttrs: false` (e.g. it renders a portal):
```vue
defineOptions({ inheritAttrs: false })
// then use v-bind="{ ...forwarded, ...$attrs }" in template
```

### Pattern 3 — Compound component (no variants, pure layout)

Use for structural components like `DialogHeader`, `TableCell`, `CardContent` that just apply layout classes.

```vue
<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <div data-slot="<name>" :class="cn('<tailwind-classes>', props.class)">
    <slot />
  </div>
</template>
```

`index.ts` for compound components — just re-exports, no `cva`:
```typescript
export { default as <Name> } from "./<Name>.vue"
export { default as <Name>Header } from "./<Name>Header.vue"
export { default as <Name>Content } from "./<Name>Content.vue"
// etc.
```

## Case C — Customize an existing component

Read the component file before editing. Common customizations:

**Add a variant** — edit the `cva` call in `index.ts`:
```typescript
variant: {
  // existing...
  warning: "bg-yellow-500 text-white hover:bg-yellow-600",
}
```

**Adjust default Tailwind classes** — edit the base string in `cva()` or the `:class` binding in the `.vue` file. Always use `cn()` so user-provided `class` prop can still override.

**Add a new size** — add to the `size` variants object and the `defaultVariants` if it should become default.

## Rules

- Always include `data-slot="<name>"` on the root element — it's used by Tailwind CSS v4 for slot-aware styling
- Always use `cn()` from `@/lib/utils` for class merging — never concatenate strings directly
- Never import Radix Vue — this project uses **Reka UI** (`reka-ui`)
- Icons come from `lucide-vue-next`, not heroicons or other libraries
- After adding any component, verify types pass: `pnpm check`
