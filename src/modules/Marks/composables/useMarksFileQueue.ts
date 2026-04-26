import type { Group } from '@Groups/types/groups'
import type { Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { ref } from 'vue'

export type ImportMode = 'known-only' | 'create-on-fly'

export interface FileQueueItem {
    file: File
    status: 'pending' | 'processing' | 'done' | 'error' | 'skipped'
    error?: string
}

export interface FileQueueCallbacks {
    onProcessFile: (payload: { file: File, groupName: string }) => Promise<void>
    onCreateGroup: (groupData: Partial<Group>) => Promise<Group>
    onQueueComplete?: (stats: { done: number, modeSkipped: number }) => void
    onSuggestMeetIds?: (file: File) => Promise<string[]>
}

/** Persisted prefix→groupName mappings set manually by user */
export type PrefixMappings = Record<string, string>

/**
 * Manages the sequential file import queue for marks CSV uploads.
 *
 * Handles:
 * - Import mode: 'known-only' (skip unknown groups) or 'create-on-fly' (prompt to create)
 * - Parsing the group prefix from the filename (`{prefix}_*.csv`)
 * - Matching the prefix to an existing group (with dash-normalization fallback)
 * - Prompting the user to create an unknown group before continuing
 * - Per-file error tracking without aborting the whole queue
 * - Group creation retry (on ConstraintError) and skip (with prefix-level suppression)
 */
export function useMarksFileQueue(groups: Ref<Group[]>, callbacks: FileQueueCallbacks) {
    const importMode = useStorage<ImportMode>('edutrace-marks-import-mode', 'known-only')
    const savedPrefixMappings = useStorage<PrefixMappings>('edutrace-marks-prefix-mappings', {})
    const fileQueue = ref<FileQueueItem[]>([])
    const isQueueProcessing = ref(false)
    const pendingGroup = ref<Partial<Group> | null>(null)
    const pendingFile = ref<File | null>(null)
    const showGroupModal = ref(false)
    const showGroupConfirmDialog = ref(false)
    const showGroupPickDialog = ref(false)
    const suggestedMeetIds = ref<string[]>([])
    const groupModalError = ref<string | null>(null)
    // Track group prefixes explicitly skipped by the user so subsequent files
    // with the same prefix are automatically skipped without prompting.
    const skippedPrefixes = ref<string[]>([])
    // Completed/skipped/errored items — kept for display after they leave fileQueue
    const processedItems = ref<FileQueueItem[]>([])
    // Counters for the current batch — reported to onQueueComplete
    const batchDone = ref(0)
    const batchModeSkipped = ref(0)

    function _matchGroup(rawPrefix: string): Group | undefined {
        let matched = groups.value.find(g => g.name === rawPrefix)
        if (!matched) {
            const normalized = rawPrefix.replace(/-/g, '')
            matched = groups.value.find(g => g.name.replace(/-/g, '') === normalized)
        }
        return matched
    }

    function _currentItem(): FileQueueItem | undefined {
        return fileQueue.value[0]
    }

    // Move the head of fileQueue into the processed history.
    // Called after the item's status is already set so the history shows the
    // final state. For async items (processing → done/error) we push the same
    // object reference — Vue's reactivity updates the rendered status in place.
    function _archive(item: FileQueueItem): void {
        processedItems.value.push(item)
        fileQueue.value.shift()
    }

    async function processNextInQueue(): Promise<void> {
        if (fileQueue.value.length === 0) {
            isQueueProcessing.value = false
            callbacks.onQueueComplete?.({
                done: batchDone.value,
                modeSkipped: batchModeSkipped.value,
            })
            return
        }

        isQueueProcessing.value = true
        const item = _currentItem()!

        // Non-CSV files
        if (!item.file.name.toLowerCase().endsWith('.csv')) {
            item.status = 'skipped'
            _archive(item)
            return processNextInQueue()
        }

        // Extract group prefix from filename
        const match = item.file.name.match(/^([^_]+)_/)
        const rawPrefix = match ? match[1] : null

        if (!rawPrefix) {
            item.status = 'skipped'
            _archive(item)
            return processNextInQueue()
        }

        // Skip if prefix was explicitly skipped by user
        if (skippedPrefixes.value.includes(rawPrefix)) {
            item.status = 'skipped'
            _archive(item)
            return processNextInQueue()
        }

        const matchedGroup = _matchGroup(rawPrefix)

        if (matchedGroup) {
            // Archive while still 'processing' — the pushed reference will
            // reactively update to 'done' or 'error' after the await.
            item.status = 'processing'
            _archive(item)
            try {
                await callbacks.onProcessFile({ file: item.file, groupName: matchedGroup.name })
                item.status = 'done'
                batchDone.value++
            }
            catch (e: any) {
                item.status = 'error'
                item.error = e?.message ?? 'Processing failed'
                // Keep going — one bad file does not stop the queue
            }
            return processNextInQueue()
        }

        // Check saved prefix→group mappings (bypass mode, applies even in known-only)
        const savedGroupName = savedPrefixMappings.value[rawPrefix]
        if (savedGroupName) {
            const savedGroup = groups.value.find(g => g.name === savedGroupName)
            if (savedGroup) {
                item.status = 'processing'
                _archive(item)
                try {
                    await callbacks.onProcessFile({ file: item.file, groupName: savedGroup.name })
                    item.status = 'done'
                    batchDone.value++
                }
                catch (e: any) {
                    item.status = 'error'
                    item.error = e?.message ?? 'Processing failed'
                }
                return processNextInQueue()
            }
            // Stale mapping (group was deleted) — remove it and fall through to dialog
            const { [rawPrefix]: _removed, ...rest } = savedPrefixMappings.value
            savedPrefixMappings.value = rest
        }

        // Unknown group handling
        if (importMode.value === 'known-only') {
            item.status = 'skipped'
            _archive(item)
            batchModeSkipped.value++
            return processNextInQueue()
        }

        // create-on-fly: pause and show a small confirmation dialog first
        pendingGroup.value = { name: rawPrefix }
        pendingFile.value = item.file
        showGroupConfirmDialog.value = true
        // Queue processing is paused here until handleConfirmCreate or handleConfirmSkip is called
    }

    function handleFilesDropped(files: File[]) {
        if (files.length === 0)
            return
        // Reset per-batch state for each new drop
        skippedPrefixes.value = []
        processedItems.value = []
        batchDone.value = 0
        batchModeSkipped.value = 0
        const items: FileQueueItem[] = Array.from(files).map(f => ({
            file: f,
            status: 'pending' as const,
        }))
        fileQueue.value.push(...items)

        if (!isQueueProcessing.value && !showGroupModal.value && !showGroupConfirmDialog.value) {
            processNextInQueue()
        }
    }

    function handleConfirmSkip() {
        const prefix = pendingGroup.value?.name
        if (prefix)
            skippedPrefixes.value.push(prefix)
        const item = _currentItem()
        if (item) {
            item.status = 'skipped'
            _archive(item)
        }
        pendingFile.value = null
        pendingGroup.value = null
        showGroupConfirmDialog.value = false
        processNextInQueue()
    }

    async function handleConfirmCreate() {
        showGroupConfirmDialog.value = false
        if (callbacks.onSuggestMeetIds && pendingFile.value) {
            try {
                suggestedMeetIds.value = await callbacks.onSuggestMeetIds(pendingFile.value)
            }
            catch {
                suggestedMeetIds.value = []
            }
        }
        else {
            suggestedMeetIds.value = []
        }
        showGroupModal.value = true
    }

    function handleConfirmMapToGroup() {
        showGroupConfirmDialog.value = false
        showGroupPickDialog.value = true
    }

    async function handlePickGroup(groupName: string, save: boolean) {
        showGroupPickDialog.value = false
        if (save && pendingGroup.value?.name) {
            savedPrefixMappings.value = {
                ...savedPrefixMappings.value,
                [pendingGroup.value.name]: groupName,
            }
        }
        const item = _currentItem()
        const fileToProcess = pendingFile.value
        if (item && fileToProcess) {
            item.status = 'processing'
            _archive(item)
            try {
                await callbacks.onProcessFile({ file: fileToProcess, groupName })
                item.status = 'done'
                batchDone.value++
            }
            catch (e: any) {
                item.status = 'error'
                item.error = e?.message ?? 'Processing failed'
            }
        }
        pendingFile.value = null
        pendingGroup.value = null
        processNextInQueue()
    }

    function handlePickGroupClose() {
        // Return to the original confirm dialog so user can still create or skip
        showGroupPickDialog.value = false
        showGroupConfirmDialog.value = true
    }

    async function handleCreateGroup(groupData: Partial<Group>) {
        groupModalError.value = null
        try {
            const newGroup = await callbacks.onCreateGroup(groupData)
            showGroupModal.value = false
            suggestedMeetIds.value = []

            if (pendingFile.value) {
                const fileToProcess = pendingFile.value
                const itemInQueue = _currentItem()
                pendingFile.value = null

                if (itemInQueue) {
                    itemInQueue.status = 'processing'
                    _archive(itemInQueue)
                    try {
                        await callbacks.onProcessFile({
                            file: fileToProcess,
                            groupName: newGroup.name,
                        })
                        itemInQueue.status = 'done'
                        batchDone.value++
                    }
                    catch (e: any) {
                        itemInQueue.status = 'error'
                        itemInQueue.error = e?.message ?? 'Processing failed'
                    }
                }
            }

            pendingGroup.value = null
            processNextInQueue()
        }
        catch (e: any) {
            if (e?.name === 'ConstraintError') {
                groupModalError.value = 'duplicate'
            }
            else {
                groupModalError.value = 'error'
            }
            // Keep the modal open so the user can correct and retry
        }
    }

    function handleSkipGroup() {
        const prefix = pendingGroup.value?.name
        if (prefix) {
            skippedPrefixes.value.push(prefix)
        }
        const item = _currentItem()
        if (item) {
            item.status = 'skipped'
            _archive(item)
        }
        pendingFile.value = null
        pendingGroup.value = null
        showGroupModal.value = false
        groupModalError.value = null
        suggestedMeetIds.value = []
        processNextInQueue()
    }

    function handleGroupModalClose() {
        // Closing the modal without saving = skip this group
        handleSkipGroup()
    }

    return {
        importMode,
        savedPrefixMappings,
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
    }
}
