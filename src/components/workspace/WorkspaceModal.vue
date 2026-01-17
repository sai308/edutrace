<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Database, Search } from 'lucide-vue-next';
import * as LucideIcons from 'lucide-vue-next';
import { allSelectionIcons, getIconTitle } from '@/shared/utils/workspace-utils';
import type { Workspace } from '@/shared/types/workspaces';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// --- Props & Emits ---
const props = defineProps<{
    open: boolean;
    mode: 'create' | 'edit';
    workspaceData?: Partial<Workspace>; // For edit mode
}>();

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void;
    (e: 'submit', data: { name: string; icon: string; copySettings?: boolean }): void;
}>();

// --- State ---
const name = ref('');
const selectedIcon = ref('Database');
const copySettings = ref(false);
const iconSearch = ref('');

// --- Icons Handling ---
const filteredIcons = computed(() => {
    if (!iconSearch.value) return allSelectionIcons;
    const search = iconSearch.value.toLowerCase();
    return allSelectionIcons.filter(icon => 
        icon.toLowerCase().includes(search) || 
        getIconTitle(icon).toLowerCase().includes(search)
    );
});

// --- Modal Logic ---
watch(() => props.open, (isOpen) => {
    if (isOpen) {
        if (props.mode === 'edit' && props.workspaceData) {
            name.value = props.workspaceData.name || '';
            selectedIcon.value = props.workspaceData.icon || 'Database';
            copySettings.value = false;
        } else {
            // Create Mode Defaults
            name.value = '';
            selectedIcon.value = 'Database';
            copySettings.value = false;
        }
        iconSearch.value = '';
    }
});

const handleSubmit = () => {
    if (!name.value.trim()) return;
    
    emit('submit', {
        name: name.value.trim(),
        icon: selectedIcon.value,
        copySettings: props.mode === 'create' ? copySettings.value : undefined
    });
};
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[500px] h-[80vh] sm:h-auto flex flex-col">
            <DialogHeader>
                <DialogTitle>{{ mode === 'create' ? $t('workspace.create_modal_title') : $t('workspace.edit_modal_title') }}</DialogTitle>
                <DialogDescription>
                    {{ mode === 'create' ? 'Create a new workspace to organize your data.' : 'Update workspace details.' }}
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
                        <div class="h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            <div class="grid grid-cols-6 gap-2">
                                <!-- Always show Database if searching or if it's selected/default -->
                                <Button
                                    v-if="!iconSearch || 'database'.includes(iconSearch.toLowerCase())"
                                    variant="ghost"
                                    size="icon"
                                    class="h-10 w-10 hover:bg-muted"
                                    :class="{ 'bg-primary/20 hover:bg-primary/30 text-primary': selectedIcon === 'Database' }"
                                    @click="selectedIcon = 'Database'"
                                    :title="'Database'"
                                >
                                    <Database class="size-5" />
                                </Button>

                                <Button
                                    v-for="iconName in filteredIcons"
                                    :key="iconName"
                                    variant="ghost"
                                    size="icon"
                                    class="h-10 w-10 hover:bg-muted"
                                    :class="{ 'bg-primary/20 hover:bg-primary/30 text-primary': selectedIcon === iconName }"
                                    @click="selectedIcon = iconName"
                                    :title="getIconTitle(iconName)"
                                >
                                    <component :is="(LucideIcons[iconName as keyof typeof LucideIcons] as any)" class="size-5" />
                                </Button>
                            </div>
                            <div v-if="filteredIcons.length === 0 && !'database'.includes(iconSearch.toLowerCase())" class="py-8 text-center text-xs text-muted-foreground">
                                No icons found.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Copy Settings (Create Only) -->
                <div v-if="mode === 'create'" class="flex items-start space-x-2 rounded-md border p-3 shadow-sm bg-muted/20">
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
                    {{ mode === 'create' ? $t('workspace.create_button') : $t('workspace.update_button') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
