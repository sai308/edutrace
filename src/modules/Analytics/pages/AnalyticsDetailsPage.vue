<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, List, Calendar as CalendarIcon, ChartBar } from 'lucide-vue-next';
import { useAnalyticsDetails } from '../composables/useAnalyticsDetails';
import AnalyticsOverviewView from '../views/AnalyticsOverviewView.vue';
import AnalyticsTableView from '../views/AnalyticsTableView.vue';
import AnalyticsCalendarView from '../views/AnalyticsCalendarView.vue';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const route = useRoute();
const router = useRouter();

const props = defineProps({
    id: {
        type: String,
        required: true
    }
});

// View mode state management with URL sync
const viewMode = ref(route.query.view || 'overview');

watch(() => route.query.view, (newView) => {
    if (newView && newView !== viewMode.value) {
        viewMode.value = newView;
    }
});

// Sync tab changes to URL
watch(viewMode, (newMode) => {
    if (route.query.view !== newMode) {
        router.replace({ query: { ...route.query, view: newMode } });
    }
});

// Data fetching
const { stats, loading, loadDetails } = useAnalyticsDetails(props.id);

onMounted(() => {
    loadDetails();
});

function handleBack() {
    router.push({ name: 'Analytics' });
}
</script>

<template>
    <div class="container mx-auto p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <Button variant="ghost" size="icon" @click="handleBack" :title="$t('common.back')">
                    <ArrowLeft class="w-5 h-5" />
                </Button>
                <div>
                    <h2 class="text-2xl font-bold tracking-tight">{{ $t('analytics.details.title') }}</h2>
                    <div class="flex flex-wrap items-center md:gap-x-16 gap-x-4 text-muted-foreground">
                        <span>{{ id }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- content -->
        <div v-else-if="stats">
            <Tabs v-model="viewMode" class="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview" class="flex items-center gap-2">
                        <ChartBar class="w-4 h-4" />
                        {{ $t('views.overview') }}
                    </TabsTrigger>
                    <TabsTrigger value="table" class="flex items-center gap-2">
                        <List class="w-4 h-4" />
                        {{ $t('views.table') }}
                    </TabsTrigger>
                    <TabsTrigger value="calendar" class="flex items-center gap-2">
                        <CalendarIcon class="w-4 h-4" />
                        {{ $t('views.calendar') }}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" class="space-y-4">
                    <AnalyticsOverviewView :stats="stats" />
                </TabsContent>
                <TabsContent value="table" class="space-y-4">
                    <AnalyticsTableView :stats="stats" />
                </TabsContent>
                <TabsContent value="calendar" class="space-y-4">
                    <AnalyticsCalendarView :stats="stats" :id="id" />
                </TabsContent>
            </Tabs>
        </div>

        <!-- No Data State -->
        <div v-else class="text-center py-12 text-muted-foreground">
            {{ $t('analytics.details.noData') }}
        </div>
    </div>
</template>

