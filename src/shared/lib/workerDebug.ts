const STORAGE_KEY = 'edutrace:workerDebug'
const callbacks: Array<(flag: boolean) => void> = []

export function getWorkerDebugFlag(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setWorkerDebugFlag(flag: boolean): void {
    localStorage.setItem(STORAGE_KEY, String(flag))
    for (const cb of callbacks) cb(flag)
}

export function onWorkerDebugChange(cb: (flag: boolean) => void): () => void {
    callbacks.push(cb)
    return () => {
        const idx = callbacks.indexOf(cb)
        if (idx !== -1)
            callbacks.splice(idx, 1)
    }
}
