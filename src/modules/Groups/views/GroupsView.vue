<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Trash2, Edit2, QrCode, Search, Star, PieChart, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-vue-next';
import GroupModal from '../components/GroupModal.vue';
import QrCodeModal from '@/shared/components/QrCodeModal.vue';
import ColumnPicker from '@/components/ColumnPicker.vue';
import { useQuerySync } from '@/composables/useQuerySync';
import { useColumnVisibility } from '@/composables/useColumnVisibility';
import { useI18n } from 'vue-i18n';

// Shadcn Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const { t } = useI18n();

const props = defineProps({
  groups: { type: Array as () => any[], default: () => [] },
  memberCounts: { type: Object as () => Record<string, number>, default: () => ({}) },
  allMeetIds: { type: Array as () => string[], default: () => [] },
  allTeachers: { type: Array as () => string[], default: () => [] }
});

const emit = defineEmits(['save-group', 'delete-group', 'refresh']);

// Modal States
const showGroupModal = ref(false);
const showDeleteModal = ref(false);
const showQrModal = ref(false);
const selectedGroup = ref<any>(null);
const groupToDeleteId = ref<string | null>(null);
const qrMeetId = ref('');

// Filter & Sort
const searchQuery = ref('');
const sortField = ref('name');
const sortDirection = ref('asc');

useQuerySync({
  search: searchQuery,
  sort: sortField,
  order: sortDirection
});

// Column visibility setup
const columns = computed(() => [
  { id: 'name', label: t('groups.table.name'), defaultVisible: true },
  { id: 'course', label: t('groups.table.course'), defaultVisible: true },
  { id: 'meetId', label: t('groups.table.meetId'), defaultVisible: true },
  { id: 'members', label: t('groups.table.members'), defaultVisible: true },
  { id: 'teacher', label: t('groups.table.teacher'), defaultVisible: true },
  { id: 'completion', label: t('groups.table.avgCompletion'), defaultVisible: true },
  { id: 'avgMark', label: t('groups.table.avgMark'), defaultVisible: true },
  { id: 'modeMark', label: t('groups.table.modeMark'), defaultVisible: false },
  { id: 'medianMark', label: t('groups.table.medianMark'), defaultVisible: false }
]);

const { visibleColumns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility('groups', columns.value);

const filteredGroups = computed(() => {
  let result = [...props.groups];

  // 1. Filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(g =>
      g.name.toLowerCase().includes(query) ||
      g.meetId.toLowerCase().includes(query)
    );
  }

  // 2. Sort
  result.sort((a, b) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];

    // Handle special cases
    if (sortField.value === 'members') {
      valA = props.memberCounts[a.name] || 0;
      valB = props.memberCounts[b.name] || 0;
    } else if (sortField.value === 'course') {
      valA = valA || 0; // Handle missing course
      valB = valB || 0;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1;
    return 0;
  });

  return result;
});

function handleSort(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortDirection.value = 'asc';
  }
}


function handleSaveGroup(formData: any) {
  emit('save-group', formData);
  showGroupModal.value = false;
}

function handleDeleteConfirm() {
  if (!groupToDeleteId.value) return;
  emit('delete-group', groupToDeleteId.value);
  showDeleteModal.value = false;
  groupToDeleteId.value = null;
}

// Modal Handlers
function openCreateModal() {
  selectedGroup.value = null;
  showGroupModal.value = true;
}

function openEditModal(group: any) {
  selectedGroup.value = group;
  showGroupModal.value = true;
}

function openDeleteModal(groupId: string) {
  groupToDeleteId.value = groupId;
  showDeleteModal.value = true;
}

