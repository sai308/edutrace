<script setup lang="ts">
import { Wand2 } from 'lucide-vue-next'
import { ref, watch } from 'vue'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = withDefaults(defineProps<Props>(), {
    currentGrade: '',
    hintGrade: null,
})

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm', grade: string): void
}>()

const { t } = useI18n()

interface Props {
    open: boolean
    studentName: string
    /** Current grade already applied (can be empty string) */
    currentGrade?: string
    /** Partial 'total' grade used as auto-grade hint (e.g. "~62" or "4") */
    hintGrade?: string | number | null
}

const gradeInput = ref('')

// Reset input when the dialog opens
watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            gradeInput.value = props.currentGrade ?? ''
        }
    },
)

/** Strip the partial marker (~) and return just the numeric/letter value */
function cleanedHint(): string {
    if (props.hintGrade === null || props.hintGrade === undefined)
        return ''
    return String(props.hintGrade).replace('~', '').trim()
}

function applyHint() {
    const hint = cleanedHint()
    if (hint)
        gradeInput.value = hint
}

function handleConfirm() {
    const trimmed = gradeInput.value.trim()
    if (trimmed) {
        emit('confirm', trimmed)
        emit('update:open', false)
    }
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter')
        handleConfirm()
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-[420px]">
            <DialogHeader>
                <DialogTitle>{{ t('summary.modal.setManualTitle') }}</DialogTitle>
                <DialogDescription>
                    {{ t('summary.modal.setManualDescription') }}
                    <span class="font-semibold text-foreground">{{ studentName }}</span>.
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-3 py-2">
                <div class="flex items-center gap-2">
                    <Label for="manual-grade-input" class="shrink-0 text-sm">{{ t('summary.modal.grade') }}</Label>
                    <Input
                        id="manual-grade-input"
                        v-model="gradeInput"
                        :placeholder="t('summary.modal.placeholder')"
                        class="flex-1"
                        autocomplete="off"
                        @keydown="handleKeydown"
                    />
                    <!-- Auto-grade hint button — only shown when a partial total exists -->
                    <Button
                        v-if="hintGrade !== null && hintGrade !== undefined && String(hintGrade).trim() !== ''"
                        variant="outline"
                        size="sm"
                        class="shrink-0 gap-1.5 text-xs"
                        :title="t('summary.modal.autoGradeHint', { grade: cleanedHint() })"
                        @click="applyHint"
                    >
                        <Wand2 class="h-3.5 w-3.5 text-primary" />
                        {{ t('summary.modal.autoButton') }}
                        <span class="font-mono font-semibold ml-0.5">{{ cleanedHint() }}</span>
                    </Button>
                </div>
                <p class="text-xs text-muted-foreground">
                    {{ t('summary.modal.manualHint', { key: 'Enter' }) }}
                </p>
            </div>

            <DialogFooter class="gap-2 sm:gap-0">
                <Button variant="outline" @click="emit('update:open', false)">
                    {{ t('common.cancel') }}
                </Button>
                <Button :disabled="!gradeInput.trim()" @click="handleConfirm">
                    {{ t('summary.modal.applyButton') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
