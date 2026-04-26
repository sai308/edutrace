<script setup lang="ts">
import type { Meet } from '@Analytics/types/analytics'
import { ATTENDANCE_BADGE_THRESHOLDS } from '@Analytics/constants/analytics.constants'
import { calculateTimelineData } from '@Reports/utils/timeline'
import { format } from 'date-fns'
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormatters } from '@/shared/composables/useFormatters'

const props = defineProps<{
    meet: Meet
}>()

const { formatDuration, formatTime } = useFormatters()

const timelineData = computed(() => calculateTimelineData(props.meet))

function formatTimeHHMM(date: Date | null): string {
    if (!date) return ''
    return format(date, 'HH:mm')
}
</script>

<template>
    <Card>
        <CardHeader>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>{{ $t('reports.session.timeline.title') }}</CardTitle>
                    <CardDescription>
                        {{
                            $t('reports.session.timeline.session', {
                                start: formatTimeHHMM(timelineData.startTime),
                                end: formatTimeHHMM(timelineData.endTime),
                            })
                        }}
                    </CardDescription>
                </div>
                <!-- Legend -->
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-500" />
                        <span class="text-muted-foreground whitespace-nowrap"
                            >≥{{ ATTENDANCE_BADGE_THRESHOLDS.GREAT }}%</span
                        >
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 sm:w-4 sm:h-4 rounded bg-yellow-500" />
                        <span class="text-muted-foreground whitespace-nowrap"
                            >{{ ATTENDANCE_BADGE_THRESHOLDS.GOOD }}–{{
                                ATTENDANCE_BADGE_THRESHOLDS.GREAT - 1
                            }}%</span
                        >
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500" />
                        <span class="text-muted-foreground whitespace-nowrap"
                            >&lt;{{ ATTENDANCE_BADGE_THRESHOLDS.GOOD }}%</span
                        >
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div class="space-y-4">
                <div
                    v-for="(participant, index) in timelineData.participants"
                    :key="index"
                    class="space-y-1"
                >
                    <div class="flex items-center justify-between text-sm">
                        <span class="font-medium">{{ participant.name }}</span>
                        <span class="text-xs text-muted-foreground">
                            {{ formatDuration(participant.duration) }} ({{
                                participant.percentage
                            }}%)
                        </span>
                    </div>

                    <!-- Timeline Bar -->
                    <div class="relative h-6 bg-muted/30 rounded-lg overflow-hidden">
                        <!-- Time markers -->
                        <div class="absolute inset-0 flex">
                            <div
                                v-for="i in 4"
                                :key="i"
                                class="flex-1 border-r border-muted/50 last:border-r-0"
                            />
                        </div>

                        <!-- Participant bar -->
                        <div
                            class="absolute h-full rounded transition-all"
                            :style="{
                                left: `${participant.offsetPercent}%`,
                                width: `${participant.durationPercent}%`,
                                backgroundColor:
                                    participant.percentage >= ATTENDANCE_BADGE_THRESHOLDS.GREAT
                                        ? '#22c55e'
                                        : participant.percentage >= ATTENDANCE_BADGE_THRESHOLDS.GOOD
                                          ? '#eab308'
                                          : '#ef4444',
                            }"
                        >
                            <div
                                class="h-full flex items-center justify-center text-xs font-medium text-white px-2 overflow-hidden whitespace-nowrap"
                            >
                                <span
                                    v-if="participant.durationPercent > 15 && participant.joinTime"
                                >
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
