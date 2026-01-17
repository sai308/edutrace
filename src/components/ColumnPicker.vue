<script setup>
import { ref } from 'vue';
import { Columns, RotateCcw } from 'lucide-vue-next';

const props = defineProps({
    columns: {
        type: Array,
        required: true
    },
    visibleColumns: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['toggle-column', 'reset']);

const isOpen = ref(false);

function toggleDropdown() {
    isOpen.value = !isOpen.value;
}

function closeDropdown() {
    isOpen.value = false;
}

function handleToggleColumn(columnId) {
    emit('toggle-column', columnId);
}

function handleReset() {
    emit('reset');
    closeDropdown();
}
</script>

<template>
    <div class="relative column-picker-container" v-click-outside="closeDropdown">
        <button @click="toggleDropdown"
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border bg-background hover:bg-muted transition-colors"
            :class="{ 'bg-muted': isOpen }">
            <Columns class="w-4 h-4" />
            <span class="hidden sm:inline">{{ $t('columnPicker.button') }}</span>
            <span class="text-xs text-muted-foreground">({{ Object.values(visibleColumns).filter(Boolean).length
            }})</span>
        </button>

        <Transition name="dropdown">
            <div v-if="isOpen"
                class="absolute right-0 mt-2 w-64 rounded-md border bg-popover shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="p-3 border-b">
                    <div class="flex items-center justify-between">
                        <h3 class="font-medium text-sm">{{ $t('columnPicker.title') }}</h3>
                        <button @click="handleReset"
                            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            :title="$t('columnPicker.reset')">
                            <RotateCcw class="w-3 h-3" />
                            {{ $t('columnPicker.reset') }}
                        </button>
                    </div>
                </div>

                <div class="p-2 max-h-80 overflow-y-auto">
                    <label v-for="column in columns" :key="column.id"
                        class="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                        <input type="checkbox" :checked="visibleColumns[column.id]"
                            @change="handleToggleColumn(column.id)"
                            class="rounded border-gray-300 text-primary focus:ring-primary" />
                        <span class="text-sm">{{ column.label }}</span>
                    </label>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
