<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
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

defineProps<Props>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm'): void
}>()

const { t } = useI18n()

interface Props {
    open: boolean
    studentName: string
}
</script>

<template>
    <AlertDialog :open="open" @update:open="emit('update:open', $event)">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{{ t('summary.delete.title') }}</AlertDialogTitle>
                <AlertDialogDescription class="pt-1">
                    {{ t('summary.delete.description', { name: studentName }) }}
                    <span class="block mt-2 text-xs text-destructive/80 font-medium">
                        {{ t('summary.delete.warning') }}
                    </span>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                <AlertDialogAction
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click="emit('confirm')"
                >
                    <Trash2 class="mr-2 h-4 w-4" />
                    {{ t('summary.delete.confirmButton') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
