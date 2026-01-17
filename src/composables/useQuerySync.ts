import { watch, type Ref } from 'vue';
import { useRouter, useRoute, type LocationQueryValue } from 'vue-router';

/**
 * Syncs reactive state with URL query parameters.
 * 
 * @param {Record<string, Ref<any>>} stateMap - Map of query param keys to reactive refs.
 */
export function useQuerySync(stateMap: Record<string, Ref<any>>) {
    const router = useRouter();
    const route = useRoute();

    // 1. Initialize state from route.query
    Object.entries(stateMap).forEach(([key, refVal]) => {
        const queryVal = route.query[key];
        if (queryVal !== undefined && queryVal !== null) {
            // Handle different types if necessary, for now strings are default
            refVal.value = Array.isArray(queryVal) ? queryVal[0] : queryVal;
        }
    });

    // 2. Watch route query to update state (Back/Forward navigation)
    watch(() => route.query, (newQuery) => {
        Object.entries(stateMap).forEach(([key, refVal]) => {
            const rawVal = newQuery[key];
            const newVal = Array.isArray(rawVal) ? rawVal[0] : rawVal;

            // If param exists and is different, update state
            if (newVal !== undefined && newVal !== null && newVal !== String(refVal.value)) {
                refVal.value = newVal;
            }
            // If param is missing but state has value, reset state
            else if ((newVal === undefined || newVal === null) && refVal.value) {
                if (typeof refVal.value === 'boolean') refVal.value = false;
                else if (typeof refVal.value === 'string') refVal.value = '';
                else refVal.value = null;
            }
        });
    });

    // 3. Watch state to update route query
    watch(Object.values(stateMap), () => {
        const newQuery = { ...route.query };

        Object.entries(stateMap).forEach(([key, refVal]) => {
            const val = refVal.value;
            if (val) {
                newQuery[key] = String(val) as LocationQueryValue;
            } else {
                delete newQuery[key];
            }
        });

        router.replace({ query: newQuery });
    });
}
