<script setup lang="ts">
import { useAnalyticsDetails } from '@Analytics/composables/useAnalyticsDetails'
import AnalyticsCalendarView from '@Analytics/views/AnalyticsCalendarView.vue'
import AnalyticsOverviewView from '@Analytics/views/AnalyticsOverviewView.vue'
import AnalyticsTableView from '@Analytics/views/AnalyticsTableView.vue'
import { ArrowLeft, Calendar as CalendarIcon, List, Users } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuerySync } from '@/shared/composables/useQuerySync'

interface Props {
    id: string
}

const props = defineProps<Props>()
const router = useRouter()

const viewMode = ref<'overview' | 'table' | 'calendar'>('overview')
useQuerySync({ view: viewMode })

const { stats, loading, loadDetails } = useAnalyticsDetails(props.id)

onMounted(() => {
    loadDetails()
})

function handleBack(): void {
    router.push({ name: 'Analytics' })
}
</script>

<template>
    <div class="container py-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>

        <div v-else-if="stats">
            <Tabs v-model="viewMode" class="space-y-4">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-start md:items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            :title="$t('common.back')"
                            class="mt-1 md:mt-0 shrink-0"
                            @click="handleBack"
                        >
                            <ArrowLeft :size="20" />
                        </Button>
                        <div>
                            <h2
                                class="text-xl md:text-2xl font-bold tracking-tight text-wrap wrap-break-word"
                            >
                                {{ $t('analytics.details.title') }}
                            </h2>
                            <div class="flex flex-wrap items-center gap-x-4 text-muted-foreground">
                                <span class="text-sm md:text-base break-all">{{ id }}</span>
                            </div>
                        </div>
                    </div>
                    <TabsList
                        class="w-full md:w-auto h-auto p-1 flex-wrap justify-start md:justify-center"
                    >
                        <TabsTrigger
                            value="overview"
                            class="flex-1 md:flex-none flex items-center justify-center md:gap-2"
                        >
                            <List class="w-4 h-4" />
                            <span class="hidden md:inline">{{ $t('views.overview') }}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="table"
                            class="flex-1 md:flex-none flex items-center justify-center md:gap-2"
                        >
                            <Users class="w-4 h-4" />
                            <span class="hidden md:inline">{{ $t('views.participants') }}</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="calendar"
                            class="flex-1 md:flex-none flex items-center justify-center md:gap-2"
                        >
                            <CalendarIcon class="w-4 h-4" />
                            <span class="hidden md:inline">{{ $t('views.calendar') }}</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" class="space-y-4">
                    <AnalyticsOverviewView :stats="stats" />
                </TabsContent>
                <TabsContent value="table" class="space-y-4">
                    <AnalyticsTableView :stats="stats" />
                </TabsContent>
                <TabsContent value="calendar" class="space-y-4">
                    <AnalyticsCalendarView :id="id" :stats="stats" />
                </TabsContent>
            </Tabs>
        </div>

        <div v-else class="text-center py-12 text-muted-foreground">
            {{ $t('analytics.details.noData') }}
        </div>
    </div>
</template>
