<script setup lang="ts">
import { computed, watch } from 'vue'
import { Users, Clock, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { format, isSameDay } from 'date-fns'
import { useFormatters } from '@/composables/useFormatters'
import { useCalendar } from '@/composables/useCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Meet } from '@/modules/Analytics/types/analytics'
import { Button } from '@/components/ui/button'

const props = defineProps<{
    meet: Meet
}>()

const { formatTime } = useFormatters()
const { currentMonth, weekDays, nextMonth, prevMonth, generateCalendarDays } = useCalendar()

const sessionDate = computed(() => {
    if (!props.meet.date) return null
    // meet.date is 'YYYY-MM-DD' usually
    return new Date(props.meet.date)
})

watch(sessionDate, (newDate) => {
    if (newDate) {
        currentMonth.value = newDate
    }
}, { immediate: true })

const calendarDays = computed(() => {
    const days = generateCalendarDays(null, sessionDate.value)

    return days.map(day => {
        const isSessionDay = sessionDate.value && isSameDay(day.date, sessionDate.value)
        return {
            ...day,
            isSessionDay,
            participantCount: isSessionDay ? props.meet.participants.length : 0
        }
    })
})
</script>

<template>
    <Card>
        <CardHeader>
            <div class="flex items-center justify-between">
                <CardTitle class="capitalize">
                    {{ format(currentMonth, 'MMMM yyyy') }}
                </CardTitle>
                <div class="flex items-center gap-1">
                    <Button variant="ghost" size="icon" @click="prevMonth">
                        <ChevronLeft class="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" @click="nextMonth">
                        <ChevronRight class="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <!-- Calendar Grid -->
            <div class="border rounded-lg overflow-hidden">
                <!-- Weekday Headers -->
                <div class="grid grid-cols-7 bg-muted/50 border-b">
                    <div v-for="day in weekDays" :key="day"
                        class="p-3 text-center text-sm font-medium text-muted-foreground">
                        {{ day }}
                    </div>
                </div>

                <!-- Days -->
                <div class="grid grid-cols-7 divide-x divide-y bg-background">
                    <div v-for="day in calendarDays" :key="day.date.toString()"
                        class="min-h-[120px] p-2 transition-colors relative" :class="[
                            !day.isCurrentMonth && 'bg-muted/10 text-muted-foreground',
                            day.isToday && 'bg-primary/5',
                            day.isSessionDay && 'bg-green-50 dark:bg-green-950/20'
                        ]">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full"
                                :class="day.isToday && 'bg-primary text-primary-foreground'">
                                {{ format(day.date, 'd') }}
                            </span>
                        </div>

                        <!-- Session Info -->
                        <div v-if="day.isSessionDay" class="flex flex-col gap-1.5">
                            <!-- Session Badge -->
                            <div class="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded">
                                {{ $t('reports.session.badge') }}
                            </div>

                            <!-- Time Range -->
                            <div v-if="meet.startTime" class="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock class="w-3 h-3" />
                                {{ formatTime(meet.startTime) }}
                            </div>

                            <!-- Participants Count -->
                            <div class="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                                <Users class="w-3 h-3" />
                                {{ $t('reports.session.participants', {
                                    count: day.participantCount
                                }) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>
