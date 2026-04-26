<script setup lang="ts">
import type { ProfileMeet, ProfileTask, ProfileView } from '@Students/composables/useStudentProfile'
import type { StudentDashboardStats } from '@Students/types/students'
import { useStudentProfile } from '@Students/composables/useStudentProfile'
import { Donut, StackedBar } from '@unovis/ts'

import { VisAxis, VisDonut, VisSingleContainer, VisStackedBar, VisXYContainer } from '@unovis/vue'
import { Calendar, Check, Copy, FileText, GraduationCap, Mail, Pencil, User as UserIcon } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ChartContainer,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    componentToString,
} from '@/components/ui/chart'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = withDefaults(defineProps<Props>(), {
    defaultView: 'attendance',
    allStudents: () => [],
    allGroups: () => [],
})

const emit = defineEmits<{
    'update:open': [value: boolean]
    'save': [payload: { formData: unknown, originalStudent: unknown }]
}>()

const { t } = useI18n()

interface Props {
    open: boolean
    student: StudentDashboardStats | null | undefined
    meets: ProfileMeet[]
    groupsMap: Record<string, { name?: string }>
    tasks: ProfileTask[]
    allStudents?: Array<{ id: string | number, iep?: string }>
    allGroups?: string[]
    defaultView?: ProfileView
}

const viewMode = ref<ProfileView>(props.defaultView)

watch(
    () => [props.open, props.defaultView] as const,
    ([open, tab]) => {
        if (open)
            viewMode.value = tab ?? 'attendance'
    },
)

const {
    showCopyCheck,
    copyEmail,
    formData,
    handleSave,
    attendanceChartData,
    attendanceChartConfig,
    attendanceYDomain,
    attendanceNumTicks,
    attendanceStats,
    attendedMeets,
    gradeDistributionData,
    gradeDistributionConfig,
    taskCompletionData,
    taskCompletionConfig,
    marksStats,
    studentMarks,
    formatTime,
    getScoreColor,
} = useStudentProfile(
    () => props.student,
    () => props.meets,
    () => props.groupsMap,
    () => props.tasks,
    () => props.allStudents ?? [],
)

function onSave() {
    handleSave((event, ...args) => {
        if (event === 'save') {
            emit('save', args[0] as { formData: unknown, originalStudent: unknown })
        }
        else if (event === 'update:open') {
            emit('update:open', args[0] as boolean)
        }
    })
}

