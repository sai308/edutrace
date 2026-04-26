import type { ComputedRef, Ref } from 'vue'
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface CalendarDay {
    date: Date
    dateStr: string
    isCurrentMonth: boolean
    isToday: boolean
    session: any
    isSessionDay: boolean | null
}

export function useCalendar(initialDate: Date = new Date()) {
    const { t } = useI18n()
    const currentMonth: Ref<Date> = ref(initialDate)
    const weekDays: ComputedRef<string[]> = computed(() => [
        t('calendar.weekDays.sun'),
        t('calendar.weekDays.mon'),
        t('calendar.weekDays.tue'),
        t('calendar.weekDays.wed'),
        t('calendar.weekDays.thu'),
        t('calendar.weekDays.fri'),
        t('calendar.weekDays.sat'),
    ])

    function nextMonth(): void {
        currentMonth.value = addMonths(currentMonth.value, 1)
    }

    function prevMonth(): void {
        currentMonth.value = subMonths(currentMonth.value, 1)
    }

    function generateCalendarDays(
        sessionsMap: Map<string, any> | Record<string, any> | null,
        sessionDate: Date | null = null,
    ): CalendarDay[] {
        const start = startOfWeek(startOfMonth(currentMonth.value))
        const end = endOfWeek(endOfMonth(currentMonth.value))

        return eachDayOfInterval({ start, end }).map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd')
            let session: any = null

            if (sessionsMap instanceof Map) {
                for (const [key, val] of sessionsMap.entries()) {
                    if (isSameDay(parseISO(key), date)) {
                        session = val
                        break
                    }
                }
            } else if (sessionsMap) {
                for (const [key, val] of Object.entries(sessionsMap)) {
                    if (isSameDay(parseISO(key), date)) {
                        session = val
                        break
                    }
                }
            }

            const isSessionDay = sessionDate && isSameDay(date, sessionDate)

            return {
                date,
                dateStr,
                isCurrentMonth: isSameMonth(date, currentMonth.value),
                isToday: isToday(date),
                session,
                isSessionDay,
            }
        })
    }

    return {
        currentMonth,
        weekDays,
        nextMonth,
        prevMonth,
        generateCalendarDays,
    }
}
