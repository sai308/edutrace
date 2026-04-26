<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import type { ImportMode } from '../composables/useMarksFileQueue'
import GroupModal from '@Groups/components/GroupModal.vue'
import { CheckCircle2, Clock, Loader2, MinusCircle, XCircle } from 'lucide-vue-next'
import { computed, ref } from 'vue'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DropZone from '@/shared/components/DropZone.vue'
import { toast } from '@/shared/services/toast'
import { useMarksFileQueue } from '../composables/useMarksFileQueue'
import { marksService } from '../services/marks.service'

const props = defineProps<{
    open: boolean
    groups: Group[]
    allMeetIds: string[]
    allTeachers: string[]
    processFileFn: (payload: { file: File; groupName: string }) => Promise<void>
    createGroupFn: (data: Partial<Group>) => Promise<Group>
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'queue-complete'): void
}>()

const { t } = useI18n()
const groupsRef = computed(() => props.groups)

const pickSelectedGroup = ref<string>('')
const pickSaveMapping = ref(false)

const {
    importMode,
    fileQueue,
    processedItems,
    isQueueProcessing,
    pendingGroup,
    showGroupConfirmDialog,
    showGroupModal,
    showGroupPickDialog,
    suggestedMeetIds,
    groupModalError,
    handleFilesDropped,
    handleConfirmSkip,
    handleConfirmCreate,
    handleConfirmMapToGroup,
    handlePickGroup,
    handlePickGroupClose,
    handleCreateGroup,
    handleSkipGroup,
    handleGroupModalClose,
} = useMarksFileQueue(groupsRef, {
    onProcessFile: props.processFileFn,
    onCreateGroup: props.createGroupFn,
    onSuggestMeetIds: (file) => marksService.suggestMeetIdsForFile(file),
    onQueueComplete: ({ done, modeSkipped }) => {
        if (modeSkipped > 0 && done === 0) {
            toast.info(t('marks.importModal.allSkippedByMode', { count: modeSkipped }))
        }
        emit('queue-complete')
        emit('update:open', false)
    },
})

const pendingGroupForModal = computed(() => pendingGroup.value as Group | null)

function setMode(mode: ImportMode) {
    importMode.value = mode
}

function handleClose() {
    emit('update:open', false)
}

function openPickDialog() {
    pickSelectedGroup.value = ''
    pickSaveMapping.value = false
    handleConfirmMapToGroup()
}

