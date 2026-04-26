import type { Ref } from 'vue'
import { onMounted, onUnmounted, toRef, watch } from 'vue'

interface ModalInstance {
    id: symbol
    closeCallback: () => void
}

// Global modal stack to track open modals in order
const modalStack: ModalInstance[] = []
let escListenerAttached = false

// Global ESC key handler - only closes the topmost modal
function handleGlobalEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && modalStack.length > 0) {
        // Get the topmost modal and call its close callback
        const topModal = modalStack[modalStack.length - 1]
        if (topModal) topModal.closeCallback()
    }
}

export function useModalClose(
    isOpenOrCallback: Ref<boolean> | (() => void),
    closeCallback?: () => void,
): void {
    // Support both old and new API
    // Old: useModalClose(callback)
    // New: useModalClose(isOpenRef, callback)
    let isOpenRef: Ref<boolean> | null
    let callback: () => void

    if (typeof isOpenOrCallback === 'function') {
        // Old API: always register (for backwards compatibility)
        callback = isOpenOrCallback
        isOpenRef = null
    } else {
        // New API: register only when isOpen is true
        isOpenRef = toRef(isOpenOrCallback) as Ref<boolean>
        callback = closeCallback as () => void
    }

    // Unique identifier for this modal instance
    const modalId = Symbol('modal-id')

    function registerModal(): void {
        // Add this modal to the stack if not already there
        if (!modalStack.some((m) => m.id === modalId)) {
            modalStack.push({ id: modalId, closeCallback: callback })

            // Attach global listener if not already attached
            if (!escListenerAttached) {
                window.addEventListener('keydown', handleGlobalEscape)
                escListenerAttached = true
            }
        }
    }

    function unregisterModal(): void {
        // Remove this modal from the stack
        const index = modalStack.findIndex((m) => m.id === modalId)
        if (index !== -1) {
            modalStack.splice(index, 1)
        }

        // Remove global listener if no modals are open
        if (modalStack.length === 0 && escListenerAttached) {
            window.removeEventListener('keydown', handleGlobalEscape)
            escListenerAttached = false
        }
    }

    if (isOpenRef) {
        // New API: watch isOpen and register/unregister accordingly
        watch(
            isOpenRef,
            (isOpen: boolean) => {
                if (isOpen) {
                    registerModal()
                } else {
                    unregisterModal()
                }
            },
            { immediate: true },
        )

        // Cleanup on unmount
        onUnmounted(() => unregisterModal())
    } else {
        // Old API: register immediately (backwards compatibility)
        onMounted(() => {
            registerModal()
        })
        // Return cleanup function
        onUnmounted(() => unregisterModal())
    }
}
