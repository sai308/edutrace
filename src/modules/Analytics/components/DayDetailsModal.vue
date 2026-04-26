<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFormatters } from '@/shared/composables/useFormatters'

interface ModalParticipant {
    name: string
    duration: number
    percentage: number
    status: string
}

interface Props {
    isOpen: boolean
    date: string
    meetId: string
    participants?: ModalParticipant[]
}

const props = withDefaults(defineProps<Props>(), {
    participants: () => [],
})

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'close'): void
}>()

const { formatDuration, formatSurname } = useFormatters()

const open = computed({
    get: () => props.isOpen,
    set: (val: boolean) => {
        emit('update:open', val)
        if (!val) emit('close')
    },
})
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader class="p-6 pb-2">
                <DialogTitle>{{ $t('reports.details.dayDetails.title') }}</DialogTitle>
                <DialogDescription> {{ date }} • {{ meetId }} </DialogDescription>
            </DialogHeader>

            <div class="overflow-y-auto p-0 flex-1 custom-scrollbar">
                <Table>
                    <TableHeader class="bg-muted/50 sticky top-0 z-20">
                        <TableRow>
                            <TableHead class="px-6 h-10">
                                {{ $t('reports.details.dayDetails.table.participant') }}
                            </TableHead>
                            <TableHead class="px-6 h-10 text-center">
                                {{ $t('reports.details.dayDetails.table.duration') }}
                            </TableHead>
                            <TableHead class="px-6 h-10 text-center">
                                {{ $t('reports.details.dayDetails.table.status') }}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-if="participants.length === 0">
                            <TableCell colspan="3" class="px-6 py-8 text-center text-muted-foreground">
                                {{ $t('reports.details.dayDetails.noParticipants') }}
                            </TableCell>
                        </TableRow>
                        <TableRow
                            v-for="p in participants"
                            :key="p.name"
                            class="group hover:bg-muted/30 transition-colors"
                        >
                            <TableCell class="px-6 font-medium whitespace-nowrap overflow-hidden">
                                <span class="hidden sm:inline truncate max-w-[200px]">{{ p.name }}</span>
                                <span class="sm:hidden truncate max-w-[120px]" :title="p.name">
                                    {{ formatSurname(p.name) }}
                                </span>
                            </TableCell>
                            <TableCell class="px-6 text-center font-mono text-[10px] sm:text-xs">
                                {{ formatDuration(p.duration) }}
                            </TableCell>
                            <TableCell class="px-6 text-center">
                                <div
                                    class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium min-w-[2.5rem] sm:min-w-[3rem]"
                                    :class="p.status"
                                >
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
