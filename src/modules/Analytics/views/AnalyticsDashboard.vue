<script setup lang="ts">
import type { EnrichedStat } from '@Analytics/types/analytics'
import AnalyticsCard from '@Analytics/components/AnalyticsCard.vue'
import { useDashboardSections } from '@Analytics/composables/useDashboardSections'
import { COURSE_SECTIONS } from '@Analytics/constants/analytics.constants'
import { BarChart3, ChevronDown, ChevronRight, FileUp, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmptyState from '@/shared/components/EmptyState.vue'
import QrCodeModal from '@/shared/components/QrCodeModal.vue'
import { useQuerySync } from '@/shared/composables/useQuerySync'

interface Props {
    stats?: EnrichedStat[]
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    stats: () => [],
    loading: false,
})

const emit = defineEmits<{
    (e: 'view-details', meetId: string): void
    (e: 'refresh'): void
}>()

const router = useRouter()

const showQrModal = ref(false)
const selectedMeetId = ref<string | null>(null)
const searchQuery = ref('')
useQuerySync({ search: searchQuery })

const { toggleSection, isSectionCollapsed } = useDashboardSections()

const filteredStats = computed<EnrichedStat[]>(() => {
    if (!searchQuery.value) return props.stats
    const query = searchQuery.value.toLowerCase()
    return props.stats.filter(
        (stat) =>
            stat.meetId.toLowerCase().includes(query) ||
            stat.displayName.toLowerCase().includes(query) ||
            (stat.teacherName && stat.teacherName.toLowerCase().includes(query)),
    )
})

interface GroupedSection {
    title: string
    items: EnrichedStat[]
    id: string
    key: string
}

const groupedStats = computed<GroupedSection[]>(() => {
    const buckets: Record<number | 'other', EnrichedStat[]> = {
        4: [],
        3: [],
        2: [],
        1: [],
        other: [],
    }

    filteredStats.value.forEach((stat) => {
        const course = stat.course
        if (course && course >= 1 && course <= 4) {
            buckets[course as 1 | 2 | 3 | 4]!.push(stat)
        } else {
            buckets.other.push(stat)
        }
    })

    const sortByName = (a: EnrichedStat, b: EnrichedStat) =>
        (a.displayName || '').localeCompare(b.displayName || '', undefined, {
            numeric: true,
            sensitivity: 'base',
        })

    const sections: GroupedSection[] = COURSE_SECTIONS.map((s) => {
        const items = (buckets[s.course] ?? []).sort(sortByName)
        return { title: '', items, id: s.id, key: s.key }
    }).filter((s) => s.items.length > 0)

    const otherItems = buckets.other.sort(sortByName)
    if (otherItems.length > 0) {
        sections.push({ title: '', items: otherItems, id: 'other', key: 'other' })
    }

    return sections
})

function openDetails(stat: EnrichedStat) {
    emit('view-details', stat.meetId)
}

function openQrCode(meetId: string) {
    selectedMeetId.value = meetId
    showQrModal.value = true
}

defineExpose({ refresh: () => emit('refresh') })
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Zone 1: Page header — always visible -->
        <div>
            <h1 class="text-2xl font-bold tracking-tight">
                {{ $t('analytics.title') }}
            </h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                {{ $t('analytics.description') }}
            </p>
        </div>

        <template v-if="stats.length > 0">
            <!-- Search Row -->
            <div class="relative w-full">
                <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('analytics.searchPlaceholder')"
                    class="pl-8"
                />
            </div>

            <div v-if="loading" class="flex items-center justify-center h-64">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>

            <template v-else>
                <!-- Filtered empty — no icon, no CTA; toolbar stays visible for the user to adjust the query -->
                <EmptyState
                    v-if="groupedStats.length === 0"
                    :title="searchQuery ? $t('analytics.noMatch') : $t('analytics.noData')"
                />

                <div v-for="section in groupedStats" :key="section.id" class="space-y-4">
                    <Button
                        variant="ghost"
                        class="flex items-center gap-2 w-full justify-start pl-0 hover:bg-transparent hover:text-foreground"
                        @click="toggleSection(section.id)"
                    >
                        <div class="p-1 rounded-md hover:bg-muted transition-colors">
                            <ChevronRight
                                v-if="isSectionCollapsed(section.id) && !searchQuery"
                                class="w-4 h-4 text-muted-foreground"
                            />
                            <ChevronDown v-else class="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h3 class="text-lg font-semibold text-muted-foreground">
                            {{ $t(`analytics.sections.${section.key}`) }}
                        </h3>
                        <Badge
                            v-if="isSectionCollapsed(section.id) && !searchQuery"
                            variant="secondary"
                            class="ml-2"
                        >
                            {{ section.items.length }}
                        </Badge>
                        <div class="flex-1 ml-4 h-px bg-border self-center" />
                    </Button>

                    <div
                        v-show="!isSectionCollapsed(section.id) || searchQuery"
                        class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    >
                        <AnalyticsCard
                            v-for="stat in section.items"
                            :key="stat.meetId"
                            :stat="stat"
                            @view-details="openDetails(stat)"
                            @show-qr="openQrCode"
                        />
                    </div>
                </div>
            </template>
        </template>

        <EmptyState
            v-else
            :title="$t('analytics.noData')"
            :description="$t('analytics.noDataDescription')"
            :icon="BarChart3"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <Button class="mt-4 gap-2" @click="router.push({ name: 'reports' })">
                <FileUp class="w-4 h-4" />
                {{ $t('nav.reports') }}
            </Button>
        </EmptyState>

        <QrCodeModal v-model:open="showQrModal" :meet-id="selectedMeetId" />
    </div>
</template>
