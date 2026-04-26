<script setup lang="ts">
import type { EnrichedGroup, GroupFormData } from '@Groups/types/groups'
import type { RowActionItem } from '@/shared/types/table'
import { Edit2, Layers, Plus, QrCode, Search, Trash2 } from 'lucide-vue-next'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
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
import EmptyState from '@/shared/components/EmptyState.vue'
import QrCodeModal from '@/shared/components/QrCodeModal.vue'

import { useQuerySync } from '@/shared/composables/useQuerySync'
import GroupModal from '../components/GroupModal.vue'
import GroupsDataTable from '../components/GroupsList/DataTable.vue'

interface Props {
    groups?: EnrichedGroup[]
    memberCounts?: Record<string, number>
    allMeetIds?: string[]
    allTeachers?: string[]
}

withDefaults(defineProps<Props>(), {
    groups: () => [],
    memberCounts: () => ({}),
    allMeetIds: () => [],
    allTeachers: () => [],
})

const emit = defineEmits<{
    (e: 'save-group', formData: GroupFormData): void
    (e: 'delete-group', id: string | number): void
    (e: 'refresh'): void
}>()

const { t } = useI18n()

// Modal states
const showGroupModal = ref(false)
const showDeleteModal = ref(false)
const showQrModal = ref(false)
const selectedGroup = ref<EnrichedGroup | null>(null)
const groupToDeleteId = ref<string | number | null>(null)
const qrMeetId = ref('')

// Search and sort synced to query params
const route = useRoute()
const groupsTableRef = ref<InstanceType<typeof GroupsDataTable>>()
const searchQuery = ref('')
const bulkMode = ref(false)
const sortField = ref<string>((route.query.sort as string) || '')
const sortOrder = ref<string>((route.query.order as string) || '')
useQuerySync({ search: searchQuery, sort: sortField, order: sortOrder })

function handleBulkDelete(ids: (string | number)[]): void {
    ids.forEach((id) => emit('delete-group', id))
    groupsTableRef.value?.table.resetRowSelection()
}

function handleSortUpdate(field: string, order: string): void {
    sortField.value = field
    sortOrder.value = order
}

function handleSaveGroup(formData: GroupFormData): void {
    emit('save-group', formData)
    showGroupModal.value = false
}

function handleDeleteConfirm(): void {
    if (groupToDeleteId.value === null) return
    emit('delete-group', groupToDeleteId.value)
    showDeleteModal.value = false
    groupToDeleteId.value = null
}

function openCreateModal(): void {
    selectedGroup.value = null
    showGroupModal.value = true
}

function handleEditGroup(group: EnrichedGroup): void {
    selectedGroup.value = group
    showGroupModal.value = true
}

function handleDeleteGroup(id: string | number): void {
    groupToDeleteId.value = id
    showDeleteModal.value = true
}

function handleShowQr(meetId: string): void {
    qrMeetId.value = meetId
    showQrModal.value = true
}

function getGroupActions(group: EnrichedGroup): RowActionItem[] {
    return [
        {
            label: t('groups.table.showQrCode'),
            icon: QrCode,
            onSelect: () => handleShowQr(group.meetId),
        },
        {
            label: t('common.edit'),
            icon: Edit2,
            onSelect: () => handleEditGroup(group),
        },
        { type: 'separator' },
        {
            label: t('common.delete'),
            icon: Trash2,
            destructive: true,
            onSelect: () => handleDeleteGroup(group.id!),
        },
    ]
}
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Zone 1: Page header — always visible -->
        <div class="flex flex-row items-start sm:items-center justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-2xl font-bold tracking-tight truncate">
                    {{ $t('groups.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
                    <template v-if="groups.length > 0">
                        {{
                            $t('groups.subtitle', {
                                count:
                                    groupsTableRef?.table?.getFilteredRowModel().rows.length ??
                                    groups.length,
                                total: groups.length,
                            })
                        }}
                    </template>
                    <template v-else>
                        {{ $t('groups.description') }}
                    </template>
                </p>
            </div>
            <div v-if="groups.length > 0" class="flex items-center gap-2 shrink-0">
                <Button size="sm" class="gap-2" @click="openCreateModal">
                    <Plus class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ $t('groups.add') }}</span>
                </Button>
            </div>
        </div>

        <template v-if="groups.length > 0">
            <!-- Zone 2 + Table -->
            <GroupsDataTable
                ref="groupsTableRef"
                :groups="groups"
                :member-counts="memberCounts"
                :search-query="searchQuery"
                :bulk-mode="bulkMode"
                :sort-field="sortField"
                :sort-order="sortOrder"
                :row-actions="getGroupActions"
                @update:sort="handleSortUpdate"
            >
                <template #toolbar="{ table }">
                    <div class="flex items-center justify-between gap-3 flex-1">
                        <!-- Left: search → bulk switch → bulk delete -->
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search
                                    class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                                />
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="$t('groups.searchPlaceholder')"
                                    class="pl-8 h-9"
                                />
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <Switch
                                    :model-value="bulkMode"
                                    @update:model-value="bulkMode = $event"
                                />
                                <span
                                    class="text-sm text-muted-foreground hidden sm:inline select-none"
                                >
                                    {{ $t('common.bulk') }}
                                </span>
                            </div>
                            <Button
                                v-if="
                                    bulkMode && table.getFilteredSelectedRowModel().rows.length > 0
                                "
                                variant="destructive"
                                size="sm"
                                class="h-8 gap-2 shrink-0"
                                @click="
                                    handleBulkDelete(
                                        table
                                            .getFilteredSelectedRowModel()
                                            .rows.map((r: any) => r.original.id),
                                    )
                                "
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span class="hidden sm:inline">{{ $t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                    </div>
                </template>
            </GroupsDataTable>
        </template>

        <EmptyState
            v-else
            :title="$t('groups.emptyState.title')"
            :description="$t('groups.emptyState.description')"
            :icon="Layers"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <Button class="mt-4 gap-2" @click="openCreateModal">
                <Plus class="w-4 h-4" />
                {{ $t('groups.add') }}
            </Button>
        </EmptyState>

        <!-- Modals -->
        <GroupModal
            :open="showGroupModal"
            :group="selectedGroup"
            :all-meet-ids="allMeetIds"
            :all-teachers="allTeachers"
            @update:open="showGroupModal = $event"
            @save="handleSaveGroup"
        />

        <AlertDialog :open="showDeleteModal" @update:open="showDeleteModal = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('groups.deleteModal.title') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('groups.deleteModal.message') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="showDeleteModal = false">
                        {{ $t('groups.deleteModal.cancel', 'Cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="handleDeleteConfirm"
                    >
                        {{ $t('groups.deleteModal.confirm') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <QrCodeModal v-model:open="showQrModal" :meet-id="qrMeetId" />
    </div>
</template>
