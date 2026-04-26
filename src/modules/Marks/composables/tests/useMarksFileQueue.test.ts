import type { Group } from '@Groups/types/groups'
import type { Mock } from 'vitest'
import type { Ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useMarksFileQueue } from '../useMarksFileQueue'

function makeFile(name: string): File {
    return { name } as File
}

function makeGroup(name: string, id = '1'): Group {
    return { id, name, meetId: '', teacher: '', course: 1 } as Group
}

describe('useMarksFileQueue', () => {
    let onProcessFile: Mock<(payload: { file: File; groupName: string }) => Promise<void>>
    let onCreateGroup: Mock<(groupData: Partial<Group>) => Promise<Group>>
    let onQueueComplete: Mock<() => void>
    let groups: Ref<Group[]>

    beforeEach(() => {
        onProcessFile = vi.fn().mockResolvedValue(undefined)
        onCreateGroup = vi.fn().mockResolvedValue(makeGroup('NewGroup'))
        onQueueComplete = vi.fn()
        groups = ref<Group[]>([makeGroup('KN-31'), makeGroup('CS101', '2')])
    })

    function makeQueue() {
        return useMarksFileQueue(groups, { onProcessFile, onCreateGroup, onQueueComplete })
    }

    // ─── handleFilesDropped ──────────────────────────────────────────────

    describe('handleFilesDropped', () => {
        it('ignores non-CSV files', async () => {
            const q = makeQueue()
            q.handleFilesDropped([makeFile('report.pdf'), makeFile('data.xlsx')])
            await nextTick()
            expect(onProcessFile).not.toHaveBeenCalled()
            expect(onQueueComplete).toHaveBeenCalled()
        })

        it('ignores CSV files without a group prefix (no underscore)', async () => {
            const q = makeQueue()
            q.handleFilesDropped([makeFile('marks.csv')])
            await nextTick()
            expect(onProcessFile).not.toHaveBeenCalled()
            expect(onQueueComplete).toHaveBeenCalled()
        })

        it('calls onProcessFile for a file whose prefix matches a known group exactly', async () => {
            const q = makeQueue()
            q.handleFilesDropped([makeFile('KN-31_marks_2024.csv')])
            await nextTick()
            expect(onProcessFile).toHaveBeenCalledWith({
                file: expect.objectContaining({ name: 'KN-31_marks_2024.csv' }),
                groupName: 'KN-31',
            })
        })

        it('calls onProcessFile using dash-normalized group match', async () => {
            // 'KN31' normalizes to 'KN31', same as 'KN-31'.replace(/-/g,'')
            const q = makeQueue()
            q.handleFilesDropped([makeFile('KN31_marks.csv')])
            await nextTick()
            expect(onProcessFile).toHaveBeenCalledWith(expect.objectContaining({ groupName: 'KN-31' }))
        })

        it('calls onQueueComplete after processing all known-group files', async () => {
            const q = makeQueue()
            q.handleFilesDropped([makeFile('KN-31_a.csv'), makeFile('CS101_b.csv')])
            await vi.waitFor(() => expect(onQueueComplete).toHaveBeenCalled())
            expect(onProcessFile).toHaveBeenCalledTimes(2)
        })

        it('resets skippedPrefixes when new batch is dropped', async () => {
            const q = makeQueue()
            // First batch: skip 'ZZ' prefix via the confirm dialog
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('ZZ_a.csv')])
            await nextTick()
            // showGroupConfirmDialog should be open for ZZ
            expect(q.showGroupConfirmDialog.value).toBe(true)
            q.handleConfirmSkip()
            await nextTick()

            // Now drop a new batch — skippedPrefixes should be reset
            q.handleFilesDropped([makeFile('ZZ_b.csv')])
            await nextTick()
            // ZZ is no longer in skipped, so confirm dialog should show again
            expect(q.showGroupConfirmDialog.value).toBe(true)
        })
    })

    // ─── known-only mode ────────────────────────────────────────────────

    describe("importMode = 'known-only'", () => {
        it('silently skips files with unknown group prefix without showing GroupModal', async () => {
            const q = makeQueue()
            q.importMode.value = 'known-only'
            q.handleFilesDropped([makeFile('UNKNOWN_marks.csv')])
            await nextTick()
            expect(q.showGroupModal.value).toBe(false)
            expect(onProcessFile).not.toHaveBeenCalled()
            expect(onQueueComplete).toHaveBeenCalled()
        })

        it('processes known files and skips unknown ones in same batch', async () => {
            const q = makeQueue()
            q.importMode.value = 'known-only'
            q.handleFilesDropped([makeFile('KN-31_a.csv'), makeFile('GHOST_b.csv'), makeFile('CS101_c.csv')])
            await nextTick()
            expect(onProcessFile).toHaveBeenCalledTimes(2)
            expect(q.showGroupModal.value).toBe(false)
        })
    })

    // ─── create-on-fly mode ─────────────────────────────────────────────

    describe("importMode = 'create-on-fly'", () => {
        it('shows confirm dialog then GroupModal for unknown group prefix', async () => {
            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_marks.csv')])
            await nextTick()
            expect(q.showGroupConfirmDialog.value).toBe(true)
            expect(q.pendingGroup.value).toEqual(expect.objectContaining({ name: 'NEWGRP' }))
            await q.handleConfirmCreate()
            expect(q.showGroupModal.value).toBe(true)
            expect(q.showGroupConfirmDialog.value).toBe(false)
        })

        it('pauses queue while confirm dialog is open (does not process next file)', async () => {
            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv'), makeFile('KN-31_b.csv')])
            await nextTick()
            // Confirm dialog open — KN-31 should not have been processed yet
            expect(q.showGroupConfirmDialog.value).toBe(true)
            expect(onProcessFile).not.toHaveBeenCalled()
        })
    })

    // ─── handleCreateGroup ───────────────────────────────────────────────

    describe('handleCreateGroup', () => {
        it('calls onCreateGroup then processes the pending file', async () => {
            const newGroup = makeGroup('NEWGRP', 'ng1')
            onCreateGroup.mockResolvedValue(newGroup)

            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv')])
            await nextTick()
            expect(q.showGroupConfirmDialog.value).toBe(true)
            await q.handleConfirmCreate()
            expect(q.showGroupModal.value).toBe(true)

            await q.handleCreateGroup({ name: 'NEWGRP', meetId: 'abc-defg-hij' })

            expect(onCreateGroup).toHaveBeenCalledWith(expect.objectContaining({ name: 'NEWGRP' }))
            expect(onProcessFile).toHaveBeenCalledWith({
                file: expect.objectContaining({ name: 'NEWGRP_a.csv' }),
                groupName: 'NEWGRP',
            })
            expect(q.showGroupModal.value).toBe(false)
        })

        it('continues to next file after creating group and processing pending file', async () => {
            const newGroup = makeGroup('NEWGRP', 'ng1')
            onCreateGroup.mockResolvedValue(newGroup)

            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv'), makeFile('KN-31_b.csv')])
            await nextTick()

            await q.handleCreateGroup({ name: 'NEWGRP', meetId: 'abc-defg-hij' })

            expect(onProcessFile).toHaveBeenCalledTimes(2)
            expect(onQueueComplete).toHaveBeenCalled()
        })

        it('sets groupModalError = "duplicate" on ConstraintError, keeps modal open', async () => {
            const err = Object.assign(new Error('Duplicate'), { name: 'ConstraintError' })
            onCreateGroup.mockRejectedValue(err)

            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv')])
            await nextTick()
            await q.handleConfirmCreate()

            await q.handleCreateGroup({ name: 'NEWGRP', meetId: '' })

            expect(q.groupModalError.value).toBe('duplicate')
            expect(q.showGroupModal.value).toBe(true) // modal stays open for retry
            expect(onProcessFile).not.toHaveBeenCalled()
        })

        it('sets groupModalError = "error" on generic error, keeps modal open', async () => {
            onCreateGroup.mockRejectedValue(new Error('DB error'))

            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv')])
            await nextTick()
            await q.handleConfirmCreate()

            await q.handleCreateGroup({ name: 'NEWGRP', meetId: '' })

            expect(q.groupModalError.value).toBe('error')
            expect(q.showGroupModal.value).toBe(true)
        })

        it('allows retry after error (user corrects and submits again)', async () => {
            const err = Object.assign(new Error('Duplicate'), { name: 'ConstraintError' })
            onCreateGroup.mockRejectedValueOnce(err).mockResolvedValueOnce(makeGroup('NEWGRP', 'ng1'))

            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv')])
            await nextTick()

            // First attempt: fails
            await q.handleCreateGroup({ name: 'NEWGRP', meetId: '' })
            expect(q.groupModalError.value).toBe('duplicate')

            // Second attempt: succeeds
            await q.handleCreateGroup({ name: 'NEWGRP', meetId: 'abc-defg-hij' })
            expect(q.groupModalError.value).toBeNull()
            expect(q.showGroupModal.value).toBe(false)
            expect(onProcessFile).toHaveBeenCalled()
        })

        it('continues queue after processFile throws (does not abort queue)', async () => {
            const newGroup = makeGroup('NEWGRP', 'ng1')
            onCreateGroup.mockResolvedValue(newGroup)
            onProcessFile.mockRejectedValueOnce(new Error('CSV parse error')).mockResolvedValueOnce(undefined)

            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('NEWGRP_a.csv'), makeFile('KN-31_b.csv')])
            await nextTick()

            await q.handleCreateGroup({ name: 'NEWGRP', meetId: 'abc-defg-hij' })

            // KN-31 file should still have been processed
            expect(onProcessFile).toHaveBeenCalledTimes(2)
            expect(onQueueComplete).toHaveBeenCalled()
        })
    })

    // ─── handleSkipGroup ─────────────────────────────────────────────────

    describe('handleSkipGroup', () => {
        it('skips the current pending file and closes the modal', async () => {
            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('UNKNOWN_a.csv')])
            await nextTick()
            await q.handleConfirmCreate()
            expect(q.showGroupModal.value).toBe(true)

            q.handleSkipGroup()
            await nextTick()

            expect(q.showGroupModal.value).toBe(false)
            expect(onProcessFile).not.toHaveBeenCalled()
            expect(onQueueComplete).toHaveBeenCalled()
        })

        it('skips ALL subsequent files with the same group prefix', async () => {
            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('GHOST_a.csv'), makeFile('GHOST_b.csv'), makeFile('GHOST_c.csv')])
            await nextTick()
            await q.handleConfirmCreate()
            expect(q.showGroupModal.value).toBe(true)

            // Skip GHOST prefix
            q.handleSkipGroup()
            await nextTick()

            // All three GHOST files skipped, modal never shows again
            expect(q.showGroupModal.value).toBe(false)
            expect(onProcessFile).not.toHaveBeenCalled()
        })

        it('skips only the target prefix — other groups still processed', async () => {
            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('GHOST_a.csv'), makeFile('GHOST_b.csv'), makeFile('KN-31_c.csv')])
            await nextTick()
            // Modal open for GHOST
            q.handleSkipGroup()
            await nextTick()

            expect(onProcessFile).toHaveBeenCalledTimes(1)
            expect(onProcessFile).toHaveBeenCalledWith(expect.objectContaining({ groupName: 'KN-31' }))
        })
    })

    // ─── handleGroupModalClose ───────────────────────────────────────────

    describe('handleGroupModalClose', () => {
        it('skips current file and continues when user closes the modal', async () => {
            const q = makeQueue()
            q.importMode.value = 'create-on-fly'
            q.handleFilesDropped([makeFile('UNKNOWN_a.csv'), makeFile('KN-31_b.csv')])
            await nextTick()

            q.handleGroupModalClose()
            await nextTick()

            expect(q.showGroupModal.value).toBe(false)
            expect(onProcessFile).toHaveBeenCalledWith(expect.objectContaining({ groupName: 'KN-31' }))
        })
    })

    // ─── onQueueComplete ─────────────────────────────────────────────────

    describe('onQueueComplete', () => {
        it('is called exactly once after the queue drains', async () => {
            const q = makeQueue()
            q.handleFilesDropped([makeFile('KN-31_a.csv'), makeFile('CS101_b.csv')])
            await vi.waitFor(() => expect(onQueueComplete).toHaveBeenCalledTimes(1))
        })

        it('is called even when all files are skipped', async () => {
            const q = makeQueue()
            q.importMode.value = 'known-only'
            q.handleFilesDropped([makeFile('NOGROUP_x.csv')])
            await nextTick()
            expect(onQueueComplete).toHaveBeenCalledTimes(1)
        })
    })
})
