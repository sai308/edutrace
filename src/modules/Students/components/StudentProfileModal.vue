<script setup lang="ts">
import { ref, computed } from 'vue';
import { User as UserIcon, Mail, Copy, Check, Calendar, GraduationCap } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useFormatters } from '@/composables/useFormatters';
import { useMarkFormat } from '@/composables/useMarkFormat';
import { useToast } from '@/services/toast';
import { useColors } from '@/composables/useColors';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

// Unovis & Shadcn Chart Components
import { VisXYContainer, VisStackedBar, VisAxis, VisSingleContainer, VisDonut } from '@unovis/vue';
import { StackedBar, Donut } from '@unovis/ts';
// ... imports
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegendContent, // Import ChartLegendContent
    componentToString,
} from '@/components/ui/chart';

const { t } = useI18n();
const { formatDuration, formatTime } = useFormatters();
const { formatMarkToFiveScale } = useMarkFormat();
const { toast } = useToast();
const { getScoreColor } = useColors();

interface Props {
    isOpen: boolean;
    student: any; // TODO: Define a proper Student type
    meets: any[]; // TODO: Define a proper Meet type
    groupsMap: Record<string, any>; // TODO: Define a proper Group type
    tasks: any[]; // TODO: Define a proper Task type
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const dialogOpen = computed({
    get: () => props.isOpen,
    set: (val) => {
        if (!val) emit('close');
    }
});

const showCopyCheck = ref(false);

function copyEmail() {
    if (props.student?.email) {
        navigator.clipboard.writeText(props.student.email);
        showCopyCheck.value = true;
        toast.success(t('toast.emailCopied'));
        setTimeout(() => {
            showCopyCheck.value = false;
        }, 2000);
    }
}


const viewMode = ref('attendance');

// --- Attendance Chart (Bar) ---
const attendanceChartData = computed(() => {
    if (!props.student || !props.meets) return [];

    const studentGroups = props.student.groups || [];
    const studentMeets = props.meets.filter(meet => {
        const groupName = props.groupsMap[meet.meetId]?.name;
        return groupName && studentGroups.includes(groupName);
    });

    return studentMeets.map(meet => {
        const participant = meet.participants.find((p: any) =>
            p.name === props.student.name || (props.student.aliases && props.student.aliases.includes(p.name))
        );
        return {
            date: new Date(meet.date).getTime(), // Use timestamp for correct X axis
            duration: participant ? participant.duration / 3600 : 0, // In hours
        };
    }).sort((a, b) => a.date - b.date); // Sort by date ascending
});


const attendanceChartConfig = {
    duration: {
        label: t('students.profile.attendance.duration'),
        color: 'var(--chart-1)',
    },
};

// --- Grade Distribution (Donut) ---
const gradeDistributionData = computed(() => {
    if (!props.student || !props.student.marks || !props.tasks) return [];

    const grades: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    const taskMap = new Map();
    props.tasks.forEach(task => taskMap.set(task.id, task));

    props.student.marks.forEach((mark: any) => {
        const task = taskMap.get(mark.taskId);
        if (task && task.maxPoints && task.maxPoints > 0) {
            const grade = formatMarkToFiveScale({ score: mark.score, maxPoints: task.maxPoints });
            grades[grade] = (grades[grade] || 0) + 1;
        }
    });

    return ([
        { grade: '5', count: grades['5'], fill: 'var(--color-grade5)' },
        { grade: '4', count: grades['4'], fill: 'var(--color-grade4)' },
        { grade: '3', count: grades['3'], fill: 'var(--color-grade3)' },
        { grade: '2', count: grades['2'], fill: 'var(--color-grade2)' },
        { grade: '1', count: grades['1'], fill: 'var(--color-grade1)' },
    ] as { grade: string, count: number, fill: string }[]).filter(d => d.count > 0);
});

const gradeDistributionConfig = {
    count: { label: 'Mark' },
    grade5: { label: '5', color: 'rgb(22, 163, 74)' }, // green-600
    grade4: { label: '4', color: 'rgb(37, 99, 235)' }, // blue-600
    grade3: { label: '3', color: 'rgb(202, 138, 4)' }, // yellow-600
    grade2: { label: '2', color: 'rgb(234, 88, 12)' }, // orange-600
    grade1: { label: '1', color: 'rgb(220, 38, 38)' }, // red-600
};

// --- Task Completion (Donut) ---
const taskCompletionData = computed(() => {
    if (!props.student) return [];

    const completed = props.student.completedTasks || 0;
    const pending = Math.max(0, (props.student.totalTasks || 0) - completed);

    if (completed === 0 && pending === 0) return [];

    return [
        { status: 'completed', count: completed, fill: 'var(--color-completed)' },
        { status: 'pending', count: pending, fill: 'var(--color-pending)' },
    ] as { status: string, count: number, fill: string }[];
});

const taskCompletionConfig: any = { // Using any for now due to dynamic key access
    count: { label: 'Tasks' },
    completed: { label: t('students.profile.marks.completed'), color: 'rgb(34, 197, 94)' },
    pending: { label: t('students.profile.marks.pending'), color: 'rgb(148, 163, 184)' },
};


// Other Stats Calculations
const attendanceStats = computed(() => {
    if (!props.student) return {
        totalSessions: 0,
        totalPossibleSessions: 0,
        averagePercent: '0',
        totalTime: '0'
    };
    return {
        totalSessions: props.student.sessionCount || 0,
        totalPossibleSessions: props.student.totalSessions || 0,
        averagePercent: props.student.averageAttendancePercent?.toFixed(1) || '0',
        totalTime: formatDuration(props.student.totalDuration || 0)
    };
});

function calculateMeetDuration(meet: any): number {
    const durations = meet.participants.map((p: any) => p.duration).sort((a: number, b: number) => a - b);
    if (durations.length === 0) return 0;

    const mid = Math.floor(durations.length / 2);
    const median = durations.length % 2 !== 0
        ? durations[mid]
        : (durations[mid - 1] + durations[mid]) / 2;

    const validDurations = durations.filter((d: number) => d <= median * 2);
    if (validDurations.length === 0) return 0;

    return Math.max(...validDurations);
}

const attendedMeets = computed(() => {
    if (!props.student || !props.meets) return [];

    const studentGroups = props.student.groups || [];
    const studentMeets = props.meets.filter(meet => {
        const groupName = props.groupsMap[meet.meetId]?.name;
        return groupName && studentGroups.includes(groupName);
    });

    return studentMeets
        .map(meet => {
            const participant = meet.participants.find((p: any) =>
                p.name === props.student.name || (props.student.aliases && props.student.aliases.includes(p.name))
            );

            const duration = participant ? participant.duration : 0;
            const meetDuration = calculateMeetDuration(meet);
            const percentage = meetDuration > 0 ? (duration / meetDuration) * 100 : 0;

            let offsetPercent = 0;
            let durationPercent = 0;
            let startTime: Date | null = null;
            let joinTime: Date | null = null;

            if (meet.startTime && meet.endTime && participant?.joinTime) {
                let sessionStart = new Date(meet.startTime);
                let sessionEnd = new Date(meet.endTime);
                const timeComponent = new Date(participant.joinTime);

                if (!isNaN(timeComponent.getTime())) {
                    joinTime = new Date(sessionStart);
                    joinTime.setHours(timeComponent.getHours());
                    joinTime.setMinutes(timeComponent.getMinutes());
                    joinTime.setSeconds(timeComponent.getSeconds());
                } else {
                    joinTime = new Date(participant.joinTime);
                }

                const leaveTime = new Date(joinTime.getTime() + (participant.duration * 1000));
                if (joinTime < sessionStart) sessionStart = joinTime;

                const safeDuration = calculateMeetDuration(meet);
                const metadataDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;

                if (safeDuration > 0 && metadataDuration > safeDuration * 5) {
                    const proposedEnd = new Date(sessionStart.getTime() + (safeDuration * 1000));
                    sessionEnd = new Date(Math.max(proposedEnd.getTime(), leaveTime.getTime()));
                    sessionEnd = new Date(sessionEnd.getTime() + (safeDuration * 0.1 * 1000));
                }

                if (leaveTime > sessionEnd) sessionEnd = leaveTime;

                const totalSessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;

                if (totalSessionDuration > 0) {
                    const offsetSeconds = (joinTime.getTime() - sessionStart.getTime()) / 1000;
                    offsetPercent = (offsetSeconds / totalSessionDuration) * 100;
                    durationPercent = (participant.duration / totalSessionDuration) * 100;
                    offsetPercent = Math.max(0, Math.min(100, offsetPercent));
                    durationPercent = Math.max(0, Math.min(100 - offsetPercent, durationPercent));
                }
                startTime = sessionStart;
            }

            return {
                id: meet.meetId,
                date: new Date(meet.date).toLocaleDateString(),
                group: props.groupsMap[meet.meetId]?.name || 'Unknown',
                meetId: meet.meetId,
                duration: formatDuration(duration),
                percentage: Math.min(percentage, 100).toFixed(1),
                hasTimeline: !!startTime,
                offsetPercent,
                durationPercent,
                joinTime
            };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const marksStats = computed(() => {
    if (!props.student) return {
        averageGrade: '0',
        completedTasks: 0,
        totalTasks: 0,
        completionPercent: '0'
    };
    return {
        averageGrade: props.student.averageMark?.toFixed(2) || '0',
        completedTasks: props.student.completedTasks || 0,
        totalTasks: props.student.totalTasks || 0,
        completionPercent: props.student.completionPercent?.toFixed(1) || '0'
    };
});

const studentMarks = computed(() => {
    if (!props.student || !props.student.marks || !props.tasks) return [];

    const taskMap = new Map();
    props.tasks.forEach(task => taskMap.set(task.id, task));

    return props.student.marks
        .map((mark: any) => {
            const task = taskMap.get(mark.taskId);
            const maxPoints = task?.maxPoints || 0;
            const grade = maxPoints > 0 ? formatMarkToFiveScale({ score: mark.score, maxPoints }) : '-';

            return {
                id: mark.id,
                date: new Date(mark.createdAt).toLocaleDateString(),
                taskName: task?.name || `Task #${mark.taskId}`,
                score: mark.score,
                maxPoints: maxPoints,
                grade: grade
            };
        })
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
});
</script>

<template>
    <Dialog v-model:open="dialogOpen">
        <DialogContent class="sm:max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader>
                <DialogTitle class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-primary/10 rounded-full">
                            <UserIcon class="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold leading-none">{{ student?.name }}</h2>
                            <p class="text-sm font-normal text-muted-foreground mt-1">{{ student?.email ||
                                t('students.profile.noEmail') }}</p>
                        </div>
                    </div>
                </DialogTitle>
                <div class="flex items-center gap-2 absolute top-4 right-10">
                    <template v-if="student?.email">
                        <Button as-child variant="ghost" size="icon" :title="t('students.actions.email')">
                            <a :href="`mailto:${student.email}`" target="_blank">
                                <Mail class="w-5 h-5 text-muted-foreground" />
                            </a>
                        </Button>
                        <Button variant="ghost" size="icon" @click="copyEmail" :title="t('students.actions.copyEmail')">
                            <Check v-if="showCopyCheck" class="w-5 h-5 text-green-500" />
                            <Copy v-else class="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </template>
                </div>
            </DialogHeader>

            <div class="flex flex-col gap-6 mt-6 overflow-hidden">
                <ButtonGroup class="w-full">
                    <Button size="sm" :variant="viewMode === 'attendance' ? 'default' : 'outline'" class="flex-1"
                        @click="viewMode = 'attendance'">
                        <Calendar class="w-4 h-4 mr-2" />
                        {{ t('students.profile.views.attendance') }}
                    </Button>
                    <Button size="sm" :variant="viewMode === 'marks' ? 'default' : 'outline'" class="flex-1"
                        @click="viewMode = 'marks'">
                        <GraduationCap class="w-4 h-4 mr-2" />
                        {{ t('students.profile.views.marks') }}
                    </Button>
                </ButtonGroup>

                <div class="flex-1 overflow-hidden min-h-[600px]">
                    <!-- Attendance View -->
                    <div v-if="viewMode === 'attendance'" class="space-y-6 h-full flex flex-col">
                        <div class="h-80 w-full shrink-0">
                            <ChartContainer v-if="attendanceChartData.length > 0" :config="attendanceChartConfig"
                                class="h-full">
                                <VisXYContainer :data="attendanceChartData"
                                    :margin="{ top: 10, right: 10, bottom: 20, left: 10 }">
                                    <VisStackedBar :x="(_: any, i: number) => i" :y="(d: any) => d.duration"
                                        color="var(--vis-color0)" :rounded-corners="4" :bar-padding="0.2" />
                                    <VisAxis type="x" :num-ticks="Math.min(attendanceChartData.length, 10)"
                                        :tick-format="(i: number) => attendanceChartData[i]?.date ? new Date(attendanceChartData[i].date).toLocaleDateString() : ''" />
                                    <VisAxis type="y" :label="t('students.profile.attendance.hours')" />
                                    <ChartTooltip :triggers="{
                                        [StackedBar.selectors.bar]: componentToString(attendanceChartConfig, ChartTooltipContent)!,
                                    }" />
                                </VisXYContainer>
                            </ChartContainer>
                            <div v-else
                                class="h-full flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground">
                                {{ t('common.noData') }}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                            <Card>
                                <CardHeader class="pb-2">
                                    <CardTitle class="text-sm font-medium text-muted-foreground">{{
                                        t('students.profile.attendance.attended') }}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div class="text-2xl font-bold">{{ attendanceStats.totalSessions }}/{{
                                        attendanceStats.totalPossibleSessions }}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader class="pb-2">
                                    <CardTitle class="text-sm font-medium text-muted-foreground">{{
                                        t('students.profile.attendance.avgPercent') }}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div class="text-2xl font-bold">{{ attendanceStats.averagePercent }}%</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader class="pb-2">
                                    <CardTitle class="text-sm font-medium text-muted-foreground">{{
                                        t('students.profile.attendance.totalTime') }}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div class="text-2xl font-bold">{{ attendanceStats.totalTime }}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <!-- Attendance History Table -->
                        <div class="space-y-2 flex-1 flex flex-col overflow-hidden">
                            <h3 class="text-lg font-semibold shrink-0">{{ t('students.profile.attendance.history') }}
                            </h3>
                            <ScrollArea class="h-60 border rounded-lg">
                                <Table>
                                    <TableHeader class="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>{{ t('students.profile.attendance.table.date') }}</TableHead>
                                            <TableHead>{{ t('students.profile.attendance.table.group') }}</TableHead>
                                            <TableHead>{{ t('students.profile.attendance.table.meetId') }}</TableHead>
                                            <TableHead class="text-right">{{
                                                t('students.profile.attendance.table.duration') }}
                                            </TableHead>
                                            <TableHead class="text-center">{{
                                                t('students.profile.attendance.table.progress') }}
                                            </TableHead>
                                            <TableHead class="text-right">{{
                                                t('students.profile.attendance.table.status') }}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow v-for="meet in attendedMeets" :key="meet.id">
                                            <TableCell>{{ meet.date }}</TableCell>
                                            <TableCell>
                                                <span
                                                    class="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                                                    {{ meet.group }}
                                                </span>
                                            </TableCell>
                                            <TableCell class="font-mono text-xs text-muted-foreground">{{ meet.meetId }}
                                            </TableCell>
                                            <TableCell class="text-right font-mono">{{ meet.duration }}</TableCell>
                                            <TableCell class="w-48">
                                                <div v-if="meet.hasTimeline"
                                                    class="relative h-6 bg-muted/30 rounded overflow-hidden w-full min-w-[120px]">
                                                    <!-- Grid lines -->
                                                    <div class="absolute inset-0 flex">
                                                        <div v-for="i in 4" :key="i"
                                                            class="flex-1 border-r border-muted/50 last:border-r-0">
                                                        </div>
                                                    </div>
                                                    <!-- Progress Bar -->
                                                    <div class="absolute h-full rounded transition-all cursor-help"
                                                        :style="{
                                                            left: `${meet.offsetPercent}%`,
                                                            width: `${meet.durationPercent}%`,
                                                            backgroundColor: parseFloat(meet.percentage) >= 75 ? '#22c55e' : parseFloat(meet.percentage) >= 50 ? '#eab308' : '#ef4444'
                                                        }" :title="meet.joinTime ? formatTime(meet.joinTime) : ''">
                                                        <div
                                                            class="h-full flex items-center justify-center text-xs font-medium text-white px-2 overflow-hidden whitespace-nowrap">
                                                            <span v-if="meet.durationPercent > 15 && meet.joinTime">
                                                                {{ meet.durationPercent < 25 ? '~' :
                                                                    formatTime(meet.joinTime) }} </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div v-else class="text-xs text-muted-foreground text-center">-</div>
                                            </TableCell>
                                            <TableCell class="text-right font-mono"
                                                :class="getScoreColor(parseFloat(meet.percentage))">
                                                {{ meet.percentage }}%
                                            </TableCell>
                                        </TableRow>
                                        <TableRow v-if="attendedMeets.length === 0">
                                            <TableCell colspan="6" class="h-24 text-center">No attendance records found
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>

                    <!-- Marks View -->
                    <div v-if="viewMode === 'marks'" class="space-y-6 h-full flex flex-col">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{{ t('students.profile.marks.gradeDistribution') }}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div class="h-64">
                                        <ChartContainer v-if="gradeDistributionData.length > 0"
                                            :config="gradeDistributionConfig" class="h-full" :style="{
                                                '--vis-donut-central-label-font-size': 'var(--text-3xl)',
                                                '--vis-donut-central-label-font-weight': 'var(--font-weight-bold)',
                                            }">
                                            <VisSingleContainer :data="gradeDistributionData">
                                                <VisDonut :value="(d: any) => d.count"
                                                    :color="(d: any) => (gradeDistributionConfig as any)[`grade${d.grade}`].color"
                                                    :arc-width="30" :central-label="marksStats.averageGrade"
                                                    :central-sub-label="t('students.profile.marks.avgGrade')" />
                                                <ChartTooltip :triggers="{
                                                    [Donut.selectors.segment]: componentToString({ count: { label: t('students.profile.marks.grades') } }, ChartTooltipContent, { labelKey: 'grade' })!,
                                                }" />
                                            </VisSingleContainer>
                                            <ChartLegendContent class="mt-4" />
                                        </ChartContainer>
                                        <div v-else
                                            class="h-full flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground">
                                            {{ t('common.noData') }}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{{ t('students.profile.marks.taskCompletion') }}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div class="h-64">
                                        <ChartContainer v-if="taskCompletionData.length > 0"
                                            :config="taskCompletionConfig" class="h-full" :style="{
                                                '--vis-donut-central-label-font-size': 'var(--text-3xl)',
                                                '--vis-donut-central-label-font-weight': 'var(--font-weight-bold)',
                                            }">
                                            <VisSingleContainer :data="taskCompletionData">
                                                <VisDonut :value="(d: any) => d.count"
                                                    :color="(d: any) => (taskCompletionConfig as any)[d.status].color"
                                                    :arc-width="30"
                                                    :central-label="`${marksStats.completedTasks}/${marksStats.totalTasks}`"
                                                    :central-sub-label="t('students.profile.marks.tasksCompleted')" />
                                                <ChartTooltip :triggers="{
                                                    [Donut.selectors.segment]: componentToString({ count: { label: t('students.profile.marks.tasks') } }, ChartTooltipContent, { labelKey: 'status' })!,
                                                }" />
                                            </VisSingleContainer>
                                            <ChartLegendContent class="mt-4" />
                                        </ChartContainer>
                                        <div v-else
                                            class="h-full flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground">
                                            {{ t('common.noData') }}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <!-- Marks History Table -->
                        <div class="space-y-2 flex-1 flex flex-col overflow-hidden">
                            <h3 class="text-lg font-semibold shrink-0">{{ t('students.profile.marks.history') }}</h3>
                            <ScrollArea class="h-60 border rounded-lg">
                                <Table>
                                    <TableHeader class="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>{{ t('students.profile.marks.table.date') }}</TableHead>
                                            <TableHead>{{ t('students.profile.marks.table.task') }}</TableHead>
                                            <TableHead class="text-center">{{ t('students.profile.marks.table.score') }}
                                            </TableHead>
                                            <TableHead class="text-center">{{ t('students.profile.marks.table.grade') }}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow v-for="mark in studentMarks" :key="mark.id">
                                            <TableCell>{{ mark.date }}</TableCell>
                                            <TableCell class="font-medium">{{ mark.taskName }}</TableCell>
                                            <TableCell class="text-center font-mono">
                                                {{ mark.score }} <span class="text-muted-foreground text-xs">/ {{
                                                    mark.maxPoints
                                                }}</span>
                                            </TableCell>
                                            <TableCell class="text-center font-bold" :class="{
                                                'text-green-600': mark.grade == 5,
                                                'text-blue-600': mark.grade == 4,
                                                'text-yellow-600': mark.grade == 3,
                                                'text-orange-600': mark.grade == 2,
                                                'text-red-600': mark.grade == 1
                                            }">
                                                {{ mark.grade }}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow v-if="studentMarks.length === 0">
                                            <TableCell colspan="4" class="h-24 text-center">No marks found</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