function confirmPick() {
    if (pickSelectedGroup.value) {
        handlePickGroup(pickSelectedGroup.value, pickSaveMapping.value)
    }
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{{ $t('marks.importModal.title') }}</DialogTitle>
                <DialogDescription>{{ $t('marks.importModal.description') }}</DialogDescription>
            </DialogHeader>

            <!-- Mode selector -->
            <div class="space-y-2">
                <p class="text-sm font-medium">
                    {{ $t('marks.importModal.modeLabel') }}
                </p>
                <div class="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        class="cursor-pointer text-left rounded-lg border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        :class="
                            importMode === 'known-only'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/40'
                        "
                        @click="setMode('known-only')"
                    >
                        <p class="text-sm font-medium">
                            {{ $t('marks.importModal.modeKnownOnly') }}
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {{ $t('marks.importModal.modeKnownOnlyDesc') }}
                        </p>
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer text-left rounded-lg border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        :class="
                            importMode === 'create-on-fly'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/40'
                        "
                        @click="setMode('create-on-fly')"
                    >
                        <p class="text-sm font-medium">
                            {{ $t('marks.importModal.modeCreateOnFly') }}
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {{ $t('marks.importModal.modeCreateOnFlyDesc') }}
                        </p>
                    </button>
                </div>
            </div>

            <!-- Drop zone (always shown) -->
            <DropZone
                :is-processing="isQueueProcessing"
                :prompt="$t('dropZone.marksPrompt')"
                @files-dropped="handleFilesDropped"
            />

            <!-- File queue: processed history + pending -->
            <div v-if="processedItems.length > 0 || fileQueue.length > 0" class="space-y-1 max-h-56 overflow-y-auto">
                <!-- Processed items (history, in order of completion) -->
                <div
                    v-for="(item, index) in processedItems"
                    :key="`done-${index}`"
                    class="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md"
                    :class="{
                        'bg-primary/5': item.status === 'processing',
                        'bg-green-500/5': item.status === 'done',
                        'bg-destructive/5': item.status === 'error',
                        'bg-muted/20': item.status === 'skipped',
                    }"
                >
                    <Loader2 v-if="item.status === 'processing'" class="w-4 h-4 animate-spin text-primary shrink-0" />
                    <CheckCircle2 v-else-if="item.status === 'done'" class="w-4 h-4 text-green-500 shrink-0" />
                    <XCircle v-else-if="item.status === 'error'" class="w-4 h-4 text-destructive shrink-0" />
                    <MinusCircle v-else class="w-4 h-4 text-muted-foreground shrink-0" />

                    <span class="flex-1 truncate font-mono text-xs">{{ item.file.name }}</span>
                    <span class="text-xs text-muted-foreground shrink-0">
                        {{ $t(`marks.importModal.fileStatus.${item.status}`) }}
                    </span>
                </div>

                <!-- Separator shown only when both sections have items -->
                <div v-if="processedItems.length > 0 && fileQueue.length > 0" class="flex items-center gap-2 py-0.5">
                    <div class="flex-1 border-t border-dashed border-border" />
                    <span class="text-xs text-muted-foreground shrink-0 select-none">{{
                        $t('marks.importModal.pendingLabel')
                    }}</span>
                    <div class="flex-1 border-t border-dashed border-border" />
                </div>

                <!-- Pending items (not yet processed) -->
                <div
                    v-for="(item, index) in fileQueue"
                    :key="`pending-${index}`"
                    class="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md bg-muted/30"
                >
                    <Clock class="w-4 h-4 text-muted-foreground shrink-0" />
                    <span class="flex-1 truncate font-mono text-xs">{{ item.file.name }}</span>
                    <span class="text-xs text-muted-foreground shrink-0">
                        {{ $t('marks.importModal.fileStatus.pending') }}
                    </span>
                </div>
            </div>

            <!-- Footer hint + close button -->
            <div
                v-if="processedItems.length > 0 || fileQueue.length > 0"
                class="flex items-center justify-between pt-1"
            >
                <p class="text-xs text-muted-foreground">
                    <span v-if="isQueueProcessing">{{ $t('marks.importModal.processingHint') }}</span>
                    <span v-else>{{ $t('marks.importModal.doneHint') }}</span>
                </p>
                <Button variant="outline" size="sm" :disabled="isQueueProcessing" @click="handleClose">
                    {{ $t('marks.importModal.close') }}
                </Button>
            </div>
        </DialogContent>
    </Dialog>

    <!--
        Confirm dialog and GroupModal are intentionally outside the outer Dialog.
        Placing them inside DialogContent creates nested Reka UI focus traps that
        cause blinking and unexpected closes. As siblings they teleport independently.
    -->
    <AlertDialog :open="showGroupConfirmDialog" @update:open="showGroupConfirmDialog = $event">
        <AlertDialogContent class="sm:max-w-sm">
            <AlertDialogHeader>
                <AlertDialogTitle>
                    {{ $t('marks.importModal.confirmCreateTitle', { name: pendingGroup?.name }) }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {{ $t('marks.importModal.confirmCreateDescription') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter class="flex-col gap-2 sm:flex-col sm:gap-2">
                <AlertDialogAction @click="handleConfirmCreate">
                    {{ $t('marks.importModal.confirmCreate') }}
                </AlertDialogAction>
                <AlertDialogAction
                    class="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    @click="openPickDialog"
                >
                    {{ $t('marks.importModal.confirmMapToGroup') }}
                </AlertDialogAction>
                <AlertDialogCancel @click="handleConfirmSkip">
                    {{ $t('marks.importModal.confirmSkip') }}
                </AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <!-- Group pick dialog: map unknown prefix to existing group -->
    <Dialog
        :open="showGroupPickDialog"
        @update:open="
            (v) => {
                if (!v) handlePickGroupClose()
            }
        "
    >
        <DialogContent class="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>
                    {{ $t('marks.importModal.pickGroupTitle', { name: pendingGroup?.name }) }}
                </DialogTitle>
                <DialogDescription>
                    {{ $t('marks.importModal.pickGroupDescription') }}
                </DialogDescription>
            </DialogHeader>
            <div class="space-y-4 py-2">
                <Select v-model="pickSelectedGroup">
                    <SelectTrigger class="w-full">
                        <SelectValue :placeholder="$t('marks.importModal.pickGroupPlaceholder')" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="g in groups" :key="g.name" :value="g.name">
                            {{ g.name }}
                        </SelectItem>
                    </SelectContent>
                </Select>
                <div class="flex items-center gap-2">
                    <Checkbox id="pick-save" v-model:checked="pickSaveMapping" />
                    <Label for="pick-save" class="text-sm text-muted-foreground cursor-pointer">
                        {{ $t('marks.importModal.pickGroupSave', { prefix: pendingGroup?.name }) }}
                    </Label>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" @click="handlePickGroupClose">
                    {{ $t('marks.importModal.confirmSkip') }}
                </Button>
                <Button :disabled="!pickSelectedGroup" @click="confirmPick">
                    {{ $t('marks.importModal.pickGroupConfirm') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <GroupModal
        :open="showGroupModal"
        :group="pendingGroupForModal"
        :all-meet-ids="allMeetIds"
        :all-teachers="allTeachers"
        :suggested-meet-ids="suggestedMeetIds"
        :error="groupModalError"
        :show-skip="true"
        @update:open="
            (v) => {
                if (!v) handleGroupModalClose()
            }
        "
        @save="handleCreateGroup"
        @skip="handleSkipGroup"
    />
</template>
