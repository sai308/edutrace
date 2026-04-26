<script setup lang="ts">
import type { Member } from '@Students/types/students'
import type { RowActionItem } from '@/shared/types/table'
import MemberDialog from '@Members/components/dialogs/MemberDialog.vue'
import DataTable from '@Members/components/MembersList/DataTable.vue'
import { useMembers } from '@Members/composables/useMembers'
import {
    Copy,
    FileUp,
    GraduationCap,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    UserCog,
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
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

const { t } = useI18n()
const router = useRouter()

const {
    members,
    isLoading,
    searchQuery,
    isDialogOpen,
    selectedMember,
    isDeleteDialogOpen,
    isHardDeleteDialogOpen,
    isBulkDeleteDialogOpen,
    allGroups,
    openAddDialog,
    handleEdit,
    handleSave,
    confirmDelete,
    executeSoftDelete,
    handleRestore,
    confirmBulkDelete,
    executeBulkDelete,
    confirmHardDelete,
    executeHardDelete,
} = useMembers()

const bulkMode = ref(false)

function getMemberActions(member: Member): RowActionItem[] {
    const isDeleted = member.hidden

    if (isDeleted) {
        return [
            {
                label: t('common.copyId'),
                icon: Copy,
                onSelect: () => navigator.clipboard.writeText(member.id),
            },
            { type: 'separator' },
            {
                label: t('common.restore'),
                icon: RotateCcw,
                onSelect: () => handleRestore(member),
            },
            { type: 'separator' },
            {
                label: t('common.deletePermanently'),
                icon: Trash2,
                destructive: true,
                onSelect: () => confirmHardDelete(member),
            },
        ]
    }

    return [
        {
            label: t('common.copyId'),
            icon: Copy,
            onSelect: () => navigator.clipboard.writeText(member.id),
        },
        { type: 'separator' },
        {
            label: t('common.edit'),
            icon: Pencil,
            onSelect: () => handleEdit(member),
        },
        { type: 'separator' },
        {
            label: t('common.delete'),
            icon: Trash2,
            destructive: true,
            onSelect: () => confirmDelete(member),
        },
    ]
}
</script>

<template>
    <div
        class="flex-1 space-y-4 p-4 md:p-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center p-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>

        <template v-else>
            <!-- Zone 1: Page header — always visible when not loading -->
            <div class="flex flex-row items-start sm:items-center justify-between gap-4">
                <div class="min-w-0">
                    <h1 class="text-2xl font-bold tracking-tight truncate">
                        {{ $t('members.title') }}
                    </h1>
                    <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
                        {{
                            members.length > 0
                                ? $t('members.total', { count: members.length })
                                : $t('members.description')
                        }}
                    </p>
                </div>
                <Button
                    v-if="members.length > 0"
                    size="sm"
                    class="gap-2 shrink-0"
                    @click="openAddDialog"
                >
                    <Plus class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ $t('members.add') }}</span>
                </Button>
            </div>

            <!-- Zone 2 + Table -->
            <DataTable
                v-if="members.length > 0"
                :items="members"
                :search-query="searchQuery"
                :bulk-mode="bulkMode"
                :row-actions="getMemberActions"
            >
                <template #toolbar="{ table }">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <!-- Search -->
                        <div class="relative max-w-xs flex-1">
                            <Search
                                class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                            />
                            <Input
                                v-model="searchQuery"
                                :placeholder="$t('members.search')"
                                class="pl-8 h-9"
                            />
                        </div>

                        <!-- Bulk-ops switch -->
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

                        <!-- Bulk delete button — visible only when rows are selected -->
                        <Button
                            v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                            variant="destructive"
                            size="sm"
                            class="h-8 gap-2 shrink-0"
                            @click="
                                confirmBulkDelete(
                                    table
                                        .getFilteredSelectedRowModel()
                                        .rows.map((r) => r.original.id),
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
                </template>
            </DataTable>

            <EmptyState
                v-else
                :title="$t('members.emptyState.title')"
                :description="$t('members.emptyState.description')"
                :icon="UserCog"
                class="min-h-[400px]"
                learn-more-url="#"
            >
                <div class="mt-4 flex flex-col items-center gap-3">
                    <div class="flex flex-wrap items-center justify-center gap-3">
                        <Button
                            variant="outline"
                            class="gap-2"
                            @click="router.push({ name: 'reports' })"
                        >
                            <FileUp class="w-4 h-4" />
                            {{ $t('common.importReports') }}
                        </Button>
                        <Button
                            variant="outline"
                            class="gap-2"
                            @click="router.push({ name: 'Marks' })"
                        >
                            <GraduationCap class="w-4 h-4" />
                            {{ $t('common.importMarks') }}
                        </Button>
                    </div>
                    <Button size="sm" class="gap-2" @click="openAddDialog">
                        <Plus class="w-4 h-4" />
                        {{ $t('members.add') }}
                    </Button>
                </div>
            </EmptyState>
        </template>

        <!-- Modals -->
        <MemberDialog
            :is-open="isDialogOpen"
            :member="selectedMember"
            :all-groups="allGroups"
            @update:is-open="isDialogOpen = $event"
            @save="handleSave"
            @close="isDialogOpen = false"
        />

        <!-- Soft Delete Confirmation -->
        <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('members.dialog.delete') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('members.dialog.deleteConfirm') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="isDeleteDialogOpen = false">
                        {{ $t('common.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="executeSoftDelete"
                    >
                        {{ $t('common.delete') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Bulk Delete Confirmation -->
        <AlertDialog :open="isBulkDeleteDialogOpen" @update:open="isBulkDeleteDialogOpen = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('members.dialog.delete') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('members.dialog.deleteConfirm') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="isBulkDeleteDialogOpen = false">
                        {{ $t('common.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="executeBulkDelete"
                    >
                        {{ $t('common.delete') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Hard Delete Confirmation -->
        <AlertDialog :open="isHardDeleteDialogOpen" @update:open="isHardDeleteDialogOpen = $event">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t('members.dialog.hardDelete') }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ $t('members.dialog.hardDeleteConfirm') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="isHardDeleteDialogOpen = false">
                        {{ $t('common.cancel') }}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="executeHardDelete"
                    >
                        {{ $t('common.deletePermanently') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>
