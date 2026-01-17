<script setup>
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const props = defineProps({
    stats: {
        type: Object,
        required: true
    }
});

function formatDateForTable(dateStr) {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
}

function getFinalStatusColor(totalPercentage) {
    if (totalPercentage >= 75) return 'text-green-500';
    if (totalPercentage >= 50) return 'text-amber-500';
    return 'text-red-500';
}
</script>

<template>
    <!-- Table View -->
    <div class="rounded-md border bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead class="w-[200px] sticky left-0 bg-background z-10">
                        {{ $t('analytics.details.table.student') }}
                    </TableHead>
                    <TableHead v-for="date in stats.dates" :key="date"
                        class="text-center whitespace-nowrap px-4">
                        {{ formatDateForTable(date) }}
                    </TableHead>
                    <TableHead class="text-center bg-background sticky right-0 z-10 border-l">
                        {{ $t('analytics.details.table.total') }}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="student in stats.matrix" :key="student.name">
                    <TableCell class="font-medium sticky left-0 bg-background z-10">
                        {{ student.name }}
                    </TableCell>
                    <TableCell v-for="date in stats.dates" :key="date" class="text-center p-2">
                        <div v-if="student[date]" class="flex items-center justify-center">
                            <div :class="['px-2.5 py-0.5 rounded text-xs font-medium inline-block', student[date].status]">
                                {{ student[date].percentage }}%
                            </div>
                        </div>
                        <div v-else class="text-muted-foreground">-</div>
                    </TableCell>
                    <TableCell class="text-center sticky right-0 bg-background z-10 border-l font-bold">
                        <div class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-bold"
                            :class="getFinalStatusColor(student.totalPercentage)">
                            {{ student.totalPercentage }}%
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
</template>

