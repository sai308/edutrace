import type { Ref } from 'vue'
import { ref } from 'vue'

export function useFileDrop(emit: (event: 'files-dropped', files: File[]) => void) {
    const isOver: Ref<boolean> = ref(false)
    const isInvalidDrag: Ref<boolean> = ref(false)
    let dragCounter = 0

    function checkFileTypes(items: DataTransferItemList | null): boolean {
        if (!items) return false

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item && item.kind === 'file') {
                const type = item.type
                const isValid =
                    type === 'text/csv' ||
                    type === 'application/vnd.ms-excel' ||
                    type === 'application/csv' ||
                    type === 'text/x-csv' ||
                    type === 'application/x-csv' ||
                    type === 'text/comma-separated-values' ||
                    type === 'text/x-comma-separated-values' ||
                    type === ''

                if (!isValid) return false
            }
        }
        return true
    }

    function onDragEnter(e: DragEvent): void {
        e.preventDefault()
        dragCounter++

        if (dragCounter === 1) {
            isOver.value = true
            if (e.dataTransfer && e.dataTransfer.items) {
                isInvalidDrag.value = !checkFileTypes(e.dataTransfer.items)
            }
        }
    }

    function onDragLeave(e: DragEvent): void {
        e.preventDefault()

        if (dragCounter > 0) {
            dragCounter--
        }

        if (dragCounter === 0) {
            isOver.value = false
            isInvalidDrag.value = false
        }
    }

    function onDragOver(e: DragEvent): void {
        e.preventDefault()
    }

    function onDrop(e: DragEvent): void {
        e.preventDefault()
        isOver.value = false
        isInvalidDrag.value = false
        dragCounter = 0

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
            const validFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.csv'))
            if (validFiles.length > 0) {
                emit('files-dropped', validFiles)
            }
        }
    }

    return {
        isOver,
        isInvalidDrag,
        onDragEnter,
        onDragLeave,
        onDragOver,
        onDrop,
    }
}
