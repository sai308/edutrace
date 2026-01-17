<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useVirtualList } from '@vueuse/core';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X, Edit2, Trash2, User, Loader2, ChevronDown, Columns } from 'lucide-vue-next';
import EditStudentModal from '../components/EditStudentModal.vue';
import StudentProfileModal from '../components/StudentProfileModal.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { useQuerySync } from '@/composables/useQuerySync';
import { useColumnVisibility } from '@/composables/useColumnVisibility';

import { useFormatters } from '@/composables/useFormatters';
import { useSort } from '@/composables/useSort';
import { useColors } from '@/composables/useColors';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const { t } = useI18n();

const props = defineProps({
  students: {
    type: Array,
    default: () => []
  },
  groupsMap: {
    type: Object,
    default: () => ({})
  },
  teachers: {
    type: Set,
    default: () => new Set()
  },
  meets: {
    type: Array,
    default: () => []
  },
  tasks: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['save-student', 'delete-student', 'bulk-delete-students', 'refresh']);
const { formatDuration } = useFormatters();
const { sortField, sortDirection, toggleSort } = useSort('name', 'asc');
const { getScoreColor } = useColors();

const router = useRouter();
const searchQuery = ref('');
const selectedGroup = ref(null);

// Column visibility setup
const columns = computed(() => [
  { id: 'select', width: '40px', fixed: true },
  { id: 'index', width: '40px', fixed: true },
  { id: 'name', label: t('students.table.name'), defaultVisible: true, width: 'minmax(200px, 2fr)' },
  { id: 'groups', label: t('students.table.groups'), defaultVisible: true, width: 'minmax(150px, 1.5fr)' },
  { id: 'meetIds', label: t('students.table.meetIds'), defaultVisible: false, width: 'minmax(100px, 1fr)' },
  { id: 'sessions', label: t('students.table.sessions'), defaultVisible: true, width: '80px' },
  { id: 'avgTime', label: t('students.table.avg') + ' %', defaultVisible: true, width: '80px' },
  { id: 'totalTime', label: t('students.table.total') + ' %', defaultVisible: true, width: '80px' },
  { id: 'avgMark', label: t('students.table.avg') + ' ★', defaultVisible: true, width: '80px' },
  { id: 'completion', label: t('students.table.total') + ' ✓', defaultVisible: true, width: '80px' },
  { id: 'actions', width: '100px', fixed: true }
]);

const { visibleColumns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility('students', columns.value.filter(c => !c.fixed));

const gridStyle = computed(() => {
  // Always include fixed start columns
  let cols = [columns.value.find(c => c.id === 'select').width, columns.value.find(c => c.id === 'index').width];

  // Add visible responsive columns
  columns.value.forEach(col => {
    if (!col.fixed && isColumnVisible(col.id)) {
      cols.push(col.width);
    }
  });

  // Always include fixed end column
  cols.push(columns.value.find(c => c.id === 'actions').width);

  return {
    gridTemplateColumns: cols.join(' ')
  };
});

useQuerySync({
  search: searchQuery,
  group: selectedGroup,
  sort: sortField,
  order: sortDirection
});

const selectedStudents = ref(new Set()); // IDs of selected students

// Modal States
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showProfileModal = ref(false);
const studentToEdit = ref(null);
const studentToDeleteId = ref(null);
const studentToView = ref(null);
const isBulkDelete = ref(false);

const filteredStudents = computed(() => {
  let result = props.students;

  // Filter out teachers
  if (props.teachers.size > 0) {
    result = result.filter(s => !props.teachers.has(s.name));
  }

  if (selectedGroup.value) {
    result = result.filter(s => s.groups.includes(selectedGroup.value));
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.groups.some(g => g.toLowerCase().includes(query)) ||
      s.meetIds.some(m => m.toLowerCase().includes(query))
    );
  }

  return [...result].sort((a, b) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];

    if (sortField.value === 'groups') {
      valA = valA.join(', ');
      valB = valB.join(', ');
    }

    if (sortField.value === 'meetIds') {
      valA = valA.join(', ');
      valB = valB.join(', ');
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });
});

