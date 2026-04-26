<script setup lang="ts">
import { useReportMeet } from '@Reports/composables/useReportMeet'
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Clock,
    GanttChart,
    Loader2,
    Users,
} from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmptyState from '@/shared/components/EmptyState.vue'
import { useFormatters } from '@/shared/composables/useFormatters'
import { useQuerySync } from '@/shared/composables/useQuerySync'
import ReportCalendarView from '../views/ReportCalendarView.vue'
import ReportOverviewView from '../views/ReportOverviewView.vue'
import ReportParticipantsView from '../views/ReportParticipantsView.vue'

const route = useRoute()
const router = useRouter()
const meetId = route.params.id as string

const { meet, isLoading, totalDuration, avgDuration, loadMeet } = useReportMeet(meetId)
const { formatDuration } = useFormatters()

const viewMode = ref<'overview' | 'participants' | 'calendar'>('overview')
useQuerySync({ view: viewMode })

onMounted(loadMeet)
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Loading -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
                {{ $t('common.loading') }}
            </p>
        </div>

        <!-- Main content -->
        <div v-else-if="meet" class="space-y-6">
            <Tabs v-model="viewMode" class="space-y-6">
                <!-- Zone 1: Header -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <!-- Left: back + title -->
                    <div class="flex items-start md:items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="shrink-0 mt-0.5 md:mt-0"
                            :title="$t('common.back')"
                            @click="router.back()"
                        >
                            <ArrowLeft class="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 class="text-2xl font-bold tracking-tight">
                                {{ $t('reports.session.reportTitle') }}
                            </h1>
                            <p
                                class="text-sm text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-sm md:max-w-none"
                                :title="meet.filename"
                            >
                                {{ meet.filename }}
                            </p>
                        </div>
                    </div>

                    <!-- Right: view switcher -->
                    <TabsList
                        class="w-full md:w-auto h-auto p-1 flex-wrap justify-start md:justify-center"
                    >
                        <TabsTrigger value="overview" class="flex-1 md:flex-none gap-2">
                            <GanttChart class="w-4 h-4" />
                            <span class="hidden md:inline">{{ $t('views.overview') }}</span>
                        </TabsTrigger>
                        <TabsTrigger value="participants" class="flex-1 md:flex-none gap-2">
                            <Users class="w-4 h-4" />
                            <span class="hidden md:inline">{{ $t('views.participants') }}</span>
                        </TabsTrigger>
                        <TabsTrigger value="calendar" class="flex-1 md:flex-none gap-2">
                            <Calendar class="w-4 h-4" />
                            <span class="hidden md:inline">{{ $t('views.calendar') }}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <!-- Zone 2: Stats strip -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Card class="min-w-0">
                        <CardContent class="p-3 sm:p-4 flex items-center gap-3">
                            <Calendar
                                class="h-10 w-10 text-muted-foreground opacity-60 shrink-0 hidden sm:block"
                            />
                            <div class="min-w-0">
                                <p
                                    class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    {{ $t('reports.session.stats.date') }}
                                </p>
                                <div class="text-base sm:text-2xl font-bold truncate">
                                    {{ new Date(meet.date).toLocaleDateString() }}
                                </div>
                                <p
                                    class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                                >
                                    {{ $t('reports.session.stats.dateDesc') }}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="min-w-0">
                        <CardContent class="p-3 sm:p-4 flex items-center gap-3">
                            <Users
                                class="h-10 w-10 text-muted-foreground opacity-60 shrink-0 hidden sm:block"
                            />
                            <div class="min-w-0">
                                <p
                                    class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    {{ $t('reports.session.stats.participants') }}
                                </p>
                                <div class="text-base sm:text-2xl font-bold truncate">
                                    {{ meet.participants.length }}
                                </div>
                                <p
                                    class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                                >
                                    {{ $t('reports.session.stats.participantsDesc') }}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="min-w-0">
                        <CardContent class="p-3 sm:p-4 flex items-center gap-3">
                            <Clock
                                class="h-10 w-10 text-muted-foreground opacity-60 shrink-0 hidden sm:block"
                            />
                            <div class="min-w-0">
                                <p
                                    class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    {{ $t('reports.session.stats.totalDuration') }}
                                </p>
                                <div class="text-base sm:text-2xl font-bold truncate">
                                    {{ formatDuration(totalDuration) }}
                                </div>
                                <p
                                    class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                                >
                                    {{ $t('reports.session.stats.totalDurationDesc') }}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="min-w-0">
                        <CardContent class="p-3 sm:p-4 flex items-center gap-3">
                            <Clock
                                class="h-10 w-10 text-muted-foreground opacity-60 shrink-0 hidden sm:block"
                            />
                            <div class="min-w-0">
                                <p
                                    class="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    {{ $t('reports.session.stats.avgDuration') }}
                                </p>
                                <div class="text-base sm:text-2xl font-bold truncate">
                                    {{ formatDuration(avgDuration) }}
                                </div>
                                <p
                                    class="text-[9px] sm:text-xs text-muted-foreground truncate hidden sm:block"
                                >
                                    {{ $t('reports.session.stats.avgDurationDesc') }}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Zone 3: View content -->
                <TabsContent value="overview" class="space-y-4">
                    <ReportOverviewView :meet="meet" />
                </TabsContent>

                <TabsContent value="participants" class="space-y-4">
                    <ReportParticipantsView :meet="meet" />
                </TabsContent>

                <TabsContent value="calendar" class="space-y-4">
                    <ReportCalendarView :meet="meet" />
                </TabsContent>
            </Tabs>
        </div>

        <!-- Not found -->
        <EmptyState
            v-else
            :title="$t('reports.session.notFound')"
            :description="$t('reports.session.notFoundDesc')"
            :icon="AlertCircle"
            class="min-h-[400px]"
        >
            <Button variant="outline" class="mt-4" @click="router.back()">
                {{ $t('common.back') }}
            </Button>
        </EmptyState>
    </div>
</template>
