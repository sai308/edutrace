<script setup lang="ts">
import { studentsRepository } from '@Students/services/students.repository'
import { Search, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { settingsRepository } from '@/shared/services/settings.repository'

const props = withDefaults(
    defineProps<{
        open: boolean
        allUsers?: string[]
        mode?: string
    }>(),
    {
        allUsers: () => [],
        mode: 'teachers',
    },
)

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'update:items', value: string[]): void
}>()

const searchQuery = ref('')
const manualInput = ref('')
const selectedItems = ref(new Set<string>())
const items = ref<string[]>([])

async function loadData() {
    if (props.mode === 'teachers') {
        const members = await studentsRepository.getAllMembers()
        items.value = members.map((m) => m.name).sort()
        const selected = await settingsRepository.getTeachers()
        selectedItems.value = new Set(selected)
    }
}

onMounted(loadData)

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) loadData()
    },
)

watch(
    selectedItems,
    async (newSet) => {
        const list = Array.from(newSet)
        await settingsRepository.saveTeachers(list)
        emit('update:items', list)
    },
    { deep: true },
)

const sortedSelected = computed(() => {
    const list = Array.from(selectedItems.value).sort()
    if (!searchQuery.value) return list
    const q = searchQuery.value.toLowerCase()
    return list.filter((u) => u.toLowerCase().includes(q))
})

const sortedAvailable = computed(() => {
    const available = (props.allUsers ?? items.value)
        .filter((u) => !selectedItems.value.has(u))
        .sort()
    if (!searchQuery.value) return available
    const q = searchQuery.value.toLowerCase()
    return available.filter((u) => u.toLowerCase().includes(q))
})

function toggleUser(user: string) {
    if (selectedItems.value.has(user)) {
        selectedItems.value.delete(user)
    } else {
        selectedItems.value.add(user)
    }
}

function addManual() {
    const name = manualInput.value.trim()
    if (name) {
        selectedItems.value.add(name)
        manualInput.value = ''
    }
}

function clearSearch() {
    searchQuery.value = ''
}

function clearAll() {
    selectedItems.value.clear()
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader class="px-6 pt-6 pb-4 border-b shrink-0">
                <DialogTitle>{{ $t('settings.general.teachers.modal.title') }}</DialogTitle>
                <DialogDescription class="sr-only">
                    {{ $t('settings.general.teachers.modal.description') }}
                </DialogDescription>
            </DialogHeader>

            <!-- Search + manual entry (fixed, above scroll area) -->
            <div class="px-6 pt-4 pb-2 shrink-0 space-y-3">
                <!-- Manual Entry -->
                <div class="flex gap-2">
                    <Input
                        v-model="manualInput"
                        :placeholder="$t('settings.general.teachers.modal.manualPlaceholder')"
                        @keyup.enter="addManual"
                    />
                    <Button :disabled="!manualInput.trim()" @click="addManual">
                        {{ $t('settings.general.teachers.modal.add') }}
                    </Button>
                </div>

                <!-- Search -->
                <div class="relative">
                    <Search
                        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        v-model="searchQuery"
                        :placeholder="$t('settings.general.teachers.modal.searchPlaceholder')"
                        class="pl-9 pr-9"
                    />
                    <button
                        v-if="searchQuery"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        :aria-label="$t('common.clear')"
                        @click="clearSearch"
                    >
                        <X class="w-3 h-3" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <!-- Scrollable list -->
            <ScrollArea class="flex-1 min-h-0">
                <div class="px-6 py-4 space-y-4">
                    <!-- Selected -->
                    <div v-if="sortedSelected.length > 0">
                        <h4
                            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
                        >
                            {{ $t('settings.general.teachers.modal.selected') }}
                        </h4>
                        <div class="space-y-1">
                            <div
                                v-for="user in sortedSelected"
                                :key="user"
                                class="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer select-none bg-primary/5"
                                @click="toggleUser(user)"
                            >
                                <div
                                    class="w-4 h-4 rounded border flex items-center justify-center bg-primary border-primary text-primary-foreground shrink-0"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        class="w-3 h-3"
                                        aria-hidden="true"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <span class="text-sm truncate font-medium" :title="user">{{
                                    user
                                }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Available -->
                    <div v-if="sortedAvailable.length > 0">
                        <h4
                            class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
                        >
                            {{ $t('settings.general.teachers.modal.available') }}
                        </h4>
                        <div class="space-y-1">
                            <div
                                v-for="user in sortedAvailable"
                                :key="user"
                                class="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer select-none"
                                @click="toggleUser(user)"
                            >
                                <div
                                    class="w-4 h-4 rounded border border-muted-foreground shrink-0"
                                />
                                <span class="text-sm truncate" :title="user">{{ user }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Empty -->
                    <div
                        v-if="sortedSelected.length === 0 && sortedAvailable.length === 0"
                        class="text-center py-8 text-muted-foreground text-sm"
                    >
                        {{ $t('settings.general.teachers.modal.noParticipants') }}
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter
                class="px-6 py-4 border-t shrink-0 flex-row items-center justify-between gap-2"
            >
                <span class="text-sm text-muted-foreground">
                    {{
                        mode === 'teachers'
                            ? $t('settings.general.teachers.modal.teachersCount', {
                                  count: selectedItems.size,
                              })
                            : $t('settings.general.teachers.modal.ignoredCount', {
                                  count: selectedItems.size,
                              })
                    }}
                </span>
                <div class="flex gap-2">
                    <Button
                        v-if="selectedItems.size > 0"
                        variant="ghost"
                        class="text-destructive hover:text-destructive"
                        @click="clearAll"
                    >
                        {{ $t('settings.general.teachers.modal.clearAll') }}
                    </Button>
                    <Button @click="emit('update:open', false)">
                        {{ $t('settings.general.teachers.modal.done') }}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
