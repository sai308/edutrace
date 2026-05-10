<script setup lang="ts">
import { usePlans } from '@Plans/composables/usePlans'
import { Calendar, ChevronDown, Clock, FileText, GraduationCap, Layers, UserX } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useFormatters } from '@/shared/composables/useFormatters'
import { getECTSColorClass, toECTS } from '@/shared/utils/grades'

const { t } = useI18n()
const router = useRouter()
const { formatDate, formatTime } = useFormatters()
const { groups, filterGroup, studentPlans, stats, handleToggleSync, students } = usePlans()
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Zone 1: Page header — always visible -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">
                    {{ t('plans.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5">
                    {{ t('plans.description') }}
                </p>
            </div>
            <div v-if="students.length > 0" class="w-full sm:w-auto flex justify-center">
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="outline" size="sm" class="h-9 gap-1 w-full sm:w-[200px] mx-auto sm:mx-0">
                            <span class="text-xs text-muted-foreground mr-1 whitespace-nowrap">{{ t('marks.table.group') }}:</span>
                            <span class="font-medium truncate max-w-[100px]">{{
                                filterGroup || t('marks.filterModal.allGroups')
                            }}</span>
                            <ChevronDown class="h-3 w-3 opacity-50 shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-full sm:w-[200px] max-h-[300px] overflow-y-auto">
                        <DropdownMenuItem
                            :class="!filterGroup ? 'bg-primary/15 text-primary font-medium' : ''"
                            @click="filterGroup = null"
                        >
                            {{ t('marks.filterModal.allGroups') }}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            v-for="group in groups"
                            :key="group.id as string"
                            :class="filterGroup === group.name ? 'bg-primary/15 text-primary font-medium' : ''"
                            @click="filterGroup = group.name"
                        >
                            {{ group.name }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <!-- Empty state: no groups at all -->
        <EmptyState
            v-if="groups.length === 0"
            :title="t('plans.noGroups')"
            :description="t('plans.noGroupsDescription')"
            :icon="Layers"
            class="min-h-[240px] sm:min-h-[400px]"
            learn-more-url="#"
        >
            <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" class="gap-2" @click="router.push({ name: 'reports' })">
                    <FileText class="w-4 h-4" />
                    {{ t('common.importReports') }}
                </Button>
                <Button variant="outline" class="gap-2" @click="router.push({ name: 'Marks' })">
                    <GraduationCap class="w-4 h-4" />
                    {{ t('common.importMarks') }}
                </Button>
            </div>
        </EmptyState>

        <!-- Empty state: groups exist but no IEP students -->
        <EmptyState
            v-else-if="students.length === 0"
            :title="t('plans.emptyState.title')"
            :description="t('plans.emptyState.description')"
            :icon="FileText"
            class="min-h-[240px] sm:min-h-[400px]"
            learn-more-url="#"
        >
            <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" class="gap-2" @click="router.push({ name: 'Marks' })">
                    <GraduationCap class="w-4 h-4" />
                    {{ t('common.importMarks') }}
                </Button>
            </div>
        </EmptyState>

        <!-- Has data: stats + table -->
        <template v-else>
            <!-- ECTS Grade Distribution -->
            <div class="flex justify-center w-full px-2 overflow-x-auto shrink-0 pb-1">
                <div
                    class="flex items-center gap-3 sm:gap-6 text-xs bg-muted/30 border px-4 py-2 rounded-lg shadow-sm min-w-max"
                >
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-green-600 dark:text-green-400">A</span><span :class="stats.A === 0 ? 'opacity-30' : 'font-medium'">{{ stats.A }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-semibold text-emerald-500 dark:text-emerald-400">B</span><span :class="stats.B === 0 ? 'opacity-30' : 'font-medium'">{{ stats.B }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-semibold text-yellow-600 dark:text-yellow-500">C</span><span :class="stats.C === 0 ? 'opacity-30' : 'font-medium'">{{ stats.C }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-medium text-orange-500 dark:text-orange-400">D</span><span :class="stats.D === 0 ? 'opacity-30' : 'font-medium'">{{ stats.D }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-medium text-orange-600 dark:text-orange-500">E</span><span :class="stats.E === 0 ? 'opacity-30' : 'font-medium'">{{ stats.E }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-red-500 dark:text-red-400">FX</span><span :class="stats.FX === 0 ? 'opacity-30' : 'font-medium'">{{ stats.FX }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-red-600 dark:text-red-500">F</span><span :class="stats.F === 0 ? 'opacity-30' : 'font-medium'">{{ stats.F }}</span>
                    </div>

                    <div class="w-px h-6 bg-border mx-1" />

                    <div class="flex flex-col items-center">
                        <span class="text-muted-foreground flex items-center gap-1">
                            <UserX class="w-3 h-3 opacity-60" /> {{ t('plans.table.noGrade') }}
                        </span>
                        <span :class="stats.absent === 0 ? 'opacity-30' : 'font-medium'">{{ stats.absent }}</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 min-h-0 w-full flex flex-col space-y-4">
                <div class="rounded-md border bg-card flex-1 min-h-0 overflow-hidden relative">
                    <div class="overflow-x-auto">
                        <Table class="min-w-[800px] lg:min-w-[1000px]">
                            <TableHeader class="sticky top-0 z-40 bg-background shadow-sm">
                                <TableRow>
                                    <TableHead
                                        class="w-[120px] min-w-[120px] h-12 sm:w-[300px] sm:min-w-[300px] sticky left-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] border-b"
                                    >
                                        {{ t('members.fields.fullName') }}
                                    </TableHead>
                                    <TableHead class="bg-background border-b">
                                        {{ t('plans.table.iep') }}
                                    </TableHead>
                                    <TableHead class="bg-background border-b">
                                        {{ t('plans.table.grade') }}
                                    </TableHead>
                                    <TableHead class="bg-background border-b">
                                        {{ t('plans.table.dateApplied') }}
                                    </TableHead>
                                    <TableHead class="bg-background border-b">
                                        {{ t('plans.table.isSynced') }}
                                    </TableHead>
                                    <TableHead class="bg-background border-b">
                                        {{ t('plans.table.syncedAt') }}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="item in studentPlans" :key="item.student.id">
                                    <TableCell
                                        class="font-medium sticky left-0 z-20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-[1px_0_0_0_hsl(var(--border)),2px_0_4px_-1px_rgba(0,0,0,0.05)] max-w-[120px] sm:max-w-[300px] border-b"
                                    >
                                        <span class="hidden sm:block truncate">{{ item.student.name }}</span>
                                        <span class="block sm:hidden truncate" :title="item.student.name">{{
                                            item.student.name.split(' ')[0] || ''
                                        }}</span>
                                    </TableCell>
                                    <TableCell class="border-b">
                                        <Badge variant="outline">
                                            {{ item.student.iep }}
                                        </Badge>
                                    </TableCell>
                                    <TableCell class="border-b">
                                        <div
                                            v-if="item.plan?.grade !== null && item.plan?.grade !== undefined"
                                            class="flex items-center gap-2"
                                        >
                                            <span class="font-medium">{{ item.plan.grade }}</span>
                                            <span class="text-muted-foreground">/</span>
                                            <span
                                                class="font-mono bg-muted px-1.5 py-0.5 rounded text-xs"
                                                :class="getECTSColorClass(toECTS(item.plan.grade))"
                                            >
                                                {{ toECTS(item.plan.grade) }}
                                            </span>
                                        </div>
                                        <div v-else class="text-muted-foreground">
                                            -
                                        </div>
                                    </TableCell>
                                    <TableCell class="border-b">
                                        <div v-if="item.plan" class="flex flex-col gap-1">
                                            <div class="flex items-center gap-1 text-sm">
                                                <Calendar class="w-3.5 h-3.5 text-muted-foreground" />
                                                <span>{{ formatDate(item.plan.dateApplied) }}</span>
                                            </div>
                                            <div class="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock class="w-3 h-3" />
                                                <span>{{ formatTime(item.plan.dateApplied) }}</span>
                                                <span class="ml-1 opacity-60">·</span>
                                                <span class="ml-1 uppercase">{{
                                                    t(`plans.sessionTypes.${item.plan.sessionType}`)
                                                }}</span>
                                            </div>
                                        </div>
                                        <div v-else class="text-muted-foreground">
                                            -
                                        </div>
                                    </TableCell>
                                    <TableCell class="border-b">
                                        <Switch
                                            :model-value="item.plan?.isSynced ?? false"
                                            @update:model-value="
                                                (val: boolean) =>
                                                    handleToggleSync(
                                                        item.student.id!,
                                                        item.student.iep!,
                                                        val,
                                                        item.hasPlan,
                                                        item.plan,
                                                    )
                                            "
                                        />
                                    </TableCell>
                                    <TableCell class="border-b">
                                        <div v-if="item.plan?.syncedAt" class="flex flex-col gap-1">
                                            <div class="flex items-center gap-1 text-sm">
                                                <Calendar class="w-3.5 h-3.5 text-muted-foreground" />
                                                <span>{{ formatDate(item.plan.syncedAt) }}</span>
                                            </div>
                                            <div class="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock class="w-3 h-3" />
                                                <span>{{ formatTime(item.plan.syncedAt) }}</span>
                                            </div>
                                        </div>
                                        <div v-else class="text-muted-foreground">
                                            -
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow v-if="studentPlans.length === 0">
                                    <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
                                        {{ t('plans.table.noStudents') }}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
