import type { Component } from 'vue'

/**
 * A single entry in a row action menu.
 *
 * Use `{ type: 'separator' }` to insert a visual divider between item groups.
 * All other entries are action items and require at minimum a `label` and `onSelect`.
 */
export type RowActionItem =
    | { type: 'separator' }
    | {
          type?: 'action'
          /** Display text — shown to the right of the icon */
          label: string
          /** Lucide icon component — sized and coloured automatically by the menu */
          icon?: Component
          /** Renders the item in destructive (red) colours including its icon */
          destructive?: boolean
          disabled?: boolean
          onSelect: () => void
      }
