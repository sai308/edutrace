<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

defineProps<{
    open: boolean
}>()

defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'select', mode: 'all' | 'related'): void
}>()

const { t } = useI18n()
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{{ t('reports.importDialog.title') }}</DialogTitle>
                <DialogDescription>{{ t('reports.importDialog.description') }}</DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
                <Button
                    variant="outline"
                    class="h-auto py-4 px-4 justify-start text-left"
                    @click="$emit('select', 'related')"
                >
                    <div>
                        <div class="font-semibold">
                            {{ t('reports.importDialog.relatedOnly') }}
                        </div>
                        <div class="text-xs text-muted-foreground mt-1">
                            {{ t('reports.importDialog.relatedOnlyDesc') }}
                        </div>
                    </div>
                </Button>
                <Button
                    variant="outline"
                    class="h-auto py-4 px-4 justify-start text-left"
                    @click="$emit('select', 'all')"
                >
                    <div>
                        <div class="font-semibold">
                            {{ t('reports.importDialog.allFiles') }}
                        </div>
                        <div class="text-xs text-muted-foreground mt-1">
                            {{ t('reports.importDialog.allFilesDesc') }}
                        </div>
                    </div>
                </Button>
            </div>
            <DialogFooter>
                <Button variant="ghost" @click="$emit('update:open', false)">
                    {{ t('common.cancel') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
