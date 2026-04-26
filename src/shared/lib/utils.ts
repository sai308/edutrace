import type { Updater } from '@tanstack/vue-table'
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function valueUpdater<T>(updaterOrValue: Updater<T>, ref: { value: T | null | undefined }) {
    if (typeof updaterOrValue === 'function')
        ref.value = (updaterOrValue as (old: T | null | undefined) => T)(ref.value)
    else ref.value = updaterOrValue
}
