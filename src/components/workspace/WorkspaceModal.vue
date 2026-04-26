<script setup lang="ts">
import type { Workspace } from '@/shared/types/workspaces'
import { Database, Search } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'

import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { allSelectionIcons, getIconTitle } from '@/shared/utils/workspace-utils'

// --- Props & Emits ---
const props = defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    workspaceData?: Partial<Workspace> // For edit mode
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (
        e: 'submit',
        data: { name: string; icon: string; color?: string; copySettings?: boolean },
    ): void
}>()

// --- State ---
const name = ref('')
const selectedIcon = ref('Database')
const selectedColor = ref<string | undefined>(undefined)
const copySettings = ref(false)
const iconSearch = ref('')

const workspaceColors = [
    { name: 'Default', value: undefined, class: 'bg-muted' },
    { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
    { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
    { name: 'Amber', value: '#f59e0b', class: 'bg-amber-500' },
    { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
    { name: 'Lime', value: '#84cc16', class: 'bg-lime-500' },
    { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
    { name: 'Emerald', value: '#10b981', class: 'bg-emerald-500' },
    { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
    { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
    { name: 'Sky', value: '#0ea5e9', class: 'bg-sky-500' },
    { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
    { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
    { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' },
    { name: 'Purple', value: '#a855f7', class: 'bg-purple-500' },
    { name: 'Fuchsia', value: '#d946ef', class: 'bg-fuchsia-500' },
    { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
    { name: 'Rose', value: '#f43f5e', class: 'bg-rose-500' },
]

// --- Icons Handling ---
const filteredIcons = computed(() => {
    if (!iconSearch.value) return allSelectionIcons
    const search = iconSearch.value.toLowerCase()
    return allSelectionIcons.filter(
        (icon) =>
            icon.toLowerCase().includes(search) ||
            getIconTitle(icon).toLowerCase().includes(search),
    )
})

// --- Modal Logic ---
watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            if (props.mode === 'edit' && props.workspaceData) {
                name.value = props.workspaceData.name || ''
                selectedIcon.value = props.workspaceData.icon || 'Database'
                selectedColor.value = props.workspaceData.color
                copySettings.value = false
            } else {
                // Create Mode Defaults
                name.value = ''
                selectedIcon.value = 'Database'
                selectedColor.value = undefined
                copySettings.value = false
            }
            iconSearch.value = ''
        }
    },
)

function handleSubmit() {
    if (!name.value.trim()) return

    emit('submit', {
        name: name.value.trim(),
        icon: selectedIcon.value,
        color: selectedColor.value,
        copySettings: props.mode === 'create' ? copySettings.value : undefined,
    })
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[500px] h-[80vh] sm:h-auto flex flex-col">
            <DialogHeader>
                <DialogTitle>
                    {{
                        mode === 'create'
                            ? $t('workspace.create_modal_title')
                            : $t('workspace.edit_modal_title')
                    }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        mode === 'create'
                            ? 'Create a new workspace to organize your data.'
                            : 'Update workspace details.'
                    }}
                </DialogDescription>
            </DialogHeader>

            <div class="flex-1 overflow-y-auto py-4 pr-1 space-y-6">
                <!-- Name Input -->
                <div class="space-y-2">
                    <Label>{{ $t('workspace.name_label') }}</Label>
                    <Input
                        v-model="name"
                        :placeholder="$t('workspace.name_label')"
                        @keydown.enter.prevent="handleSubmit"
                    />
                </div>

                <!-- Icon Selection -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <Label>{{ $t('workspace.icon_label') }}</Label>
                        <div class="relative w-32">
                            <Search class="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                            <Input
                                v-model="iconSearch"
                                class="h-6 pl-7 text-xs"
                                placeholder="Search..."
                            />
                        </div>
                    </div>

                    <div class="rounded-md border p-2">
                        <div class="h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                            <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                <!-- Always show Database if searching or if it's selected/default -->
                                <Button
                                    v-if="
                                        !iconSearch || 'database'.includes(iconSearch.toLowerCase())
                                    "
                                    variant="ghost"
                                    size="icon"
                                    class="h-10 w-10 hover:bg-muted transition-all duration-200"
                                    :style="{
                                        color:
                                            selectedIcon === 'Database'
                                                ? selectedColor || 'var(--primary)'
                                                : undefined,
                                        borderColor:
                                            selectedIcon === 'Database' && selectedColor
                                                ? `${selectedColor}60`
                                                : undefined,
                                        backgroundColor:
                                            selectedIcon === 'Database'
                                                ? selectedColor
                                                    ? `${selectedColor}15`
                                                    : 'color-mix(in srgb, var(--primary) 20%, transparent)'
                                                : undefined,
                                    }"
                                    :class="{
                                        'border-2': selectedIcon === 'Database' && selectedColor,
                                        'bg-primary/20':
                                            selectedIcon === 'Database' && !selectedColor,
                                    }"
                                    title="Database"
                                    @click="selectedIcon = 'Database'"
                                >
                                    <Database class="size-5" />
                                </Button>

                                <Button
                                    v-for="iconName in filteredIcons"
                                    :key="iconName"
                                    variant="ghost"
                                    size="icon"
                                    class="h-10 w-10 hover:bg-muted transition-all duration-200"
                                    :style="{
                                        color:
                                            selectedIcon === iconName
                                                ? selectedColor || 'var(--primary)'
                                                : undefined,
                                        borderColor:
                                            selectedIcon === iconName && selectedColor
                                                ? `${selectedColor}60`
                                                : undefined,
                                        backgroundColor:
                                            selectedIcon === iconName
                                                ? selectedColor
                                                    ? `${selectedColor}15`
                                                    : 'color-mix(in srgb, var(--primary) 20%, transparent)'
                                                : undefined,
                                    }"
                                    :class="{
                                        'border-2': selectedIcon === iconName && selectedColor,
                                        'bg-primary/20':
                                            selectedIcon === iconName && !selectedColor,
                                    }"
                                    :title="getIconTitle(iconName)"
                                    @click="selectedIcon = iconName"
                                >
                                    <component
                                        :is="
                                            LucideIcons[iconName as keyof typeof LucideIcons] as any
                                        "
                                        class="size-5"
                                    />
                                </Button>
                            </div>
                            <div
                                v-if="
                                    filteredIcons.length === 0 &&
                                    !'database'.includes(iconSearch.toLowerCase())
                                "
                                class="py-8 text-center text-xs text-muted-foreground"
                            >
                                No icons found.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Color Selection -->
                <div class="space-y-3">
                    <Label>{{ $t('workspace.color_label') }}</Label>
                    <div class="flex flex-wrap gap-2 p-1">
                        <button
                            v-for="color in workspaceColors"
                            :key="color.name"
                            class="size-8 rounded-full border-2 transition-all hover:scale-110"
                            :class="[
                                color.class,
                                selectedColor === color.value
                                    ? 'border-primary ring-2 ring-primary/20 scale-110'
                                    : 'border-transparent',
                            ]"
                            :title="color.name"
                            @click="selectedColor = color.value"
                        >
                            <div
                                v-if="selectedColor === color.value"
                                class="flex h-full w-full items-center justify-center"
                            >
                                <LucideIcons.Check
                                    class="size-4"
                                    :class="color.value ? 'text-white' : 'text-primary'"
                                />
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Debug Info (Edit Only) -->
                <div
                    v-if="mode === 'edit' && workspaceData?.dbName"
                    class="rounded-md border border-dashed p-3 bg-muted/20 space-y-1.5"
                >
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Storage Info
                    </p>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-muted-foreground">DB Name:</span>
                        <code class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded select-all">{{
                            workspaceData.dbName
                        }}</code>
                    </div>
                </div>

                <!-- Copy Settings (Create Only) -->
                <div
                    v-if="mode === 'create'"
                    class="flex items-start space-x-2 rounded-md border p-3 shadow-sm bg-muted/20"
                >
                    <Checkbox id="copy-settings" v-model:checked="copySettings" />
                    <div class="grid gap-1.5 leading-none">
                        <label
                            for="copy-settings"
                            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            {{ $t('workspace.copy_settings') }}
                        </label>
                        <p class="text-xs text-muted-foreground">
                            {{ $t('workspace.copy_settings_desc') }}
                        </p>
                    </div>
                </div>
            </div>

            <DialogFooter class="mt-4 gap-2">
                <DialogClose as-child>
                    <Button variant="outline" type="button">
                        {{ $t('workspace.cancel') }}
                    </Button>
                </DialogClose>
                <Button :disabled="!name.trim()" @click="handleSubmit">
                    {{
                        mode === 'create'
                            ? $t('workspace.create_button')
                            : $t('workspace.update_button')
                    }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
