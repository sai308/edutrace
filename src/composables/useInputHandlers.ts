import type { Ref } from 'vue';

export function useInputHandlers() {
    function handleMeetIdPasteUtil(event: ClipboardEvent, searchQueryRef: Ref<string>): void {
        const text = event.clipboardData?.getData('text');
        if (!text) return;

        // Regex to match Google Meet IDs (xxx-xxxx-xxx)
        const match = text.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
        if (match) {
            event.preventDefault();
            searchQueryRef.value = match[0];
        }
    }

    return {
        handleMeetIdPasteUtil
    };
}
