<script setup>
import { computed } from 'vue';
import { useModalClose } from '@/composables/useModalClose';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const props = defineProps({
  isOpen: Boolean,
  date: String,
  meetId: String,
  participants: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:open', 'close']);

const open = computed({
  get: () => props.isOpen,
  set: (val) => {
    emit('update:open', val);
    if (!val) emit('close');
  }
});

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
      <DialogHeader class="p-6 pb-2">
        <DialogTitle>{{ $t('reports.details.dayDetails.title') }}</DialogTitle>
        <DialogDescription>
          {{ date }} • {{ meetId }}
        </DialogDescription>
      </DialogHeader>

      <div class="overflow-y-auto p-0 flex-1">
        <Table>
          <TableHeader class="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead class="px-6">{{ $t('reports.details.dayDetails.table.participant') }}</TableHead>
              <TableHead class="px-6 text-center">{{ $t('reports.details.dayDetails.table.duration') }}</TableHead>
              <TableHead class="px-6 text-center">{{ $t('reports.details.dayDetails.table.status') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="participants.length === 0">
              <TableCell colspan="3" class="px-6 py-8 text-center text-muted-foreground">
                {{ $t('reports.details.dayDetails.noParticipants') }}
              </TableCell>
            </TableRow>
            <TableRow v-for="(p, index) in participants" :key="p.name">
              <TableCell class="px-6 font-medium">{{ p.name }}</TableCell>
              <TableCell class="px-6 text-center font-mono text-xs">
                {{ formatDuration(p.duration) }}
              </TableCell>
              <TableCell class="px-6 text-center">
                <div
                  class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[3rem]"
                  :class="p.status">
                  {{ p.percentage }}%
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <DialogFooter class="p-4 border-t bg-muted/20 sm:justify-between items-center">
        <div class="text-xs text-muted-foreground pl-2">
          {{ $t('reports.details.dayDetails.total', { count: participants.length }) }}
        </div>
        <Button @click="open = false">
          {{ $t('reports.details.dayDetails.close') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

