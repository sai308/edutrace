<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useColors } from '@/composables/useColors'
import { calculateMeetDuration } from '../utils/duration'
import type { Meet } from '@/modules/Analytics/types/analytics'
import { computed } from 'vue'

const props = defineProps<{
    meet: Meet
}>()

const { getScoreColor } = useColors()

const formatDuration = (seconds?: number) => {
    if (seconds === undefined) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
}

const totalDuration = computed(() => {
    return calculateMeetDuration(props.meet)
})

const getAttendancePercentage = (duration: number) => {
    if (totalDuration.value <= 0) return 0
    return Math.round((duration / totalDuration.value) * 100)
}
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>Participants List</CardTitle>
            <CardDescription>Detailed attendance records for this session.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead class="text-right">Duration</TableHead>
                        <TableHead class="text-right">Attendance %</TableHead>
                        <TableHead class="text-right">Join Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="(participant, index) in meet.participants" :key="index">
                        <TableCell class="font-medium">{{ participant.name }}</TableCell>
                        <TableCell>{{ participant.email || '-' }}</TableCell>
                        <TableCell class="text-right">{{ formatDuration(participant.duration) }}</TableCell>
                        <TableCell class="text-right">
                            <Badge variant="outline"
                                :class="getScoreColor(getAttendancePercentage(participant.duration))">
                                {{ getAttendancePercentage(participant.duration) }}%
                            </Badge>
                        </TableCell>
                        <TableCell class="text-right">{{ participant.joinTime?.split(' ')?.[1] || '-' }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </CardContent>
    </Card>
</template>