const allGroupsList = computed(() => {
  const set = new Set();
  Object.values(props.groupsMap).forEach(g => set.add(g.name));
  return Array.from(set).sort();
});

// Virtual List Setup
const { list, containerProps, wrapperProps } = useVirtualList(filteredStudents, {
  itemHeight: 60, // approximate height of a row
});

function openAnalytics(meetId) {
  router.push({ name: 'AnalyticsDetails', params: { id: meetId } });
}

// Selection Logic
function toggleSelect(id) {
  if (selectedStudents.value.has(id)) {
    selectedStudents.value.delete(id);
  } else {
    selectedStudents.value.add(id);
  }
}

function toggleSelectAll() {
  if (selectedStudents.value.size === filteredStudents.value.length) {
    selectedStudents.value.clear();
  } else {
    filteredStudents.value.forEach(s => {
      if (s.id) selectedStudents.value.add(s.id);
    });
  }
}

// Edit Logic
function openEditModal(student) {
  studentToEdit.value = student;
  showEditModal.value = true;
}

// Profile Logic
function openProfileModal(student) {
  studentToView.value = student;
  showProfileModal.value = true;
}

async function handleSaveStudent(formData) {
  emit('save-student', { formData, originalStudent: studentToEdit.value });
  showEditModal.value = false;
}

// Delete Logic
function openDeleteModalObj(student) {
  studentToDeleteId.value = student.id;
  isBulkDelete.value = false;
  showDeleteModal.value = true;
}

function openBulkDeleteModal() {
  isBulkDelete.value = true;
  showDeleteModal.value = true;
}

async function handleDeleteConfirm() {
  if (isBulkDelete.value) {
    emit('bulk-delete-students', Array.from(selectedStudents.value));
    selectedStudents.value.clear();
  } else {
    if (studentToDeleteId.value) {
      emit('delete-student', studentToDeleteId.value);
    }
  }
  showDeleteModal.value = false;
  studentToDeleteId.value = null;
  studentToEdit.value = null;
}
</script>

