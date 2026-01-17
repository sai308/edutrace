<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Meet } from '@/modules/Analytics/types/analytics'
import { useFormatters } from '@/composables/useFormatters'
import { format } from 'date-fns'

const props = defineProps<{
    meet: Meet
}>()

const { formatDuration, formatTime } = useFormatters()

// Timeline calculations
const timelineData = computed(() => {
    let sessionStart: Date
    let sessionEnd: Date

    if (props.meet.startTime && props.meet.endTime) {
        sessionStart = new Date(props.meet.startTime)
        sessionEnd = new Date(props.meet.endTime)
    } else {
        // Fallback: Calculate from participants
        const joinTimes = props.meet.participants
            .map(p => p.joinTime ? new Date(p.joinTime).getTime() : null)
            .filter((t): t is number => t !== null)

        if (joinTimes.length === 0) {
            return { participants: [], totalDuration: 0, startTime: null, endTime: null }
        }

        const minTime = Math.min(...joinTimes)
        // Estimate end time based on max (join + duration)
        const endTimes = props.meet.participants.map(p => {
            const start = p.joinTime ? new Date(p.joinTime).getTime() : minTime
            return start + (p.duration * 1000)
        })
        const maxTime = Math.max(...endTimes)

        sessionStart = new Date(minTime)
        sessionEnd = new Date(maxTime)
    }

    const totalDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000 // in seconds

    const participants = props.meet.participants.map(p => {
        const joinTime = p.joinTime ? new Date(p.joinTime) : sessionStart
        const offsetSeconds = (joinTime.getTime() - sessionStart.getTime()) / 1000
        const offsetPercent = totalDuration > 0 ? (offsetSeconds / totalDuration) * 100 : 0
        const durationPercent = totalDuration > 0 ? (p.duration / totalDuration) * 100 : 0
        const percentage = totalDuration > 0 ? Math.round((p.duration / totalDuration) * 100) : 0

        return {
            name: p.name,
            joinTime: p.joinTime,
            duration: p.duration,
            offsetPercent: Math.max(0, offsetPercent),
            durationPercent: Math.min(100 - offsetPercent, durationPercent),
            percentage: percentage
        }
    })

    return {
        participants,
        totalDuration,
        startTime: sessionStart,
        endTime: sessionEnd
    }
})

function formatTimeHHMM(date: Date | null) {
    if (!date) return ''
    return format(date, 'HH:mm')
}
</script>

<template>
    <Card>
        <CardHeader>
            <div class="flex items-center justify-between">
                <div>
                    <CardTitle>{{ $t('reports.session.timeline.title') }}</CardTitle>
                    <CardDescription>
                        {{ $t('reports.session.timeline.session', {
                            start: formatTimeHHMM(timelineData.startTime),
                            end: formatTimeHHMM(timelineData.endTime)
                        }) }}
                    </CardDescription>
                </div>
                <!-- Legend -->
                <div class="flex items-center gap-4 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-green-500"></div>
                        <span class="text-muted-foreground">≥75%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-yellow-500"></div>
                        <span class="text-muted-foreground">50-74%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-red-500"></div>
                        <span class="text-muted-foreground">&lt;50%</span>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div class="space-y-4">
                <div v-for="(participant, index) in timelineData.participants" :key="index" class="space-y-1">
                    <div class="flex items-center justify-between text-sm">
                        <span class="font-medium">{{ participant.name }}</span>
                        <span class="text-xs text-muted-foreground">
                            {{ formatDuration(participant.duration) }} ({{ participant.percentage }}%)
                        </span>
                    </div>

                    <!-- Timeline Bar -->
                    <div class="relative h-6 bg-muted/30 rounded-lg overflow-hidden">
                        <!-- Time markers (optional grid) -->
                        <div class="absolute inset-0 flex">
                            <div v-for="i in 4" :key="i" class="flex-1 border-r border-muted/50 last:border-r-0">
                            </div>
                        </div>

                        <!-- Participant bar -->
                        <div class="absolute h-full rounded transition-all" :style="{
                            left: `${participant.offsetPercent}%`,
                            width: `${participant.durationPercent}%`,
                            backgroundColor: participant.percentage >= 75 ? '#22c55e' :
                                participant.percentage >= 50 ? '#eab308' : '#ef4444'
                        }">
                            <div
                                class="h-full flex items-center justify-center text-xs font-medium text-white px-2 overflow-hidden whitespace-nowrap">
                                <span v-if="participant.durationPercent > 15 && participant.joinTime">
                                    {{ formatTime(participant.joinTime) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </CardContent>
    </Card>
</template>
