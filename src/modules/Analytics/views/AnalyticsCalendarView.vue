<script setup>
import { ref, computed, watch } from 'vue';
import { ChevronLeft, ChevronRight, Users, Clock } from 'lucide-vue-next';
import { useFormatters } from '@/composables/useFormatters';
import { useCalendar } from '@/composables/useCalendar';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import DayDetailsModal from '../components/DayDetailsModal.vue';

const props = defineProps({
    stats: {
        type: Object,
        required: true
    },
    id: {
        type: String,
        required: true
    }
});

const { formatDuration, formatTime } = useFormatters();
const { currentMonth, weekDays, nextMonth, prevMonth, generateCalendarDays } = useCalendar();

// Initialize calendar to last session date
watch(() => props.stats?.dates, (dates) => {
    if (dates && dates.length > 0) {
        // Use the last date instead of first
        currentMonth.value = parseISO(dates[dates.length - 1]);
    }
}, { immediate: true });

// Calendar days with session data
const calendarDays = computed(() => {
    if (!props.stats?.sessions) return [];

    const days = generateCalendarDays(null, null);

    return days.map(day => {
        const dateStr = format(day.date, 'yyyy-MM-dd');
        const session = props.stats.sessions[dateStr];

        return {
            ...day,
            isSessionDay: !!session,
            participantCount: session ? Object.keys(session.participants).length : 0,
            startTime: session?.startTime,
            endTime: session?.endTime,
            maxDuration: session?.maxDuration || 0,
            dateStr
        };
    });
});

// Modal state
const selectedDay = ref(null);
const isModalOpen = ref(false);

function openDayDetails(day) {
    if (!day.isSessionDay) return;

    selectedDay.value = day;
    isModalOpen.value = true;
}

function closeDayDetails() {
    isModalOpen.value = false;
    selectedDay.value = null;
}

// Get participants for selected day
const modalParticipants = computed(() => {
    if (!selectedDay.value?.dateStr || !props.stats?.sessions) return [];

    const session = props.stats.sessions[selectedDay.value.dateStr];
    if (!session?.participants) return [];

    const maxDuration = session.maxDuration || 1;

    return Object.entries(session.participants)
        .map(([name, duration]) => {
            const percentage = Math.round((duration / maxDuration) * 100);
            let status = 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';

            if (percentage >= 75) {
                status = 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400';
            } else if (percentage >= 50) {
                status = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
            }

            return {
                name,
                duration,
                percentage,
                status
            };
        })
        .sort((a, b) => b.duration - a.duration); // Sort by duration DESC
});
</script>

<template>
    <!-- Calendar View -->
    <div class="space-y-4">
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
                        day.isToday && 'bg-primary/5'
                    ]">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full"
                            :class="day.isToday && 'bg-primary text-primary-foreground'">
                            {{ format(day.date, 'd') }}
                        </span>
                    </div>

                    <!-- Session Info -->
                    <div v-if="day.isSessionDay" @click="openDayDetails(day)"
                        class="bg-muted hover:bg-muted/80 rounded p-2 space-y-1.5 cursor-pointer transition-colors">
                        <!-- Session Badge -->
                        <div class="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded inline-block">
                            {{ $t('analytics.details.calendar.session') }}
                        </div>

                        <!-- Duration Progress Bar -->
                        <div class="space-y-0.5">
                            <div class="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{{ formatDuration(day.maxDuration) }}</span>
                                <span>{{ Math.round((day.maxDuration / 4200) * 100) }}%</span>
                            </div>
                            <div class="w-full bg-secondary rounded-full h-1.5">
                                <div class="bg-primary h-1.5 rounded-full transition-all"
                                    :style="{ width: Math.min((day.maxDuration / 4200) * 100, 100) + '%' }">
                                </div>
                            </div>
                        </div>

                        <!-- Time Range -->
                        <div v-if="day.startTime && day.endTime"
                            class="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock class="w-3 h-3" />
                            <span>{{ formatTime(day.startTime) }} - {{ formatTime(day.endTime) }}</span>
                        </div>

                        <!-- Participants Count -->
                        <div class="flex items-center gap-1 text-xs font-medium text-primary">
                            <Users class="w-3 h-3" />
                            {{ $t('analytics.details.calendar.participants', { count: day.participantCount }) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Day Details Modal -->
        <DayDetailsModal :is-open="isModalOpen"
            :date="selectedDay ? selectedDay.date.toLocaleDateString($i18n.locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''"
            :meet-id="id" :participants="modalParticipants" @update:open="isModalOpen = $event" />
    </div>
</template>

