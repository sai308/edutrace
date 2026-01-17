<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Calendar, Clock, Users, GanttChart } from 'lucide-vue-next'
import { meetsRepository } from '@/modules/Analytics/services/meets.repository'
import type { Meet } from '@/modules/Analytics/types/analytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ReportParticipantsView from '../views/ReportParticipantsView.vue'
import ReportOverviewView from '../views/ReportOverviewView.vue'
import ReportCalendarView from '../views/ReportCalendarView.vue'
import { calculateMeetDuration } from '../utils/duration'


const route = useRoute()
const router = useRouter()

const meetId = route.params.id as string
const meet = ref<Meet | undefined>(undefined)
const isLoading = ref(true)

onMounted(async () => {
    if (meetId) {
        meet.value = await meetsRepository.getMeetById(meetId)
        if (meet.value?.participants) {
            meet.value.participants.sort((a, b) => a.name.localeCompare(b.name))
        }
    }
    isLoading.value = false
})

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
}

const totalDuration = computed(() => {
    return calculateMeetDuration(meet.value)
})

const avgDuration = computed(() => {
    if (!meet.value?.participants?.length) return 0
    const totalParticipantDuration = meet.value.participants.reduce((acc, p) => acc + p.duration, 0)
    return totalParticipantDuration / meet.value.participants.length
})
</script>

<template>
    <div class="container py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div v-if="isLoading" class="flex justify-center p-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <div v-else-if="meet" class="space-y-8">
            <Tabs default-value="participants" class="w-full space-y-8">
                <!-- Header -->
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <Button variant="ghost" size="icon" @click="router.back()">
                            <ArrowLeft class="w-4 h-4" />
                        </Button>
                        <div>
                            <div class="flex items-center gap-3">
                                <h1 class="text-3xl font-bold tracking-tight">Report Details</h1>
                                <Badge v-if="meet?.groupName" variant="outline" class="text-sm font-normal">
                                    Group: {{ meet.groupName }}
                                </Badge>
                            </div>
                            <p class="text-muted-foreground">
                                {{ meet.filename }}
                            </p>
                        </div>
                    </div>

                    <TabsList>
                        <TabsTrigger value="overall">
                            <GanttChart class="w-4 h-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="participants">
                            <Users class="w-4 h-4 mr-2" />
                            Participants
                        </TabsTrigger>
                        <TabsTrigger value="calendar">
                            <Calendar class="w-4 h-4 mr-2" />
                            Calendar
                        </TabsTrigger>
                    </TabsList>
                </div>

                <!-- Stats Cards -->
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Date</CardTitle>
                            <Calendar class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ new Date(meet.date).toLocaleDateString() }}</div>
                            <p class="text-xs text-muted-foreground">Recorded session date</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Participants</CardTitle>
                            <Users class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ meet.participants.length }}</div>
                            <p class="text-xs text-muted-foreground">Total attendees</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Total Duration</CardTitle>
                            <Clock class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ formatDuration(totalDuration) }}</div>
                            <p class="text-xs text-muted-foreground">Combined participant time</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Avg Duration</CardTitle>
                            <Clock class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ formatDuration(avgDuration) }}</div>
                            <p class="text-xs text-muted-foreground">Per participant</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Views Content -->
                <TabsContent value="participants" class="space-y-4">
                    <ReportParticipantsView :meet="meet" />
                </TabsContent>

                <TabsContent value="overall" class="space-y-4">
                    <ReportOverviewView :meet="meet" />
                </TabsContent>

                <TabsContent value="calendar" class="space-y-4">
                    <ReportCalendarView :meet="meet" />
                </TabsContent>
            </Tabs>
        </div>

        <div v-else class="text-center p-12">
            <h3 class="text-lg font-medium">Report not found</h3>
            <p class="text-muted-foreground">The requested report could not be found.</p>
            <Button variant="outline" class="mt-4" @click="router.push({ name: 'reports' })">
                Back to Reports
            </Button>
        </div>
    </div>
</template>
