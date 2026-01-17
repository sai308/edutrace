<script setup>
import { useRouter } from 'vue-router';
import { Users, Eye, Clock } from 'lucide-vue-next';
import { useFormatters } from '@/composables/useFormatters';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const props = defineProps({
    stats: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['navigate-to-report']);

const router = useRouter();
const { formatDuration, formatTime, formatDate } = useFormatters();

function getSessionAttendees(date) {
    if (!props.stats?.sessions[date]) return 0;
    return Object.keys(props.stats.sessions[date].participants).length;
}

function getStatusDotColor(duration, maxDuration) {
    const percentage = (duration / maxDuration) * 100;
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
}

function navigateToReportDetails(date) {
    const reportId = props.stats?.reportIds?.[date];

    if (reportId) {
        router.push({ name: 'ReportDetails', params: { id: reportId } });
    } else {
        console.warn('No report ID found for date:', date);
    }
}

function getSortedParticipants(date) {
    if (!props.stats?.sessions[date]?.participants) return [];

    const participants = props.stats.sessions[date].participants;

    // Convert object to array of [name, duration] pairs, sort by duration DESC, then back to object
    return Object.entries(participants)
        .sort((a, b) => b[1] - a[1]) // Sort by duration descending
        .reduce((acc, [name, duration]) => {
            acc[name] = duration;
            return acc;
        }, {});
}
</script>

<template>
    <!-- Overview View -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card v-for="date in stats.dates" :key="date" class="hover:shadow-md transition-shadow">
            <CardHeader class="p-4 pb-2">
                <div class="flex items-center justify-between">
                    <CardTitle class="text-base font-semibold">{{ formatDate(date) }}</CardTitle>
                    <div class="flex items-center gap-1">
                         <div class="flex items-center gap-1.5 px-2 py-1 text-xs text-primary bg-primary/10 rounded" :title="$t('analytics.details.overview.seeDetails')">
                             <Users class="w-3.5 h-3.5" />
                             <span>{{ getSessionAttendees(date) }}</span>
                         </div>
                        <Button variant="ghost" size="icon" class="h-6 w-6" @click="navigateToReportDetails(date)" :title="$t('analytics.details.overview.seeDetails')">
                            <Eye class="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                        </Button>
                    </div>
                </div>
                 <CardDescription class="flex items-center gap-2 text-xs text-muted-foreground mt-1" v-if="stats.sessions[date]?.startTime">
                     <Clock class="w-3 h-3" />
                     <span>{{ formatTime(stats.sessions[date].startTime) }} - {{ formatTime(stats.sessions[date].endTime) }}</span>
                     <span class="ml-auto flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        {{ formatDuration(stats.sessions[date].maxDuration) }}
                     </span>
                 </CardDescription>
            </CardHeader>
            <CardContent class="p-4 pt-0">
                <div class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    <div v-for="(participant, name) in getSortedParticipants(date)" :key="name"
                        class="flex items-center justify-between text-sm py-1 border-b last:border-0 border-muted/50">
                        <span class="truncate flex-1 text-xs">{{ name }}</span>
                        <div class="flex items-center gap-2 ml-2">
                            <span class="text-xs text-muted-foreground font-mono">{{ formatDuration(participant) }}</span>
                            <div class="w-2 h-2 rounded-full"
                                :class="getStatusDotColor(participant, stats.sessions[date].maxDuration)"></div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

