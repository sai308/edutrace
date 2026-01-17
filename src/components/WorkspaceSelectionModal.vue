<script setup>
import { ref, watch, computed } from 'vue';
import { X, Check } from 'lucide-vue-next';

const props = defineProps({
    isOpen: Boolean,
    workspaces: {
        type: Array,
        required: true
    },
    title: String,
    confirmText: String,
    mode: {
        type: String,
        default: 'export' // export, import, erase
    }
});

const emit = defineEmits(['close', 'confirm']);

const selectedIds = ref(new Set());

// Initialize selection when modal opens or workspaces change
watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        // Default to selecting all? Or none? Let's select all by default for convenience
        selectAll();
    } else {
        selectedIds.value.clear();
    }
});

const allSelected = computed(() => {
    return props.workspaces.length > 0 && selectedIds.value.size === props.workspaces.length;
});

function toggleSelection(id) {
    if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
    } else {
        selectedIds.value.add(id);
    }
}

function selectAll() {
    selectedIds.value = new Set(props.workspaces.map(w => w.id));
}

function deselectAll() {
    selectedIds.value.clear();
}

function toggleAll() {
    if (allSelected.value) {
        deselectAll();
    } else {
        selectAll();
    }
}

function handleConfirm() {
    if (selectedIds.value.size === 0) return;
    emit('confirm', Array.from(selectedIds.value));
}
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div
            class="bg-card w-full max-w-md rounded-lg shadow-lg border flex flex-col animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="p-4 border-b flex items-center justify-between">
                <h3 class="text-lg font-bold">{{ title }}</h3>
                <button @click="$emit('close')" class="p-2 hover:bg-muted rounded-full transition-colors">
                    <X class="w-5 h-5" />
                </button>
            </div>

            <!-- Content -->
            <div class="p-4 space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">
                        {{ $t('workspaceSelection.selected', { count: selectedIds.size, total: workspaces.length }) }}
                    </span>
                    <button @click="toggleAll" class="text-sm text-primary hover:underline">
                        {{ allSelected ? $t('workspaceSelection.deselectAll') : $t('workspaceSelection.selectAll') }}
                    </button>
                </div>

                <div class="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                    <div v-for="ws in workspaces" :key="ws.id"
                        class="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        @click="toggleSelection(ws.id)">
                        <div class="flex items-center gap-3">
                            <div class="w-5 h-5 rounded border flex items-center justify-center transition-colors"
                                :class="selectedIds.has(ws.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'">
                                <Check v-if="selectedIds.has(ws.id)" class="w-3.5 h-3.5" />
                            </div>
                            <div class="flex flex-col">
                                <span class="font-medium">{{ ws.name }}</span>
                                <span v-if="ws.id === 'default'" class="text-xs text-muted-foreground">
                                    {{ $t('workspaceSelection.default') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t bg-muted/10 flex justify-end gap-2">
                <button @click="$emit('close')"
                    class="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
                    {{ $t('common.cancel') }}
                </button>
                <button @click="handleConfirm" :disabled="selectedIds.size === 0"
                    class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ confirmText || $t('common.confirm') }}
                </button>
            </div>
        </div>
    </div>
</template>
