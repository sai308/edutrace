<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Search, X } from 'lucide-vue-next';
import { studentsRepository } from '@Students/services/students.repository';
import { settingsRepository } from '@/shared/services/settings.repository';

const props = defineProps({
  isOpen: Boolean,
  allUsers: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'teachers' // 'teachers' is now the primary/only mode
  }
});

const emit = defineEmits(['close', 'update:items']);

import { useModalClose } from '../composables/useModalClose';

useModalClose(() => props.isOpen, () => {
  emit('close');
});


const searchQuery = ref('');
const manualInput = ref('');
const selectedItems = ref(new Set());
const items = ref([]); // Added to support the new onMounted logic

// Load initial state
async function loadData() {
  if (props.mode === 'teachers') {
    // For teachers mode, we want to show ALL members so we can select who is a teacher
    const members = await studentsRepository.getAllMembers();
    // Filter out duplicates by name just in case, though DB enforces unique name
    items.value = members.map(m => m.name).sort();

    // Load currently selected teachers
    const selected = await settingsRepository.getTeachers();
    selectedItems.value = new Set(selected);
  } else {
    // ... other modes
  }
}

onMounted(loadData);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadData();
  }
});

// Watch for changes and save
watch(selectedItems, async (newSet) => {
  const items = Array.from(newSet);
  await settingsRepository.saveTeachers(items);
  emit('update:items', items);
}, { deep: true });

const sortedSelected = computed(() => {
  const list = Array.from(selectedItems.value).sort();
  if (!searchQuery.value) return list;
  const query = searchQuery.value.toLowerCase();
  return list.filter(u => u.toLowerCase().includes(query));
});

const sortedAvailable = computed(() => {
  // Filter out selected items from allUsers
  const available = props.allUsers.filter(u => !selectedItems.value.has(u));
  const list = available.sort();

  if (!searchQuery.value) return list;
  const query = searchQuery.value.toLowerCase();
  return list.filter(u => u.toLowerCase().includes(query));
});

function toggleUser(user) {
  if (selectedItems.value.has(user)) {
    selectedItems.value.delete(user);
  } else {
    selectedItems.value.add(user);
  }
}

function addManual() {
  const name = manualInput.value.trim();
  if (name) {
    selectedItems.value.add(name);
    manualInput.value = '';
  }
}

function clearSearch() {
  searchQuery.value = '';
}

function clearAll() {
  selectedItems.value.clear();
}
</script>

<template>
  <div v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm !-mt-6 p-4 animate-in fade-in duration-200">
    <div
      class="bg-card w-full max-w-2xl rounded-lg shadow-lg border flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">

      <!-- Header -->
      <div class="p-4 border-b flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ $t('settings.general.teachers.modal.title') }}</h3>
        <button @click="$emit('close')" class="p-2 hover:bg-muted rounded-full transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-4">
        <!-- Manual Entry -->
        <div class="flex gap-2">
          <input v-model="manualInput" type="text"
            :placeholder="$t('settings.general.teachers.modal.manualPlaceholder')"
            class="flex-1 px-3 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            @keyup.enter="addManual" />
          <button @click="addManual" :disabled="!manualInput.trim()"
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50">
            {{ $t('settings.general.teachers.modal.add') }}
          </button>
        </div>

        <!-- Search -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input v-model="searchQuery" type="text"
            :placeholder="$t('settings.general.teachers.modal.searchPlaceholder')"
            class="w-full pl-9 pr-9 py-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          <button v-if="searchQuery" @click="clearSearch"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto min-h-[200px] space-y-4 p-4">

        <!-- Selected Section -->
        <div v-if="sortedSelected.length > 0">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{{
            $t('settings.general.teachers.modal.selected') }}</h4>
          <div class="space-y-1">
            <div v-for="user in sortedSelected" :key="user"
              class="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer select-none bg-primary/5"
              @click="toggleUser(user)">
              <div
                class="w-4 h-4 rounded border flex items-center justify-center transition-colors bg-primary border-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span class="text-sm truncate font-medium" :title="user">{{ user }}</span>
            </div>
          </div>
        </div>

        <!-- Available Section -->
        <div v-if="sortedAvailable.length > 0">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{{
            $t('settings.general.teachers.modal.available') }}</h4>
          <div class="space-y-1">
            <div v-for="user in sortedAvailable" :key="user"
              class="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer select-none"
              @click="toggleUser(user)">
              <div
                class="w-4 h-4 rounded border border-muted-foreground flex items-center justify-center transition-colors">
              </div>
              <span class="text-sm truncate" :title="user">{{ user }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="sortedSelected.length === 0 && sortedAvailable.length === 0"
          class="text-center py-8 text-muted-foreground text-sm">
          {{ $t('settings.general.teachers.modal.noParticipants') }}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t bg-muted/10 flex justify-between items-center">
        <span class="text-sm text-muted-foreground">
          {{ mode === 'teachers' ? $t('settings.general.teachers.modal.teachersCount', { count: selectedItems.size }) :
            $t('settings.general.teachers.modal.ignoredCount', { count: selectedItems.size }) }}
        </span>
        <div class="flex gap-2">
          <button v-if="selectedItems.size > 0" @click="clearAll"
            class="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors">
            {{ $t('settings.general.teachers.modal.clearAll') }}
          </button>
          <button @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
            {{ $t('settings.general.teachers.modal.done') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
