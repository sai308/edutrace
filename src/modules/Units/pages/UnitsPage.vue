<script setup lang="ts">
import type { Unit } from '@Units/types/units'
import type { RowActionItem } from '@/shared/types/table'
import UnitDialog from '@Units/components/dialogs/UnitDialog.vue'
import UnitsListDataTable from '@Units/components/UnitsList/UnitsListDataTable.vue'
import { useUnits } from '@Units/composables/useUnits'
import { ArrowUpDown, Layers, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

const { t } = useI18n()
const { units, availableTasks, loadData, saveUnit, deleteUnit, bulkDeleteUnits, saveOrder } = useUnits()

const searchQuery = ref('')
const bulkMode = ref(false)
const isReordering = ref(false)

const isDialogOpen = ref(false)
const currentUnit = ref<Unit | null>(null)
const isDeleteDialogOpen = ref(false)
const unitToDelete = ref<Unit | null>(null)

onMounted(loadData)

function handleAddUnit() {
    currentUnit.value = null
    isDialogOpen.value = true
}

function handleEditUnit(unit: Unit) {
    currentUnit.value = { ...unit }
    isDialogOpen.value = true
}

function confirmDeleteUnit(unit: Unit) {
    unitToDelete.value = unit
    isDeleteDialogOpen.value = true
}

async function handleDeleteConfirm() {
    if (!unitToDelete.value)
        return
    await deleteUnit(unitToDelete.value)
    isDeleteDialogOpen.value = false
    unitToDelete.value = null
}

async function handleSaveUnit(formData: Partial<Unit>) {
    const saved = await saveUnit(formData, currentUnit.value)
    if (saved)
        isDialogOpen.value = false
}

function handleUpdateOrder(newData: Unit[]) {
    units.value = newData
}

async function toggleReordering() {
    if (isReordering.value) {
        await saveOrder(units.value)
    }
    isReordering.value = !isReordering.value
}

function handleBulkDelete(table: InstanceType<typeof UnitsListDataTable>['table']) {
    const ids = table.getFilteredSelectedRowModel().rows.map(r => r.original.id as number)
    bulkDeleteUnits(ids)
    table.resetRowSelection()
}

function getUnitActions(unit: Unit): RowActionItem[] {
    return [
        {
            label: t('modules.columns.edit'),
            icon: Pencil,
            onSelect: () => handleEditUnit(unit),
        },
        { type: 'separator' },
        {
            label: t('modules.columns.delete'),
            icon: Trash2,
            destructive: true,
            onSelect: () => confirmDeleteUnit(unit),
        },
    ]
}
</script>

<template>
    <div class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- Zone 1: Page header -->
        <div class="flex flex-row items-start sm:items-center justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-2xl font-bold tracking-tight truncate">
                    {{ t('modules.title') }}
                </h1>
                <!-- Mobile: mandatory counter -->
                <p class="text-sm text-muted-foreground mt-0.5 truncate sm:hidden">
                    {{ t('modules.subtitle', { count: units.length }) }}
                </p>
                <!-- Desktop: description -->
                <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
                    {{ t('modules.description') }}
                </p>
            </div>
            <div v-if="units.length > 0" class="flex items-center gap-2 shrink-0">
                <Button size="sm" class="gap-2" @click="handleAddUnit">
                    <Plus class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ t('modules.list.createUnit') }}</span>
                </Button>
            </div>
        </div>

        <!-- Zone 2 + Table -->
        <template v-if="units.length > 0">
            <UnitsListDataTable
                :units="units"
                :search-query="searchQuery"
                :bulk-mode="bulkMode"
                :is-reordering="isReordering"
                :row-actions="getUnitActions"
                @update-order="handleUpdateOrder"
            >
                <template #toolbar="{ table }">
                    <!-- ── Mobile (< sm): 2-row layout ── -->
                    <div class="flex flex-col gap-2 sm:hidden">
                        <!-- Row 1: full-width search -->
                        <div class="relative">
                            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                v-model="searchQuery"
                                :placeholder="t('modules.list.filterPlaceholder')"
                                class="pl-8 h-9 w-full"
                            />
                        </div>
                        <!-- Row 2: bulk (col 1) | reorder (col 2) | columns (col 3) -->
                        <div class="grid grid-cols-3 gap-2">
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive" size="sm" class="h-9 gap-2 w-full"
                                @click="handleBulkDelete(table)"
                            >
                                <Trash2 class="h-4 w-4 shrink-0" />
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                            <div v-else class="flex items-center gap-2 h-9">
                                <Switch :model-value="bulkMode" class="cursor-pointer" @update:model-value="bulkMode = $event" />
                                <span class="text-sm text-muted-foreground select-none">{{ t('common.bulk') }}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm" class="h-9 w-full transition-colors"
                                :class="isReordering && 'border-primary text-primary hover:text-primary'"
                                @click="toggleReordering"
                            >
                                <ArrowUpDown class="h-4 w-4" />
                            </Button>
                            <DataTableViewOptions
                                :table="table"
                                :compact="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                button-class="w-full"
                            />
                        </div>
                    </div>

                    <!-- ── Desktop (≥ sm): single-row layout ── -->
                    <div class="hidden sm:flex items-center justify-between gap-3">
                        <!-- Left: search → bulk switch → bulk delete -->
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="t('modules.list.filterPlaceholder')"
                                    class="pl-8 h-9"
                                />
                            </div>
                            <div
                                v-if="!(bulkMode && table.getFilteredSelectedRowModel().rows.length > 0)"
                                class="flex items-center gap-2 shrink-0"
                            >
                                <Switch :model-value="bulkMode" @update:model-value="bulkMode = $event" />
                                <span class="text-sm text-muted-foreground select-none">{{ t('common.bulk') }}</span>
                            </div>
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive"
                                size="sm"
                                class="h-8 gap-2 shrink-0"
                                @click="handleBulkDelete(table)"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span>{{ t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                        <!-- Right: reorder toggle + columns picker -->
                        <div class="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                class="shrink-0 transition-colors"
                                :class="isReordering && 'border-primary text-primary hover:text-primary'"
                                @click="toggleReordering"
                            >
                                <ArrowUpDown class="h-4 w-4" />
                                <span>{{ isReordering ? t('modules.list.saveOrder') : t('modules.list.reorder') }}</span>
                            </Button>
                            <DataTableViewOptions :table="table" />
                        </div>
                    </div>
                </template>
            </UnitsListDataTable>
        </template>

        <EmptyState
            v-else
            :title="t('modules.list.noResults')"
            :description="t('modules.list.noUnitsDescription')"
            :icon="Layers"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <Button class="mt-4 gap-2" @click="handleAddUnit">
                <Plus class="w-4 h-4" />
                {{ t('modules.list.createUnit') }}
            </Button>
        </EmptyState>

        <UnitDialog
            v-model:is-open="isDialogOpen"
            :unit="currentUnit"
            :available-tasks="availableTasks"
            @save="handleSaveUnit"
        />

        <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ t('modules.alerts.deleteTitle') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ unitToDelete ? t('modules.alerts.deleteDesc', { name: unitToDelete.name }) : '' }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="isDeleteDialogOpen = false">
                        {{ t('modules.alerts.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="handleDeleteConfirm"
                    >
                        {{ t('modules.alerts.delete') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>
