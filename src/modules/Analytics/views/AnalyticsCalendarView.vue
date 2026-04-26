<script setup lang="ts">
import type { DetailedSession, DetailedStats } from '@Analytics/types/analytics'
import DayDetailsModal from '@Analytics/components/DayDetailsModal.vue'
import {
    ATTENDANCE_BADGE_THRESHOLDS,
    TARGET_SESSION_SECONDS,
} from '@Analytics/constants/analytics.constants'
import { format, parseISO } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCalendar } from '@/shared/composables/useCalendar'
import { useFormatters } from '@/shared/composables/useFormatters'

interface Props {
    stats: DetailedStats
    id: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const { formatDuration, formatTime } = useFormatters()
const { currentMonth, weekDays, nextMonth, prevMonth, generateCalendarDays } = useCalendar()

// ─── Semester stats ──────────────────────────────────────────────────────────

function semesterRange(year: number, sem: 'first' | 'second'): { start: Date; end: Date } {
    return sem === 'first'
        ? { start: new Date(year, 8, 1), end: new Date(year, 11, 31, 23, 59, 59) } // Sep–Dec
        : { start: new Date(year, 0, 1), end: new Date(year, 5, 30, 23, 59, 59) } // Jan–Jun
}

function computeSemesterMetrics(sessions: Record<string, DetailedSession>, start: Date, end: Date) {
    const entries = Object.entries(sessions).filter(([dateStr]) => {
        const d = parseISO(dateStr)
        return d >= start && d <= end
    })
    if (!entries.length) return { sessions: 0, avgParticipants: 0, avgDuration: 0 }
    const totalParticipants = entries.reduce(
        (s, [, sess]) => s + Object.keys(sess.participants).length,
        0,
    )
    const totalDuration = entries.reduce((s, [, sess]) => s + sess.maxDuration, 0)
    return {
        sessions: entries.length,
        avgParticipants: Math.round(totalParticipants / entries.length),
        avgDuration: Math.round(totalDuration / entries.length),
    }
}

const semesterStats = computed(() => {
    if (!props.stats?.sessions) return null

    const now = new Date()
    const month = now.getMonth() + 1 // 1–12
    const currentSem = month >= 9 ? 'first' : ('second' as 'first' | 'second')
    const currentYear = now.getFullYear()
    const prevSem = currentSem === 'first' ? 'second' : ('first' as 'first' | 'second')
    const prevYear = currentSem === 'first' ? currentYear : currentYear - 1

    const currentRange = semesterRange(currentYear, currentSem)
    const prevRange = semesterRange(prevYear, prevSem)

    const current = computeSemesterMetrics(
        props.stats.sessions,
        currentRange.start,
        currentRange.end,
    )
    const previous = computeSemesterMetrics(props.stats.sessions, prevRange.start, prevRange.end)

    return {
        current,
        previous,
        currentLabel: t(`analytics.details.calendar.semester.${currentSem}`, { year: currentYear }),
        prevLabel: t(`analytics.details.calendar.semester.${prevSem}`, { year: prevYear }),
        hasPrev: previous.sessions > 0,
        sessionsDelta: current.sessions - previous.sessions,
        avgParticipantsDelta: current.avgParticipants - previous.avgParticipants,
        avgDurationDelta: current.avgDuration - previous.avgDuration,
    }
})

// ─── Calendar ────────────────────────────────────────────────────────────────

interface ExtendedCalendarDay {
    date: Date
    dateStr: string
    isCurrentMonth: boolean
    isToday: boolean
    isSessionDay: boolean
    participantCount: number
    startTime?: string
    endTime?: string
    maxDuration: number
    /** Rounded %, may exceed 100 — shown as text label. */
    durationPercent: number
    /** Capped at 100 — used for the progress bar width. */
    durationBarWidth: number
}

// Jump to the last session month on mount.
watch(
    () => props.stats?.dates,
    (dates) => {
        const last = dates?.[dates.length - 1]
        if (last) currentMonth.value = parseISO(last)
    },
    { immediate: true },
)

const calendarDays = computed<ExtendedCalendarDay[]>(() => {
    if (!props.stats?.sessions) return []
    return generateCalendarDays(null, null).map((day) => {
        const session = props.stats.sessions[day.dateStr]
        const rawPercent = session ? (session.maxDuration / TARGET_SESSION_SECONDS) * 100 : 0
        return {
            date: day.date,
            dateStr: day.dateStr,
            isCurrentMonth: day.isCurrentMonth,
            isToday: day.isToday,
            isSessionDay: !!session,
            participantCount: session ? Object.keys(session.participants).length : 0,
            startTime: session?.startTime ?? undefined,
            endTime: session?.endTime ?? undefined,
            maxDuration: session?.maxDuration ?? 0,
            durationPercent: Math.round(rawPercent),
            durationBarWidth: Math.min(rawPercent, 100),
        }
    })
})

// ─── Day detail modal ────────────────────────────────────────────────────────

function getStatusClass(percentage: number): string {
    if (percentage >= ATTENDANCE_BADGE_THRESHOLDS.GREAT)
        return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
    if (percentage >= ATTENDANCE_BADGE_THRESHOLDS.GOOD)
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
}

interface ModalParticipant {
    name: string
    duration: number
    percentage: number
    status: string
}

const selectedDay = ref<ExtendedCalendarDay | null>(null)
const isModalOpen = ref(false)

function openDayDetails(day: ExtendedCalendarDay): void {
    if (!day.isSessionDay) return
    selectedDay.value = day
    isModalOpen.value = true
}

function closeDayDetails(): void {
    isModalOpen.value = false
    selectedDay.value = null
}

const modalParticipants = computed<ModalParticipant[]>(() => {
    if (!selectedDay.value?.dateStr || !props.stats?.sessions) return []
    const session = props.stats.sessions[selectedDay.value.dateStr]
    if (!session?.participants) return []

    const maxDuration = session.maxDuration || 1

    return Object.entries(session.participants)
        .map(([name, duration]) => {
            const percentage = Math.round((duration / maxDuration) * 100)
            return { name, duration, percentage, status: getStatusClass(percentage) }
        })
        .sort((a, b) => b.duration - a.duration)
})

const selectedDayLabel = computed<string>(() => {
    if (!selectedDay.value) return ''
    return selectedDay.value.date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
})
</script>

<template>
    <div class="space-y-4">
        <!-- Current Semester Stats -->
        <div v-if="semesterStats" class="grid grid-cols-3 gap-2">
            <Card class="min-w-0">
                <CardContent class="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                    <Calendar
                        class="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground opacity-60 shrink-0"
                    />
                    <div class="min-w-0">
                        <p
                            class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        >
                            {{ $t('analytics.details.calendar.semester.sessions') }}
                        </p>
                        <div class="flex items-baseline gap-1.5 flex-wrap">
                            <div class="text-sm sm:text-xl font-bold">
                                {{ semesterStats.current.sessions }}
                            </div>
                            <span
                                v-if="semesterStats.hasPrev && semesterStats.sessionsDelta !== 0"
                                class="text-[10px] font-semibold"
                                :class="
                                    semesterStats.sessionsDelta > 0
                                        ? 'text-emerald-500'
                                        : 'text-red-500'
                                "
                            >
                                {{ semesterStats.sessionsDelta > 0 ? '+' : ''
                                }}{{ semesterStats.sessionsDelta }}
                            </span>
                        </div>
                        <p
                            class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                        >
                            {{ semesterStats.currentLabel }}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card class="min-w-0">
                <CardContent class="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                    <Users
                        class="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground opacity-60 shrink-0"
                    />
                    <div class="min-w-0">
                        <p
                            class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        >
                            {{ $t('analytics.details.calendar.semester.avgParticipants') }}
                        </p>
                        <div class="flex items-baseline gap-1.5 flex-wrap">
                            <div class="text-sm sm:text-xl font-bold">
                                {{ semesterStats.current.avgParticipants }}
                            </div>
                            <span
                                v-if="
                                    semesterStats.hasPrev &&
                                    semesterStats.avgParticipantsDelta !== 0
                                "
                                class="text-[10px] font-semibold"
                                :class="
                                    semesterStats.avgParticipantsDelta > 0
                                        ? 'text-emerald-500'
                                        : 'text-red-500'
                                "
                            >
                                {{ semesterStats.avgParticipantsDelta > 0 ? '+' : ''
                                }}{{ semesterStats.avgParticipantsDelta }}
                            </span>
                        </div>
                        <p
                            class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                        >
                            {{ semesterStats.currentLabel }}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card class="min-w-0">
                <CardContent class="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                    <Clock
                        class="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground opacity-60 shrink-0"
                    />
                    <div class="min-w-0">
                        <p
                            class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        >
                            {{ $t('analytics.details.calendar.semester.avgDuration') }}
                        </p>
                        <div class="flex items-baseline gap-1.5 flex-wrap">
                            <div class="text-sm sm:text-xl font-bold truncate">
                                {{ formatDuration(semesterStats.current.avgDuration) }}
                            </div>
                            <span
                                v-if="semesterStats.hasPrev && semesterStats.avgDurationDelta !== 0"
                                class="text-[10px] font-semibold shrink-0"
                                :class="
                                    semesterStats.avgDurationDelta > 0
                                        ? 'text-emerald-500'
                                        : 'text-red-500'
                                "
                            >
                                {{ semesterStats.avgDurationDelta > 0 ? '+' : ''
                                }}{{ Math.round(semesterStats.avgDurationDelta / 60) }}m
                            </span>
                        </div>
                        <p
                            class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                        >
                            {{ semesterStats.currentLabel }}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Calendar Header -->
        <div class="flex items-center justify-between">
            <h4 class="text-lg font-semibold capitalize">
                {{ format(currentMonth, 'MMMM yyyy') }}
            </h4>
            <div class="flex items-center gap-1">
                <Button variant="ghost" size="icon" @click="prevMonth">
                    <ChevronLeft class="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" @click="nextMonth">
                    <ChevronRight class="w-5 h-5" />
                </Button>
            </div>
        </div>

