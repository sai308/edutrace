<script setup lang="ts">
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

withDefaults(
    defineProps<{
        open: boolean
        title?: string
        message?: string
        confirmText?: string
        cancelText?: string
        variant?: 'danger' | 'primary'
    }>(),
    {
        variant: 'danger',
    },
)

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm'): void
}>()
</script>

<template>
    <AlertDialog :open="open" @update:open="emit('update:open', $event)">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{{ title || $t('confirm.defaultTitle') }}</AlertDialogTitle>
                <AlertDialogDescription>
                    {{ message || $t('confirm.defaultMessage') }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{{ cancelText || $t('confirm.cancel') }}</AlertDialogCancel>
                <AlertDialogAction
                    :class="
                        variant !== 'primary'
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            : ''
                    "
                    @click="emit('confirm')"
                >
                    {{ confirmText || $t('confirm.confirm') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
