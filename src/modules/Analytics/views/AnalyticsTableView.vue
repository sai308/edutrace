<script setup lang="ts">
import type { DetailedStats } from '@Analytics/types/analytics'
import AnalyticsDataTable from '@Analytics/components/AnalyticsTable/DataTable.vue'
import { Search } from 'lucide-vue-next'
import { ref } from 'vue'
import { Input } from '@/components/ui/input'

defineProps<{ stats: DetailedStats }>()

const searchQuery = ref('')
</script>

<template>
    <AnalyticsDataTable :stats="stats" :search-query="searchQuery">
        <template #toolbar>
            <div class="relative flex-1 max-w-xs">
                <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('analytics.details.table.searchPlaceholder')"
                    class="pl-8 h-9"
                />
            </div>
        </template>
    </AnalyticsDataTable>
</template>
