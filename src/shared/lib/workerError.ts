export type WorkerErrorCode = 'PARSE_ERROR' | 'WORKER_TIMEOUT' | 'SERIALIZATION_ERROR' | 'UNKNOWN'

export class WorkerError extends Error {
    readonly code: WorkerErrorCode

    constructor(code: WorkerErrorCode, message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = 'WorkerError'
        this.code = code
    }
}

/** Rejects with WorkerError('WORKER_TIMEOUT') if the promise does not settle within ms. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new WorkerError('WORKER_TIMEOUT', `Worker timed out after ${ms}ms`)), ms)
        promise.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            (error) => {
                clearTimeout(timer)
                reject(error)
            },
        )
    })
}

/** Maps an unknown thrown value to a typed WorkerError. */
export function classifyWorkerError(e: unknown): WorkerError {
    if (e instanceof WorkerError)
        return e

    if (e instanceof Error) {
        // postMessage/structuredClone serialization failure
        if (e.name === 'DataCloneError' || e.message.includes('could not be cloned')) {
            return new WorkerError('SERIALIZATION_ERROR', e.message, { cause: e })
        }
        // Validation errors thrown by parser.worker.js all begin with "Invalid"
        if (e.message.startsWith('Invalid')) {
            return new WorkerError('PARSE_ERROR', e.message, { cause: e })
        }
    }

    return new WorkerError('UNKNOWN', e instanceof Error ? e.message : String(e), { cause: e })
}
