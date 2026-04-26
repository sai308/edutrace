<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

const props = defineProps<{ table: Table<TData> }>()

const { t } = useI18n()

const pageIndex = computed(() => props.table.getState().pagination.pageIndex)
const pageSize = computed(() => props.table.getState().pagination.pageSize)
const pageCount = computed(() => props.table.getPageCount())
const totalRows = computed(() => props.table.getFilteredRowModel().rows.length)

const from = computed(() => (totalRows.value === 0 ? 0 : pageIndex.value * pageSize.value + 1))
const to = computed(() => Math.min((pageIndex.value + 1) * pageSize.value, totalRows.value))
</script>

<template>
    <div class="flex items-center justify-between gap-4 py-3 text-sm">
        <!-- Row range -->
        <span class="text-muted-foreground tabular-nums shrink-0">
            {{ t('common.pagination.showing', { from, to, total: totalRows }) }}
        </span>

        <!-- Page navigation -->
        <div class="flex items-center gap-2 shrink-0">
            <Button
                variant="outline"
                size="sm"
                class="gap-1.5"
                :disabled="!table.getCanPreviousPage()"
                @click="table.previousPage()"
            >
                <ChevronLeft class="w-4 h-4" />
                <span class="hidden sm:inline">{{ t('common.pagination.previous') }}</span>
            </Button>

            <span class="text-muted-foreground tabular-nums px-1 hidden sm:inline">
                {{ t('common.pagination.pageOf', { current: pageIndex + 1, total: pageCount }) }}
            </span>

            <Button
                variant="outline"
                size="sm"
                class="gap-1.5"
                :disabled="!table.getCanNextPage()"
                @click="table.nextPage()"
            >
                <span class="hidden sm:inline">{{ t('common.pagination.next') }}</span>
                <ChevronRight class="w-4 h-4" />
            </Button>
        </div>
    </div>
</template>