function handleCancel() {
    viewMode.value = 'attendance'
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            <Tabs v-model="viewMode" class="flex flex-col flex-1 min-h-0">
                <!-- Zone 1: Header -->
                <div class="px-6 pt-6 pb-4 border-b shrink-0 space-y-3">
                    <!-- Identity row -->
                    <div class="flex items-start gap-3 pr-8">
                        <div
                            class="p-2 bg-primary/10 rounded-full shrink-0 hidden sm:flex items-center justify-center mt-0.5"
                        >
                            <UserIcon class="w-6 h-6 text-primary" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <DialogTitle class="text-xl sm:text-2xl font-bold leading-tight break-words">
                                {{ student?.name }}
                            </DialogTitle>
                            <DialogDescription class="sr-only">
                                {{ t('students.profile.description') }}
                            </DialogDescription>
                            <div class="mt-1 flex flex-wrap items-center gap-2">
                                <span class="text-xs sm:text-sm text-muted-foreground break-all">
                                    {{ student?.email || t('students.profile.noEmail') }}
                                </span>
                                <span v-if="student?.email" class="flex items-center gap-1">
                                    <Button
                                        as-child
                                        variant="outline"
                                        size="icon"
                                        class="h-6 w-6"
                                        :title="t('students.actions.email')"
                                    >
                                        <a :href="`mailto:${student.email}`" target="_blank">
                                            <Mail class="w-3 h-3 text-muted-foreground" />
                                        </a>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        class="h-6 w-6"
                                        :title="t('students.actions.copyEmail')"
                                        @click="copyEmail"
                                    >
                                        <Check v-if="showCopyCheck" class="w-3 h-3 text-green-500" />
                                        <Copy v-else class="w-3 h-3 text-muted-foreground" />
                                    </Button>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- IEP banner -->
                    <div
                        v-if="student?.iep"
                        class="p-3 bg-muted/30 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2"
                    >
                        <div class="flex items-center gap-2 mb-1 text-primary font-semibold text-sm">
                            <FileText class="w-4 h-4" />
                            <span>{{ t('members.iep') }}</span>
                        </div>
                        <p class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {{ student.iep }}
                        </p>
                    </div>

                    <!-- View switcher -->
                    <TabsList class="w-full h-auto p-1">
                        <TabsTrigger value="attendance" class="flex-1 gap-2">
                            <Calendar class="w-4 h-4" />
                            <span class="hidden sm:inline">{{ t('students.profile.views.attendance') }}</span>
                        </TabsTrigger>
                        <TabsTrigger value="marks" class="flex-1 gap-2">
                            <GraduationCap class="w-4 h-4" />
                            <span class="hidden sm:inline">{{ t('students.profile.views.marks') }}</span>
                        </TabsTrigger>
                        <TabsTrigger value="edit" class="flex-1 gap-2">
                            <Pencil class="w-4 h-4" />
                            <span class="hidden sm:inline">{{ t('students.profile.views.edit') }}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <!-- Zone 2: Scrollable view content -->
                <ScrollArea class="flex-1 min-h-0">
                    <div class="px-6 py-4">
                        <!-- Attendance view -->
                        <TabsContent value="attendance" class="mt-0 space-y-4">
                            <div class="h-48 sm:h-72 w-full">
                                <ChartContainer
                                    v-if="attendanceChartData.length > 0"
                                    :config="attendanceChartConfig"
                                    class="h-full"
                                >
                                    <VisXYContainer
                                        :data="attendanceChartData"
                                        :margin="{ top: 10, right: 10, bottom: 20, left: 10 }"
                                    >
                                        <VisStackedBar
                                            :x="(_: unknown, i: number) => i"
                                            :y="(d: { duration: number }) => d.duration"
                                            color="var(--vis-color0)"
                                            :rounded-corners="4"
                                            :bar-padding="0.2"
                                        />
                                        <VisAxis
                                            type="x"
                                            :num-ticks="Math.min(attendanceChartData.length, 10)"
                                            :tick-format="
                                                (i: number) =>
                                                    attendanceChartData[i]?.date
                                                        ? new Date(attendanceChartData[i].date).toLocaleDateString()
                                                        : ''
                                            "
                                        />
                                        <VisAxis
                                            type="y"
                                            :label="t('students.profile.attendance.minutes')"
                                            :num-ticks="attendanceNumTicks"
                                            :tick-format="(v: number) => `${v}`"
                                            :domain="attendanceYDomain"
                                        />
                                        <ChartTooltip
                                            :triggers="{
                                                [StackedBar.selectors.bar]: componentToString(
                                                    attendanceChartConfig,
                                                    ChartTooltipContent,
                                                )!,
                                            }"
                                        />
                                    </VisXYContainer>
                                </ChartContainer>
                                <div
                                    v-else
                                    class="h-full flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground text-sm"
                                >
                                    {{ t('common.noData') }}
                                </div>
                            </div>

                            <div class="grid grid-cols-3 gap-3">
                                <Card>
                                    <CardHeader class="pb-1 pt-3 px-3">
                                        <CardTitle class="text-xs font-medium text-muted-foreground">
                                            {{ t('students.profile.attendance.attended') }}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent class="px-3 pb-3">
                                        <div class="text-xl font-bold">
                                            {{ attendanceStats.totalSessions }}/{{
                                                attendanceStats.totalPossibleSessions
                                            }}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader class="pb-1 pt-3 px-3">
                                        <CardTitle class="text-xs font-medium text-muted-foreground">
                                            {{ t('students.profile.attendance.avgPercent') }}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent class="px-3 pb-3">
                                        <div class="text-xl font-bold">
                                            {{ attendanceStats.averagePercent }}%
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader class="pb-1 pt-3 px-3">
                                        <CardTitle class="text-xs font-medium text-muted-foreground">
                                            {{ t('students.profile.attendance.totalTime') }}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent class="px-3 pb-3">
                                        <div class="text-xl font-bold">
                                            {{ attendanceStats.totalTime }}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div class="space-y-2">
                                <h3 class="text-sm font-semibold">
                                    {{ t('students.profile.attendance.history') }}
                                </h3>
                                <div class="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader class="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead>
                                                    {{ t('students.profile.attendance.table.date') }}
                                                </TableHead>
                                                <TableHead>
                                                    {{ t('students.profile.attendance.table.group') }}
                                                </TableHead>
                                                <TableHead>
                                                    {{ t('students.profile.attendance.table.meetId') }}
                                                </TableHead>
                                                <TableHead class="text-right">
                                                    {{ t('students.profile.attendance.table.duration') }}
                                                </TableHead>
                                                <TableHead class="text-center">
                                                    {{ t('students.profile.attendance.table.progress') }}
                                                </TableHead>
                                                <TableHead class="text-right">
                                                    {{ t('students.profile.attendance.table.status') }}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow v-for="meet in attendedMeets" :key="meet.id">
                                                <TableCell>{{ meet.date }}</TableCell>
                                                <TableCell>
                                                    <span
                                                        class="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                                                    >
                                                        {{ meet.group }}
                                                    </span>
                                                </TableCell>
                                                <TableCell class="font-mono text-xs text-muted-foreground">
                                                    {{ meet.meetId }}
                                                </TableCell>
                                                <TableCell class="text-right font-mono">
                                                    {{ meet.duration }}
                                                </TableCell>
                                                <TableCell class="w-48">
                                                    <div
                                                        v-if="meet.hasTimeline"
                                                        class="relative h-6 bg-muted/30 rounded overflow-hidden w-full min-w-[120px]"
                                                    >
                                                        <div class="absolute inset-0 flex">
                                                            <div
                                                                v-for="i in 4"
                                                                :key="i"
                                                                class="flex-1 border-r border-muted/50 last:border-r-0"
                                                            />
                                                        </div>
                                                        <div
                                                            class="absolute h-full rounded transition-all cursor-help"
                                                            :style="{
                                                                left: `${meet.offsetPercent}%`,
                                                                width: `${meet.durationPercent}%`,
                                                                backgroundColor:
                                                                    parseFloat(meet.percentage) >= 75
                                                                        ? '#22c55e'
                                                                        : parseFloat(meet.percentage) >= 50
                                                                            ? '#eab308'
                                                                            : '#ef4444',
                                                            }"
                                                            :title="meet.joinTime ? formatTime(meet.joinTime) : ''"
                                                        >
                                                            <div
                                                                class="h-full flex items-center justify-center text-xs font-medium text-white px-2 overflow-hidden whitespace-nowrap"
                                                            >
                                                                <span v-if="meet.durationPercent > 15 && meet.joinTime">
                                                                    {{
                                                                        meet.durationPercent < 25
                                                                            ? '~'
                                                                            : formatTime(meet.joinTime)
                                                                    }}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div v-else class="text-xs text-muted-foreground text-center">
                                                        -
                                                    </div>
                                                </TableCell>
                                                <TableCell
                                                    class="text-right font-mono"
                                                    :class="getScoreColor(parseFloat(meet.percentage))"
                                                >
                                                    {{ meet.percentage }}%
                                                </TableCell>
                                            </TableRow>
                                            <TableRow v-if="attendedMeets.length === 0">
                                                <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
                                                    {{ t('students.profile.attendance.noRecords') }}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>

                        <!-- Marks view -->
                        <TabsContent value="marks" class="mt-0 space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {{ t('students.profile.marks.gradeDistribution') }}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="h-48 sm:h-64">
                                            <ChartContainer
                                                v-if="gradeDistributionData.length > 0"
                                                :config="gradeDistributionConfig"
                                                class="h-full"
                                                :style="{
                                                    '--vis-donut-central-label-font-size': 'var(--text-3xl)',
                                                    '--vis-donut-central-label-font-weight': 'var(--font-weight-bold)',
                                                }"
                                            >
                                                <VisSingleContainer :data="gradeDistributionData">
                                                    <VisDonut
                                                        :value="(d: { count: number }) => d.count"
                                                        :color="
                                                            (d: { grade: string }) =>
                                                                (
                                                                    gradeDistributionConfig as unknown as Record<
                                                                        string,
                                                                        { color: string }
                                                                    >
                                                                )[`grade${d.grade}`]?.color ?? ''
                                                        "
                                                        :arc-width="30"
                                                        :central-label="marksStats.averageGrade"
                                                        :central-sub-label="t('students.profile.marks.avgGrade')"
                                                    />
                                                    <ChartTooltip
                                                        :triggers="{
                                                            [Donut.selectors.segment]: componentToString(
                                                                {
                                                                    count: {
                                                                        label: t('students.profile.marks.grades'),
                                                                    },
                                                                },
                                                                ChartTooltipContent,
                                                                { labelKey: 'grade' },
                                                            )!,
                                                        }"
                                                    />
                                                </VisSingleContainer>
                                                <ChartLegendContent class="mt-4" />
                                            </ChartContainer>
                                            <div
                                                v-else
                                                class="h-full flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground text-sm"
                                            >
                                                {{ t('common.noData') }}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {{ t('students.profile.marks.taskCompletion') }}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div class="h-48 sm:h-64">
                                            <ChartContainer
                                                v-if="taskCompletionData.length > 0"
                                                :config="taskCompletionConfig"
                                                class="h-full"
                                                :style="{
                                                    '--vis-donut-central-label-font-size': 'var(--text-3xl)',
                                                    '--vis-donut-central-label-font-weight': 'var(--font-weight-bold)',
                                                }"
                                            >
                                                <VisSingleContainer :data="taskCompletionData">
                                                    <VisDonut
                                                        :value="(d: { count: number }) => d.count"
                                                        :color="
                                                            (d: { status: string }) =>
                                                                (
                                                                    taskCompletionConfig as unknown as Record<
                                                                        string,
                                                                        { color: string }
                                                                    >
                                                                )[d.status]?.color ?? ''
                                                        "
                                                        :arc-width="30"
                                                        :central-label="`${marksStats.completedTasks}/${marksStats.totalTasks}`"
                                                        :central-sub-label="t('students.profile.marks.tasksCompleted')"
                                                    />
                                                    <ChartTooltip
                                                        :triggers="{
                                                            [Donut.selectors.segment]: componentToString(
                                                                {
                                                                    count: {
                                                                        label: t('students.profile.marks.tasks'),
                                                                    },
                                                                },
                                                                ChartTooltipContent,
                                                                { labelKey: 'status' },
                                                            )!,
                                                        }"
                                                    />
                                                </VisSingleContainer>
                                                <ChartLegendContent class="mt-4" />
                                            </ChartContainer>
                                            <div
                                                v-else
                                                class="h-full flex items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground text-sm"
                                            >
                                                {{ t('common.noData') }}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div class="space-y-2">
                                <h3 class="text-sm font-semibold">
                                    {{ t('students.profile.marks.history') }}
                                </h3>
                                <div class="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader class="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead>
                                                    {{ t('students.profile.marks.table.date') }}
                                                </TableHead>
                                                <TableHead>
                                                    {{ t('students.profile.marks.table.task') }}
                                                </TableHead>
                                                <TableHead class="text-center">
                                                    {{ t('students.profile.marks.table.score') }}
                                                </TableHead>
                                                <TableHead class="text-center">
                                                    {{ t('students.profile.marks.table.grade') }}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow v-for="mark in studentMarks" :key="mark.id">
                                                <TableCell>{{ mark.date }}</TableCell>
                                                <TableCell class="font-medium">
                                                    {{ mark.taskName }}
                                                </TableCell>
                                                <TableCell class="text-center font-mono">
                                                    {{ mark.score }}
                                                    <span class="text-muted-foreground text-xs">/ {{ mark.maxPoints }}</span>
                                                </TableCell>
                                                <TableCell
                                                    class="text-center font-bold"
                                                    :class="{
                                                        'text-green-600': mark.grade === 5,
                                                        'text-blue-600': mark.grade === 4,
                                                        'text-yellow-600': mark.grade === 3,
                                                        'text-orange-600': mark.grade === 2,
                                                        'text-red-600': mark.grade === 1,
                                                    }"
                                                >
                                                    {{ mark.grade }}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow v-if="studentMarks.length === 0">
                                                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                                                    {{ t('students.profile.marks.noRecords') }}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>

                        <!-- Edit view -->
                        <TabsContent value="edit" class="mt-0 space-y-5">
                            <div class="grid gap-2">
                                <Label for="edit-name">{{ t('students.editModal.name') }}</Label>
                                <Input
                                    id="edit-name"
                                    v-model="formData.name"
                                    :placeholder="t('students.editModal.name')"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="edit-groupName">{{ t('students.editModal.groups') }}</Label>
                                <div class="relative">
                                    <Input
                                        id="edit-groupName"
                                        v-model="formData.groupName"
                                        list="profile-group-suggestions"
                                        :placeholder="t('students.editModal.groups')"
                                        autocomplete="off"
                                    />
                                    <datalist id="profile-group-suggestions">
                                        <option v-for="g in allGroups ?? []" :key="g" :value="g">
                                            {{ g }}
                                        </option>
                                    </datalist>
                                </div>
                                <p v-if="(allGroups ?? []).length > 0" class="text-[0.8rem] text-muted-foreground">
                                    {{ t('students.editModal.groupHint') }}
                                </p>
                            </div>
                            <div class="grid gap-2">
                                <Label for="edit-email">{{ t('students.editModal.email') }}</Label>
                                <Input
                                    id="edit-email"
                                    v-model="formData.email"
                                    type="email"
                                    :placeholder="t('students.editModal.emailPlaceholder')"
                                />
                            </div>
                            <div class="grid gap-2">
                                <Label for="edit-iep">{{ t('members.iep') }}</Label>
                                <Input
                                    id="edit-iep"
                                    v-model="formData.iep"
                                    :placeholder="t('members.iepPlaceholder')"
                                />
                            </div>
                        </TabsContent>
                    </div>
                </ScrollArea>

                <!-- Zone 3: Footer (edit view only) -->
                <div v-if="viewMode === 'edit'" class="px-6 py-4 border-t shrink-0 flex justify-end gap-2">
                    <Button variant="outline" @click="handleCancel">
                        {{ t('students.editModal.cancel') }}
                    </Button>
                    <Button @click="onSave">
                        {{ t('students.editModal.save') }}
                    </Button>
                </div>
            </Tabs>
        </DialogContent>
    </Dialog>
</template>