// QR Handler
function openQrModal(meetId: string) {
  qrMeetId.value = meetId;
  showQrModal.value = true;
}

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <h2 class="text-2xl font-bold tracking-tight">{{ $t('groups.title') }}</h2>
        <span class="text-muted-foreground text-sm">{{ $t('groups.subtitle', {
          count: filteredGroups.length, total:
            groups.length
        }) }}</span>
      </div>

      <Button @click="openCreateModal" class="w-full sm:w-auto">
        <Plus class="w-4 h-4 mr-2" />
        {{ $t('groups.add') }}
      </Button>
    </div>

    <!-- Search Row -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input v-model="searchQuery" :placeholder="$t('groups.searchPlaceholder')" class="pl-8" />
      </div>

      <ColumnPicker :columns="columns" :visible-columns="visibleColumns" @toggle-column="toggleColumn"
        @reset="resetColumns" />
    </div>

    <!-- List -->
    <div class="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead v-if="isColumnVisible('name')" class="cursor-pointer select-none" @click="handleSort('name')">
              <div class="flex items-center gap-1">
                {{ $t('groups.table.name') }}
                <ArrowUp v-if="sortField === 'name' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'name' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'name'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('course')" class="cursor-pointer select-none"
              @click="handleSort('course')">
              <div class="flex items-center gap-1">
                {{ $t('groups.table.course') }}
                <ArrowUp v-if="sortField === 'course' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'course' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'course'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('meetId')" class="cursor-pointer select-none"
              @click="handleSort('meetId')">
              <div class="flex items-center gap-1">
                {{ $t('groups.table.meetId') }}
                <ArrowUp v-if="sortField === 'meetId' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'meetId' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'meetId'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('members')" class="cursor-pointer select-none"
              @click="handleSort('members')">
              <div class="flex items-center gap-1">
                {{ $t('groups.table.members') }}
                <ArrowUp v-if="sortField === 'members' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'members' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'members'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('teacher')" class="cursor-pointer select-none"
              @click="handleSort('teacher')">
              <div class="flex items-center gap-1">
                {{ $t('groups.table.teacher') }}
                <ArrowUp v-if="sortField === 'teacher' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'teacher' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'teacher'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('completion')" class="text-center cursor-pointer select-none"
              @click="handleSort('avgTaskCompletion')">
              <div class="flex items-center justify-center gap-1" :title="$t('groups.table.avgCompletion')">
                {{ $t('groups.table.avg') }}
                <PieChart class="w-3 h-3" />
                <ArrowUp v-if="sortField === 'avgTaskCompletion' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'avgTaskCompletion' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'avgTaskCompletion'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('avgMark')" class="text-center cursor-pointer select-none"
              @click="handleSort('avgMark')">
              <div class="flex items-center justify-center gap-1" :title="$t('groups.table.avgMark')">
                {{ $t('groups.table.avg') }}
                <Star class="w-3 h-3" />
                <ArrowUp v-if="sortField === 'avgMark' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'avgMark' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'avgMark'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('modeMark')" class="text-center cursor-pointer select-none"
              @click="handleSort('modeMark')">
              <div class="flex items-center justify-center gap-1" :title="$t('groups.table.modeMark')">
                {{ $t('groups.table.mode') }}
                <Star class="w-3 h-3" />
                <ArrowUp v-if="sortField === 'modeMark' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'modeMark' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'modeMark'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead v-if="isColumnVisible('medianMark')" class="text-center cursor-pointer select-none"
              @click="handleSort('medianMark')">
              <div class="flex items-center justify-center gap-1" :title="$t('groups.table.medianMark')">
                {{ $t('groups.table.median') }}
                <Star class="w-3 h-3" />
                <ArrowUp v-if="sortField === 'medianMark' && sortDirection === 'asc'" class="w-3 h-3" />
                <ArrowDown v-if="sortField === 'medianMark' && sortDirection === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-if="sortField !== 'medianMark'" class="w-3 h-3 opacity-50" />
              </div>
            </TableHead>
            <TableHead class="text-right">{{ $t('groups.table.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="filteredGroups.length === 0">
            <TableCell colspan="9" class="h-24 text-center text-muted-foreground">
              {{ searchQuery ? $t('groups.noMatch') : $t('groups.noGroups') }}
            </TableCell>
          </TableRow>
          <TableRow v-for="group in filteredGroups" :key="group.id">
            <TableCell v-if="isColumnVisible('name')" class="font-medium">{{ group.name }}</TableCell>
            <TableCell v-if="isColumnVisible('course')" class="text-muted-foreground">{{ group.course || '-' }}
            </TableCell>
            <TableCell v-if="isColumnVisible('meetId')" class="font-mono text-xs">{{ group.meetId }}</TableCell>
            <TableCell v-if="isColumnVisible('members')" class="text-muted-foreground">{{ memberCounts[group.name]
              || 0 }}</TableCell>
            <TableCell v-if="isColumnVisible('teacher')" class="text-muted-foreground">{{ group.teacher || '-' }}
            </TableCell>
            <TableCell v-if="isColumnVisible('completion')" class="text-center">
              <span :class="{
                'text-green-500': group.avgTaskCompletion >= 75,
                'text-yellow-500': group.avgTaskCompletion >= 50 && group.avgTaskCompletion < 75,
                'text-red-500': group.avgTaskCompletion < 50 && group.avgTaskCompletion > 0
              }">
                {{ group.avgTaskCompletion ? Math.round(group.avgTaskCompletion) + '%' : '-' }}
              </span>
            </TableCell>
            <TableCell v-if="isColumnVisible('avgMark')" class="text-center">
              <span :class="{
                'text-green-500': group.avgMark >= 4,
                'text-yellow-500': group.avgMark >= 3 && group.avgMark < 4,
                'text-red-500': group.avgMark < 3 && group.avgMark > 0
              }">
                {{ group.avgMark ? group.avgMark.toFixed(2) : '-' }}
              </span>
            </TableCell>
            <TableCell v-if="isColumnVisible('modeMark')" class="text-center text-muted-foreground">
              {{ group.modeMark || '-' }}
            </TableCell>
            <TableCell v-if="isColumnVisible('medianMark')" class="text-center text-muted-foreground">
              {{ group.medianMark || '-' }}
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button variant="ghost" size="icon" @click="openQrModal(group.meetId)" title="Show QR Code">
                  <QrCode class="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" @click="openEditModal(group)" title="Edit">
                  <Edit2 class="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" @click="openDeleteModal(group.id)"
                  class="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete">
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Modals -->
    <GroupModal :is-open="showGroupModal" :group="selectedGroup" :all-meet-ids="allMeetIds" :all-teachers="allTeachers"
      @update:isOpen="showGroupModal = $event" @save="handleSaveGroup" />

    <AlertDialog :open="showDeleteModal" @update:open="showDeleteModal = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('groups.deleteModal.title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ $t('groups.deleteModal.message') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteModal = false">{{ $t('groups.deleteModal.cancel', 'Cancel') }}
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDeleteConfirm">
            {{ $t('groups.deleteModal.confirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <QrCodeModal :is-open="showQrModal" :meet-id="qrMeetId" @close="showQrModal = false" />
  </div>
</template>