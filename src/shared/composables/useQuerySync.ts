import type { Ref } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Syncs reactive state with URL query parameters (bidirectional).
 *
 * The key design constraint: we cannot simply debounce the state→route
 * router.replace call and also have a route→state watcher that resets refs
 * to '' whenever a key is absent from route.query — that combination creates
 * an async reset loop:
 *
 *   state changes → intent set → router.replace debounced (300 ms)
 *   → route.query still stale → route→state watcher sees key missing
 *   → resets ref to '' → triggers state→route again → infinite cycle
 *
 * Solution: maintain an `intent` map that records what we *want* route.query
 * to be. This is updated synchronously on every state change; router.replace
 * is debounced. The route→state watcher compares the incoming URL value to
 * `intent[key]`, not to `refVal.value`. A match means we caused this
 * navigation — skip. A mismatch means back/forward or external navigation —
 * update state and intent.
 *
 * @param stateMap - Map of query param keys to reactive refs.
 */
export function useQuerySync(stateMap: Record<string, Ref<any>>) {
    const router = useRouter()
    const route = useRoute()

    // intent[key] — the string we expect route.query[key] to settle on.
    // undefined means the key should be absent from the URL.
    const intent: Record<string, string | undefined> = {}

    // 1. Initialize state and intent from the current URL on mount.
    Object.entries(stateMap).forEach(([key, refVal]) => {
        const raw = route.query[key]
        const val = Array.isArray(raw) ? raw[0] : raw
        if (val != null) {
            refVal.value = val
            intent[key] = val
        }
        else {
            intent[key] = undefined
        }
    })

    // 2. Route → state: fires when the URL changes.
    //    Skip keys whose URL value matches our intent — those are navigations
    //    we triggered ourselves. Only act on external changes (back/forward).
    watch(
        () => route.query,
        (newQuery) => {
            Object.entries(stateMap).forEach(([key, refVal]) => {
                const raw = newQuery[key]
                const newVal: string | undefined = (Array.isArray(raw) ? raw[0] : raw) ?? undefined

                if (newVal === intent[key])
                    return // our own navigation — skip

                // External navigation: sync state and update intent.
                intent[key] = newVal
                if (newVal !== undefined) {
                    refVal.value = newVal
                }
                else {
                    if (typeof refVal.value === 'boolean')
                        refVal.value = false
                    else if (typeof refVal.value === 'string')
                        refVal.value = ''
                    else refVal.value = null
                }
            })
        },
    )

    // 3. State → route: update intent immediately (keeps watcher 2 correct),
    //    then debounce router.replace so rapid keystrokes produce one entry.
    let timer: ReturnType<typeof setTimeout> | null = null

    watch(Object.values(stateMap), () => {
        Object.entries(stateMap).forEach(([key, refVal]) => {
            const val = refVal.value
            intent[key] = val ? String(val) : undefined
        })

        if (timer !== null)
            clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null
            const newQuery = { ...route.query }
            Object.entries(stateMap).forEach(([key, refVal]) => {
                const val = refVal.value
                if (val)
                    newQuery[key] = String(val) as LocationQueryValue
                else delete newQuery[key]
            })
            router.replace({ query: newQuery })
        }, 300)
    })

    onUnmounted(() => {
        if (timer !== null)
            clearTimeout(timer)
    })
}
