import type { Group } from '@Groups/types/groups'
import type { SessionReport } from '@Sessions/models/session.model'
import { groupsRepository } from '@Groups/services/groups.repository'
import { SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { sessionRepository } from '@Sessions/services/sessions.repository'
import { sessionsService } from '@Sessions/services/sessions.service'
import { computed, ref, watch } from 'vue'
import { logger } from '@/shared/lib/logger'

/**
 * Manages all state and side effects for the SessionsPage stepper.
 *
 * Encapsulates: group loading, session loading + auto-sync per group,
 * session creation handlers, and stepper navigation logic.
 */
export function useSessionsPage() {
    const groups = ref<Group[]>([])
    const selectedGroupId = ref<string>('')
    const isInitializing = ref(false)
    const isSyncing = ref(false)

    const mainSession = ref<SessionReport | null>(null)
    const firstRetakeSession = ref<SessionReport | null>(null)
    const secondRetakeSession = ref<SessionReport | null>(null)
    const activeTab = ref<string>(SessionTypeEnum.MAIN)

    const currentGroup = computed(
        () => groups.value.find((g) => g.id!.toString() === selectedGroupId.value) ?? undefined,
    )

    /**
     * Linear mode is disabled only once both Main and First Retake are closed,
     * allowing free navigation across all three steps.
     */
    const isStepperLinear = computed(() => {
        const mainClosed = mainSession.value?.status === SessionStatusEnum.CLOSED
        const firstRetakeClosed = firstRetakeSession.value?.status === SessionStatusEnum.CLOSED
        return !(mainClosed && firstRetakeClosed)
    })

    async function loadSessions() {
        if (!selectedGroupId.value) return

        const allSessions = await sessionRepository.getByGroupId(selectedGroupId.value)

        let main = allSessions.find((s) => s.sessionType === SessionTypeEnum.MAIN) ?? null
        if (main && main.status === SessionStatusEnum.OPEN && currentGroup.value) {
            try {
                main = await sessionsService.syncMainSession(currentGroup.value, main.id)
            } catch (e) {
                logger.error('Failed to sync main session', e)
            }
        }
        mainSession.value = main

        let firstRetake =
            allSessions.find((s) => s.sessionType === SessionTypeEnum.FIRST_RETAKE) ?? null
        if (firstRetake && firstRetake.status === SessionStatusEnum.OPEN && currentGroup.value) {
            try {
                firstRetake = await sessionsService.syncRetakeSession(
                    currentGroup.value,
                    firstRetake.id,
                )
            } catch (e) {
                logger.error('Failed to sync first retake session', e)
            }
        }
        firstRetakeSession.value = firstRetake

        let secondRetake =
            allSessions.find((s) => s.sessionType === SessionTypeEnum.SECOND_RETAKE) ?? null
        if (secondRetake && secondRetake.status === SessionStatusEnum.OPEN && currentGroup.value) {
            try {
                secondRetake = await sessionsService.syncRetakeSession(
                    currentGroup.value,
                    secondRetake.id,
                )
            } catch (e) {
                logger.error('Failed to sync second retake session', e)
            }
        }
        secondRetakeSession.value = secondRetake

        // Default active tab to the furthest available session
        if (secondRetakeSession.value) activeTab.value = SessionTypeEnum.SECOND_RETAKE
        else if (firstRetakeSession.value) activeTab.value = SessionTypeEnum.FIRST_RETAKE
        else activeTab.value = SessionTypeEnum.MAIN
    }

    async function handleCreateMainSession() {
        if (!currentGroup.value) return
        try {
            isInitializing.value = true
            mainSession.value = await sessionsService.initializeMainSession(currentGroup.value)
        } catch (e) {
            logger.error('Failed to create main session', e)
        } finally {
            isInitializing.value = false
        }
    }

    async function handleCreateFirstRetake() {
        if (!currentGroup.value || !mainSession.value) return
        try {
            isInitializing.value = true
            firstRetakeSession.value = await sessionsService.initializeRetakeSession(
                currentGroup.value,
                mainSession.value.id,
                SessionTypeEnum.FIRST_RETAKE,
            )
            activeTab.value = SessionTypeEnum.FIRST_RETAKE
        } catch (e) {
            logger.error('Failed to create First Retake', e)
        } finally {
            isInitializing.value = false
        }
    }

    async function handleCreateSecondRetake() {
        if (!currentGroup.value || !firstRetakeSession.value) return
        try {
            isInitializing.value = true
            secondRetakeSession.value = await sessionsService.initializeRetakeSession(
                currentGroup.value,
                firstRetakeSession.value.id,
                SessionTypeEnum.SECOND_RETAKE,
            )
            activeTab.value = SessionTypeEnum.SECOND_RETAKE
        } catch (e) {
            logger.error('Failed to create Second Retake', e)
        } finally {
            isInitializing.value = false
        }
    }

    async function handleSessionClosed() {
        await loadSessions()
    }

    async function handleSyncSession() {
        try {
            isSyncing.value = true
            await loadSessions()
        } finally {
            isSyncing.value = false
        }
    }

    /**
     * Loads all groups and pre-selects the first one. Call this from onMounted.
     */
    async function initialize() {
        groups.value = await groupsRepository.getAll()
        if (groups.value.length > 0) {
            selectedGroupId.value = groups.value[0]!.id!.toString()
            await loadSessions()
        }
    }

    watch(selectedGroupId, () => loadSessions())

    return {
        groups,
        selectedGroupId,
        isInitializing,
        isSyncing,
        mainSession,
        firstRetakeSession,
        secondRetakeSession,
        activeTab,
        currentGroup,
        isStepperLinear,
        loadSessions,
        handleCreateMainSession,
        handleCreateFirstRetake,
        handleCreateSecondRetake,
        handleSessionClosed,
        handleSyncSession,
        initialize,
    }
}
