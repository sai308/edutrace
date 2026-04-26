<script setup lang="ts">
import type { DetailedSession } from '@Analytics/types/analytics'
import { ATTENDANCE_BADGE_THRESHOLDS } from '@Analytics/constants/analytics.constants'
import { useIntersectionObserver } from '@vueuse/core'
import { ChevronDown, Clock, Eye, Users } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFormatters } from '@/shared/composables/useFormatters'

interface Props {
    date: string
    session: DetailedSession
    reportId: string | null
}

const props = defineProps<Props>()

const router = useRouter()
const { formatDuration, formatTime, formatDate, formatSurname } = useFormatters()

const sentinel = ref<HTMLElement | null>(null)
const isBottomVisible = ref(true)

useIntersectionObserver(sentinel, ([entry]) => {
    isBottomVisible.value = entry?.isIntersecting ?? true
})

const sessionAttendees = computed<number>(() =>
    props.session?.participants ? Object.keys(props.session.participants).length : 0
)

const sortedParticipants = computed<[string, number][]>(() => {
    if (!props.session?.participants) return []
    return Object.entries(props.session.participants).sort((a, b) => b[1] - a[1])
})

function getStatusDotColor(duration: number, maxDuration: number): string {
    const percentage = maxDuration > 0 ? (duration / maxDuration) * 100 : 0
    if (percentage >= ATTENDANCE_BADGE_THRESHOLDS.GREAT) return 'bg-green-500'
    if (percentage >= ATTENDANCE_BADGE_THRESHOLDS.GOOD) return 'bg-yellow-500'
    return 'bg-red-500'
}

function navigateToReportDetails(): void {
    if (props.reportId) {
        router.push({ name: 'ReportDetails', params: { id: props.reportId } })
    }
}
</script>

<template>
    <Card class="hover:shadow-md transition-shadow group relative">
        <CardHeader class="p-4 py-0">
            <div class="flex items-center justify-between">
                <CardTitle class="text-base font-semibold">
                    {{ formatDate(date) }}
                </CardTitle>
                <div class="flex items-center gap-1">
                    <div
                        class="flex items-center gap-1.5 px-2 py-1 text-xs text-primary bg-primary/10 rounded"
                        :title="$t('analytics.details.overview.seeDetails')"
                    >
                        <Users class="w-3.5 h-3.5" />
                        <span>{{ sessionAttendees }}</span>
                    </div>
                    <Button
                        v-if="reportId"
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6"
                        :title="$t('analytics.details.overview.seeDetails')"
                        @click="navigateToReportDetails"
                    >
                        <Eye class="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                </div>
            </div>
            <CardDescription
                v-if="session?.startTime"
                class="flex items-center gap-2 text-xs text-muted-foreground mt-1"
            >
                <Clock class="w-3 h-3" />
                <span>{{ formatTime(session.startTime) }} - {{ formatTime(session.endTime ?? '') }}</span>
                <span class="ml-auto flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {{ formatDuration(session.maxDuration) }}
                </span>
            </CardDescription>
        </CardHeader>

        <CardContent class="p-4 pt-0 relative">
            <ScrollArea class="h-64">
                <div class="space-y-1 pr-4 pb-2">
                    <div
                        v-for="[name, duration] in sortedParticipants"
                        :key="name"
                        class="flex items-center justify-between text-sm py-1 border-b last:border-0 border-muted/50 transition-colors hover:bg-muted/10 pr-1"
                    >
                        <span class="truncate flex-1 text-xs shrink-0" :title="name">
                            <span class="hidden sm:inline">{{ name }}</span>
                            <span class="sm:hidden">{{ formatSurname(name) }}</span>
                        </span>
                        <div class="flex items-center gap-2 ml-2 shrink-0">
                            <span class="text-[10px] sm:text-xs text-muted-foreground font-mono">{{
                                formatDuration(duration)
                            }}</span>
                            <div
                                class="w-2 h-2 rounded-full"
                                :class="getStatusDotColor(duration, session.maxDuration)"
                            />
                        </div>
                    </div>
                    <div ref="sentinel" class="h-px w-full" />
                </div>
            </ScrollArea>

            <div
                v-if="!isBottomVisible"
                class="absolute -bottom-2 left-0 right-0 flex justify-center pointer-events-none z-10"
            >
                <div class="bg-background/80 backdrop-blur-sm rounded-full p-0.5 shadow-sm border animate-bounce">
                    <ChevronDown class="w-4 h-4 text-primary" />
                </div>
            </div>
        </CardContent>
    </Card>
</template>
