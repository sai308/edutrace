<script setup lang="ts">
import type { Member } from '@Members/types/members'
import type { RowActionItem } from '@/shared/types/table'
import MemberDialog from '@Members/components/dialogs/MemberDialog.vue'
import DataTable from '@Members/components/MembersList/DataTable.vue'
import { useMembers } from '@Members/composables/useMembers'
import {
    BookOpen,
    Copy,
    FileUp,
    GraduationCap,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    UserCheck,
    UserCog,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import DataTableViewOptions from '@/shared/components/DataTableViewOptions.vue'
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

onMounted(() => loadMembers())

const bulkMode = ref(false)

type MemberFilter = 'student' | 'teacher' | 'assistant' | 'deleted'
const activeFilter = ref<MemberFilter | undefined>(undefined)

const filterCounts = computed(() => {
    const counts = { student: 0, teacher: 0, assistant: 0, deleted: 0 }
    for (const m of members.value) {
        if (m.hidden)
            counts.deleted++
        else if (m.role === 'student')
            counts.student++
        else if (m.role === 'teacher')
            counts.teacher++
        else if (m.role === 'assistant')
            counts.assistant++
    }
    return counts
})

const filteredMembers = computed(() => {
    if (!activeFilter.value)
        return members.value
    if (activeFilter.value === 'deleted')
        return members.value.filter(m => m.hidden)
    const role = activeFilter.value
    return members.value.filter(m => m.role === role && !m.hidden)
})

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
                    <!-- Mobile: mandatory counter -->
                    <p class="text-sm text-muted-foreground mt-0.5 truncate sm:hidden">
                        {{ members.length > 0 ? $t('members.total', { count: members.length }) : $t('members.description') }}
                    </p>
                    <!-- Desktop: description -->
                    <p class="text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
                        {{ $t('members.description') }}
                    </p>
                </div>
                <div v-if="members.length > 0" class="flex items-center gap-2 shrink-0">
                    <Button size="sm" class="gap-2" @click="openAddDialog">
                        <Plus class="w-4 h-4" />
                        <span class="hidden sm:inline">{{ $t('members.add') }}</span>
                    </Button>
                </div>
            </div>

            <!-- Zone 2 + Table -->
            <DataTable
                v-if="members.length > 0"
                :items="filteredMembers"
                :search-query="searchQuery"
                :bulk-mode="bulkMode"
                :row-actions="getMemberActions"
            >
                <template #toolbar="{ table }">
                    <!-- ── Mobile (< sm): 2-row layout ── -->
                    <div class="flex flex-col gap-2 sm:hidden">
                        <!-- Row 1: full-width search -->
                        <div class="relative">
                            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input v-model="searchQuery" :placeholder="$t('members.search')" class="pl-8 h-9 w-full" />
                        </div>
                        <!-- Row 2: bulk (left 50%) | columns (right 50%) -->
                        <div class="grid grid-cols-2 gap-2">
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive" size="sm" class="h-9 gap-2 w-full"
                                @click="confirmBulkDelete(table.getFilteredSelectedRowModel().rows.map((r) => r.original.id))"
                            >
                                <Trash2 class="h-4 w-4 shrink-0" />
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                            <div v-else class="flex items-center gap-2 h-9">
                                <Switch :model-value="bulkMode" class="cursor-pointer" @update:model-value="bulkMode = $event" />
                                <span class="text-sm text-muted-foreground select-none">{{ $t('common.bulk') }}</span>
                            </div>
                            <DataTableViewOptions
                                :table="table"
                                :compact="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                button-class="w-full"
                            />
                        </div>
                    </div>

                    <!-- ── Desktop (≥ sm): single-row layout ── -->
                    <div class="hidden sm:flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="relative max-w-xs flex-1">
                                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input v-model="searchQuery" :placeholder="$t('members.search')" class="pl-8 h-9" />
                            </div>
                            <div
                                v-if="!(bulkMode && table.getFilteredSelectedRowModel().rows.length > 0)"
                                class="flex items-center gap-2 shrink-0"
                            >
                                <Switch :model-value="bulkMode" class="cursor-pointer" @update:model-value="bulkMode = $event" />
                                <span class="text-sm text-muted-foreground select-none">{{ $t('common.bulk') }}</span>
                            </div>
                            <Button
                                v-if="bulkMode && table.getFilteredSelectedRowModel().rows.length > 0"
                                variant="destructive" size="sm" class="h-8 gap-2 shrink-0"
                                @click="confirmBulkDelete(table.getFilteredSelectedRowModel().rows.map((r) => r.original.id))"
                            >
                                <Trash2 class="h-3.5 w-3.5" />
                                <span>{{ $t('common.delete') }}</span>
                                <Badge class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                                    {{ table.getFilteredSelectedRowModel().rows.length }}
                                </Badge>
                            </Button>
                        </div>
                        <DataTableViewOptions :table="table" class="shrink-0" />
                    </div>
                </template>

                <template #filters>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        :model-value="activeFilter"
                        @update:model-value="activeFilter = ($event as MemberFilter) || undefined"
                    >
                        <ToggleGroupItem value="student" class="gap-1.5 h-8 px-2 sm:px-3 text-xs">
                            <GraduationCap class="h-3.5 w-3.5 shrink-0" />
                            <span class="hidden sm:inline">{{ $t('members.filters.students') }}</span>
                            <Badge variant="secondary" class="h-4 min-w-4 rounded-full px-1 font-mono text-[10px] tabular-nums">
                                {{ filterCounts.student }}
                            </Badge>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="teacher" class="gap-1.5 h-8 px-2 sm:px-3 text-xs">
                            <BookOpen class="h-3.5 w-3.5 shrink-0" />
                            <span class="hidden sm:inline">{{ $t('members.filters.teachers') }}</span>
                            <Badge variant="secondary" class="h-4 min-w-4 rounded-full px-1 font-mono text-[10px] tabular-nums">
                                {{ filterCounts.teacher }}
                            </Badge>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="assistant" class="gap-1.5 h-8 px-2 sm:px-3 text-xs">
                            <UserCheck class="h-3.5 w-3.5 shrink-0" />
                            <span class="hidden sm:inline">{{ $t('members.filters.assistants') }}</span>
                            <Badge variant="secondary" class="h-4 min-w-4 rounded-full px-1 font-mono text-[10px] tabular-nums">
                                {{ filterCounts.assistant }}
                            </Badge>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="deleted" class="gap-1.5 h-8 px-2 sm:px-3 text-xs">
                            <Trash2 class="h-3.5 w-3.5 shrink-0" />
                            <span class="hidden sm:inline">{{ $t('members.filters.deleted') }}</span>
                            <Badge variant="destructive" class="h-4 min-w-4 rounded-full px-1 font-mono text-[10px] tabular-nums opacity-80">
                                {{ filterCounts.deleted }}
                            </Badge>
                        </ToggleGroupItem>
                    </ToggleGroup>
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