        <!-- Calendar Grid -->
        <div class="border rounded-lg overflow-hidden bg-card">
            <div class="grid grid-cols-7 bg-muted/50 border-b">
                <div
                    v-for="day in weekDays"
                    :key="day"
                    class="p-3 text-center text-sm font-medium text-muted-foreground"
                >
                    {{ day }}
                </div>
            </div>

            <div class="grid grid-cols-7 divide-x divide-y bg-background border-t">
                <div
                    v-for="day in calendarDays"
                    :key="day.dateStr"
                    class="min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 transition-colors relative"
                    :class="[
                        !day.isCurrentMonth && 'bg-muted/10 text-muted-foreground',
                        day.isToday && 'bg-primary/5',
                    ]"
                >
                    <div class="flex items-center justify-between mb-1 sm:mb-2">
                        <span
                            class="text-[10px] sm:text-sm font-medium w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full"
                            :class="day.isToday && 'bg-primary text-primary-foreground'"
                        >
                            {{ format(day.date, 'd') }}
                        </span>
                    </div>

                    <div
                        v-if="day.isSessionDay"
                        class="bg-muted hover:bg-muted/80 rounded p-1 sm:p-2 space-y-1 sm:space-y-1.5 cursor-pointer transition-colors shadow-sm"
                        @click="openDayDetails(day)"
                    >
                        <div
                            class="bg-primary/10 text-primary text-[8px] sm:text-xs font-semibold px-1.5 py-0.5 rounded inline-block truncate max-w-full"
                        >
                            {{ $t('analytics.details.calendar.session') }}
                        </div>

                        <div class="hidden sm:block space-y-0.5">
                            <div
                                class="flex items-center justify-between text-[10px] text-muted-foreground"
                            >
                                <span>{{ formatDuration(day.maxDuration) }}</span>
                                <span>{{ day.durationPercent }}%</span>
                            </div>
                            <div class="w-full bg-secondary rounded-full h-1">
                                <div
                                    class="bg-primary h-1 rounded-full transition-all"
                                    :style="{ width: `${day.durationBarWidth}%` }"
                                />
                            </div>
                        </div>

                        <div
                            v-if="day.startTime && day.endTime"
                            class="flex items-center gap-1 text-[8px] sm:text-xs text-muted-foreground"
                        >
                            <Clock class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span class="truncate">{{ formatTime(day.startTime) }}</span>
                        </div>

                        <div
                            class="flex items-center gap-1 text-[9px] sm:text-xs font-medium text-primary"
                        >
                            <Users class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span class="hidden sm:inline">{{
                                $t('analytics.details.calendar.participants', {
                                    count: day.participantCount,
                                })
                            }}</span>
                            <span class="inline sm:hidden">{{ day.participantCount }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Previous Semester Stats -->
        <template v-if="semesterStats">
            <p class="text-xs text-muted-foreground">
                {{ semesterStats.prevLabel }}
            </p>
            <div class="grid grid-cols-3 gap-2">
                <Card class="min-w-0">
                    <CardContent class="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                        <Calendar
                            class="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground opacity-60 shrink-0"
                        />
                        <div class="min-w-0">
                            <p
                                class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                            >
                                {{ $t('analytics.details.calendar.semester.sessions') }}
                            </p>
                            <div class="text-sm sm:text-xl font-bold">
                                {{ semesterStats.previous.sessions }}
                            </div>
                            <p
                                class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                            >
                                {{ semesterStats.prevLabel }}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card class="min-w-0">
                    <CardContent class="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                        <Users
                            class="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground opacity-60 shrink-0"
                        />
                        <div class="min-w-0">
                            <p
                                class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                            >
                                {{ $t('analytics.details.calendar.semester.avgParticipants') }}
                            </p>
                            <div class="text-sm sm:text-xl font-bold">
                                {{ semesterStats.previous.avgParticipants }}
                            </div>
                            <p
                                class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                            >
                                {{ semesterStats.prevLabel }}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card class="min-w-0">
                    <CardContent class="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                        <Clock
                            class="h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground opacity-60 shrink-0"
                        />
                        <div class="min-w-0">
                            <p
                                class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                            >
                                {{ $t('analytics.details.calendar.semester.avgDuration') }}
                            </p>
                            <div class="text-sm sm:text-xl font-bold truncate">
                                {{ formatDuration(semesterStats.previous.avgDuration) }}
                            </div>
                            <p
                                class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                            >
                                {{ semesterStats.prevLabel }}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </template>

        <DayDetailsModal
            :is-open="isModalOpen"
            :date="selectedDayLabel"
            :meet-id="id"
            :participants="modalParticipants"
            @update:open="isModalOpen = $event"
            @close="closeDayDetails"
        />
    </div>
</template>
