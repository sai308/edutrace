import { onMounted, onUnmounted, ref } from 'vue'

// BeforeInstallPromptEvent is not yet in the standard TypeScript DOM lib
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstallable = ref(false)

export function usePwaInstall() {
    function onBeforeInstallPrompt(e: Event) {
        e.preventDefault()
        deferredPrompt.value = e as BeforeInstallPromptEvent
        isInstallable.value = true
    }

    function onAppInstalled() {
        deferredPrompt.value = null
        isInstallable.value = false
    }

    onMounted(() => {
        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        window.addEventListener('appinstalled', onAppInstalled)
    })

    onUnmounted(() => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        window.removeEventListener('appinstalled', onAppInstalled)
    })

    async function install() {
        if (!deferredPrompt.value) return
        await deferredPrompt.value.prompt()
        const { outcome } = await deferredPrompt.value.userChoice
        if (outcome === 'accepted') {
            deferredPrompt.value = null
            isInstallable.value = false
        }
    }

    return { isInstallable, install }
}