<template>
  <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
    <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary" />
    <p>{{ $t('loader.loading') }}</p>
  </div>
  <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Header Controls (Same) -->
    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
      <div class="space-y-1 w-full sm:w-auto">
        <div class="flex items-center gap-4">
          <h2 class="text-2xl font-bold tracking-tight">{{ $t('students.title') }}</h2>
          <span class="text-muted-foreground text-sm">{{ $t('students.subtitle', {
            count: filteredStudents.length,
            total: students.length
          }) }}</span>

          <Button v-if="selectedStudents.size > 0" @click="openBulkDeleteModal" variant="destructive" size="sm"
            class="h-8 gap-2">
            <Trash2 class="w-4 h-4" />
            Видалити
            <Badge variant="secondary"
              class="bg-destructive/20 text-destructive-foreground hover:bg-destructive/30 px-1 py-0 h-5">
              {{ selectedStudents.size }}
            </Badge>
          </Button>
        </div>

        <div v-if="selectedGroup" class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">{{ $t('students.groupFilter') }}</span>
          <Badge variant="secondary" class="gap-1 cursor-pointer hover:bg-secondary/80" @click="selectedGroup = null">
            {{ selectedGroup }}
            <X class="w-3 h-3" />
          </Badge>
        </div>
      </div>
    </div>

    <!-- Search Row -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input v-model="searchQuery" type="text" :placeholder="$t('students.searchPlaceholder')"
          class="pl-9 bg-background" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" class="gap-2">
            <Columns class="w-4 h-4" />
            <span class="hidden sm:inline">{{ $t('columnPicker.button') }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>{{ $t('columnPicker.title') }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem v-for="col in columns.filter(c => !c.fixed)" :key="col.id"
            :checked="isColumnVisible(col.id)" @update:checked="toggleColumn(col.id)">
            {{ col.label }}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <div class="p-2">
            <Button variant="ghost" size="sm" class="w-full justify-start text-xs h-8" @click="resetColumns">
              {{ $t('columnPicker.reset') }}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Virtual Table Container -->
    <div class="border rounded-lg bg-card shadow-sm flex flex-col h-[calc(100vh-14rem)]">
      <!-- Header Row (Grid) -->
      <div
        class="grid gap-2 p-3 bg-muted/50 border-b font-medium text-muted-foreground text-sm sticky top-0 z-10 shrink-0 select-none items-center"
        :style="gridStyle">
        <!-- Checkbox -->
        <div class="flex items-center justify-center">
          <Checkbox :checked="selectedStudents.size > 0 && selectedStudents.size === filteredStudents.length"
            @update:checked="toggleSelectAll" />
        </div>
        <!-- Index -->
        <div class="text-center">#</div>

        <!-- Headers -->
        <div v-if="isColumnVisible('name')"
          class="cursor-pointer flex items-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('name')">
          {{ $t('students.table.name') }}
          <ArrowUp v-if="sortField === 'name' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'name' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'name'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('groups')"
          class="cursor-pointer flex items-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('groups')">
          {{ $t('students.table.groups') }}
          <ArrowUp v-if="sortField === 'groups' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'groups' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'groups'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('meetIds')"
          class="cursor-pointer flex items-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('meetIds')">
          {{ $t('students.table.meetIds') }}
          <ArrowUp v-if="sortField === 'meetIds' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'meetIds' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'meetIds'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('sessions')"
          class="text-center cursor-pointer flex items-center justify-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('sessionCount')">
          {{ $t('students.table.sessions') }}
          <ArrowUp v-if="sortField === 'sessionCount' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'sessionCount' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'sessionCount'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('avgTime')"
          class="text-center cursor-pointer flex items-center justify-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('averageAttendancePercent')">
          {{ $t('students.table.avg') }} %
          <ArrowUp v-if="sortField === 'averageAttendancePercent' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'averageAttendancePercent' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'averageAttendancePercent'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('totalTime')"
          class="text-center cursor-pointer flex items-center justify-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('totalAttendancePercent')">
          {{ $t('students.table.total') }} %
          <ArrowUp v-if="sortField === 'totalAttendancePercent' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'totalAttendancePercent' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'totalAttendancePercent'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('avgMark')"
          class="text-center cursor-pointer flex items-center justify-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('averageMark')">
          {{ $t('students.table.avg') }} ★
          <ArrowUp v-if="sortField === 'averageMark' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'averageMark' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'averageMark'" class="w-3 h-3 opacity-50" />
        </div>

        <div v-if="isColumnVisible('completion')"
          class="text-center cursor-pointer flex items-center justify-center gap-2 hover:text-foreground transition-colors"
          @click="toggleSort('completionPercent')">
          {{ $t('students.table.total') }} ✓
          <ArrowUp v-if="sortField === 'completionPercent' && sortDirection === 'asc'" class="w-3 h-3" />
          <ArrowDown v-if="sortField === 'completionPercent' && sortDirection === 'desc'" class="w-3 h-3" />
          <ArrowUpDown v-if="sortField !== 'completionPercent'" class="w-3 h-3 opacity-50" />
        </div>

        <div class="text-center">{{ $t('students.table.actions') }}</div>
      </div>

      <!-- Virtual List Body -->
      <div v-bind="containerProps" class="h-full overflow-y-auto w-full relative custom-scrollbar">
        <div v-bind="wrapperProps" class="w-full">
          <div v-for="{ index, data: student } in list" :key="student.id"
            class="grid gap-2 p-3 border-b hover:bg-muted/50 transition-colors items-center text-sm"
            :class="{ 'bg-muted/30': selectedStudents.has(student.id) }" :style="{ ...gridStyle, height: '60px' }">

            <!-- Checkbox -->
            <div class="flex items-center justify-center">
              <Checkbox :checked="student.id && selectedStudents.has(student.id)"
                @update:checked="toggleSelect(student.id)" :disabled="!student.id" />
            </div>
            <!-- Index -->
            <div class="text-center text-muted-foreground text-xs">{{ index + 1 }}</div>

            <!-- Name -->
            <div v-if="isColumnVisible('name')" class="font-medium truncate" :title="student.name">{{ student.name }}
            </div>

            <!-- Groups -->
            <div v-if="isColumnVisible('groups')"
              class="text-muted-foreground truncate flex flex-wrap gap-1 overflow-hidden h-8">
              <Button v-for="group in student.groups" :key="group" @click.stop="selectedGroup = group"
                variant="secondary" size="xs"
                class="h-5 text-[10px] px-1.5 font-medium whitespace-nowrap truncate max-w-[100px]">
                {{ group }}
              </Button>
            </div>

            <!-- Meet IDs -->
            <div v-if="isColumnVisible('meetIds')" class="text-muted-foreground truncate">
              <div class="flex flex-wrap gap-1 h-8 overflow-hidden">
                <Button v-for="meetId in student.meetIds" :key="meetId" @click.stop="openAnalytics(meetId)"
                  variant="outline" size="xs" class="h-5 text-[10px] px-1.5 truncate max-w-[80px]">
                  {{ meetId }}
                </Button>
              </div>
            </div>

            <!-- Sessions -->
            <div v-if="isColumnVisible('sessions')" class="text-center">
              <span class="font-medium">{{ student.sessionCount }}</span>
              <span class="text-muted-foreground">/{{ student.totalSessions }}</span>
            </div>

            <!-- Avg Time -->
            <div v-if="isColumnVisible('avgTime')" class="text-center font-mono"
              :class="getScoreColor(student.averageAttendancePercent)">
              {{ student.averageAttendancePercent.toFixed(1) }}%
            </div>

            <!-- Total Time -->
            <div v-if="isColumnVisible('totalTime')" class="text-center font-mono"
              :class="getScoreColor(student.totalAttendancePercent)">
              {{ student.totalAttendancePercent.toFixed(1) }}%
            </div>

            <!-- Avg Mark -->
            <div v-if="isColumnVisible('avgMark')" class="text-center font-mono"
              :class="getScoreColor(student.averageMark * 20)">
              {{ student.averageMark ? student.averageMark.toFixed(2) : '—' }}
            </div>

            <!-- Completion -->
            <div v-if="isColumnVisible('completion')" class="text-center font-mono"
              :class="getScoreColor(student.completionPercent)">
              {{ student.completionPercent ? student.completionPercent.toFixed(1) : '0' }}%
            </div>

            <!-- Actions -->
            <div class="text-right flex justify-end gap-1">
              <Button @click.stop="openProfileModal(student)" variant="ghost" size="icon"
                class="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground">
                <User class="w-4 h-4" />
              </Button>
              <Button @click.stop="openEditModal(student)" variant="ghost" size="icon"
                class="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground">
                <Edit2 class="w-4 h-4" />
              </Button>
              <Button @click.stop="openDeleteModalObj(student)" variant="ghost" size="icon"
                class="h-8 w-8 hover:bg-destructive/10 text-destructive hover:text-destructive">
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div v-if="list.length === 0" class="p-8 text-center text-muted-foreground">
            {{ $t('students.noStudents') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <EditStudentModal :is-open="showEditModal" :student="studentToEdit" :all-groups="allGroupsList"
      @close="showEditModal = false" @save="handleSaveStudent" />

    <StudentProfileModal :is-open="showProfileModal" :student="studentToView" :meets="meets" :groups-map="groupsMap"
      :tasks="tasks" @close="showProfileModal = false" />

    <ConfirmModal :is-open="showDeleteModal"
      :title="isBulkDelete ? $t('students.deleteModal.bulkTitle') : $t('students.deleteModal.title')"
      :message="isBulkDelete ? $t('students.deleteModal.bulkMessage', { count: selectedStudents.size }) : $t('students.deleteModal.message')"
      :confirm-text="$t('students.deleteModal.confirm')" @cancel="showDeleteModal = false"
      @confirm="handleDeleteConfirm" />
  </div>
</template>
