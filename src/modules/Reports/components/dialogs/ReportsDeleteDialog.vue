<script setup lang="ts">
import { useMeets } from '@Analytics/composables/useMeets'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { logger } from '@/shared/lib/logger'

const props = defineProps<{
    open: boolean
    meetId?: string | null
    meetIds?: string[]
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}>()

const { t } = useI18n()
const { deleteMeet, bulkDeleteMeets } = useMeets()

const isDeleting = ref(false)

async function handleConfirm() {
    if (!props.meetId && (!props.meetIds || props.meetIds.length === 0))
        return

    try {
        isDeleting.value = true
        if (props.meetId) {
            await deleteMeet(props.meetId)
        }
        else if (props.meetIds && props.meetIds.length > 0) {
            await bulkDeleteMeets(props.meetIds)
        }
        emit('success')
        emit('update:open', false)
    }
    catch (e) {
        logger.error('Failed to delete meet(s):', e)
    }
    finally {
        isDeleting.value = false
    }
}
</script>

<template>
    <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{{ t('reports.deleteModal.title') }}</AlertDialogTitle>
                <AlertDialogDescription>
                    {{
                        props.meetIds?.length
                            ? t(
                                'reports.deleteModal.message_multiple',
                                {
                                    count: props.meetIds.length,
                                },
                                `${props.meetIds.length} reports will be deleted.`,
                            )
                            : t('reports.deleteModal.message_single')
                    }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="isDeleting">
                    {{ t('common.cancel') }}
                </AlertDialogCancel>
                <AlertDialogAction
                    :disabled="isDeleting"
                    class="bg-destructive text-destructive-foreground"
                    @click.prevent="handleConfirm"
                >
                    {{ t('common.delete') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
