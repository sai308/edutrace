<script setup lang="ts">
import type { Task } from '@Tasks/types/tasks'
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
    isOpen: boolean
    task: Task | null
}>()

const emit = defineEmits<{
    'update:isOpen': [value: boolean]
    close: []
    save: [taskData: Partial<Task>]
}>()

const formData = ref({
    name: '',
    date: '',
    maxPoints: 0,
    description: '',
})

watch(
    () => props.isOpen,
    (newVal) => {
        if (newVal) {
            if (props.task) {
                formData.value = {
                    name: props.task.name,
                    date: props.task.date || '',
                    maxPoints: props.task.maxPoints || 0,
                    description: props.task.description || '',
                }
            } else {
                formData.value = {
                    name: '',
                    date: '',
                    maxPoints: 0,
                    description: '',
                }
            }
        }
    },
)

function handleSave() {
    if (!formData.value.name.trim()) return

    emit('save', {
        name: formData.value.name.trim(),
        date: formData.value.date || undefined,
        maxPoints: Number(formData.value.maxPoints) || 0,
        description: formData.value.description.trim() || undefined,
    })
}

function handleClose() {
    emit('update:isOpen', false)
    emit('close')
}
</script>

<template>
    <Dialog :open="isOpen" @update:open="(val) => emit('update:isOpen', val)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>
                    {{ task ? $t('tasks.dialog.editTitle') : $t('tasks.dialog.addTitle') }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        task
                            ? $t('tasks.dialog.editDescription')
                            : $t('tasks.dialog.addDescription')
                    }}
                </DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
                <div class="grid gap-2">
                    <Label for="name">{{ $t('tasks.dialog.nameLabel') }}</Label>
                    <Input
                        id="name"
                        v-model="formData.name"
                        :placeholder="$t('tasks.dialog.namePlaceholder')"
                    />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="grid gap-2">
                        <Label for="date">{{ $t('tasks.dialog.dateLabel') }}</Label>
                        <Input id="date" v-model="formData.date" type="date" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="maxPoints">{{ $t('tasks.dialog.maxPointsLabel') }}</Label>
                        <Input id="maxPoints" v-model="formData.maxPoints" type="number" min="0" />
                    </div>
                </div>
                <div class="grid gap-2">
                    <Label for="description">{{ $t('tasks.dialog.descriptionLabel') }}</Label>
                    <Input
                        id="description"
                        v-model="formData.description"
                        :placeholder="$t('tasks.dialog.descriptionPlaceholder')"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" @click="handleClose">
                    {{ $t('common.cancel') }}
                </Button>
                <Button type="submit" :disabled="!formData.name.trim()" @click="handleSave">
                    {{ $t('common.save') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
