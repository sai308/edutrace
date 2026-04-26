<script setup lang="ts">
import type { SummaryThresholds } from '@/shared/types/Settings'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberInput } from '@/components/ui/custom/number-input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// Re-exported so consumers can import SummarySettings from this component
// without depending on the shared types path directly.
export type SummarySettings = SummaryThresholds

const props = defineProps<{
    open: boolean
    settings: SummarySettings
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'apply', settings: SummarySettings): void
    (e: 'change', settings: SummarySettings): void
}>()

const { t } = useI18n()

// Local copy — mirrored from props when sheet opens
const local = ref<SummarySettings>({ ...props.settings })

watch(
    () => props.open,
    (opened) => {
        if (opened)
            local.value = { ...props.settings }
    },
)

function handleOpenUpdate(val: boolean) {
    emit('update:open', val)
}

function changed() {
    emit('change', { ...local.value })
}

function apply() {
    emit('apply', { ...local.value })
    handleOpenUpdate(false)
}

function reset() {
    local.value = {
        completionThreshold: 70,
        attendanceThreshold: 60,
        attendanceEnabled: true,
        requiredTasks: 0,
    }
}
</script>

<template>
    <Sheet :open="open" @update:open="handleOpenUpdate">
        <SheetContent class="w-full max-w-[380px] flex flex-col p-0 gap-0">
            <SheetHeader class="px-6 pt-6 pb-4 border-b shrink-0">
                <SheetTitle>{{ t('summary.settings.title') }}</SheetTitle>
                <SheetDescription>
                    {{ t('summary.settings.description') }}
                </SheetDescription>
            </SheetHeader>

            <ScrollArea class="flex-1 min-h-0">
                <div class="px-6 py-4 space-y-6">
                    <!-- Completion Threshold -->
                    <div class="space-y-2">
                        <Label for="sheet-completion" class="text-base font-semibold">{{
                            t('summary.thresholds.completion')
                        }}</Label>
                        <p class="text-xs text-muted-foreground">
                            {{ t('summary.settings.completionHint') }}
                        </p>
                        <NumberInput
                            id="sheet-completion"
                            v-model.number="local.completionThreshold"
                            min="0"
                            max="100"
                            variant="vertical"
                            class="w-full"
                            @change="changed"
                        />
                    </div>

                    <!-- Attendance Threshold -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <Checkbox
                                id="sheet-attendanceEnabled"
                                v-model:checked="local.attendanceEnabled"
                                @update:checked="changed"
                            />
                            <Label
                                for="sheet-attendanceEnabled"
                                class="text-base font-semibold cursor-pointer"
                                :class="{ 'opacity-50': !local.attendanceEnabled }"
                            >{{ t('summary.thresholds.attendance') }}</Label>
                        </div>
                        <p class="text-xs text-muted-foreground" :class="{ 'opacity-50': !local.attendanceEnabled }">
                            {{ t('summary.settings.attendanceHint') }}
                        </p>
                        <NumberInput
                            id="sheet-attendance"
                            v-model.number="local.attendanceThreshold"
                            min="0"
                            max="100"
                            variant="vertical"
                            class="w-full"
                            :disabled="!local.attendanceEnabled"
                            @change="changed"
                        />
                    </div>

                    <!-- Required Tasks -->
                    <div class="space-y-2">
                        <Label for="sheet-required" class="text-base font-semibold">{{
                            t('summary.thresholds.requiredTasks')
                        }}</Label>
                        <p class="text-xs text-muted-foreground">
                            {{ t('summary.settings.requiredTasksHint') }}
                        </p>
                        <NumberInput
                            id="sheet-required"
                            v-model.number="local.requiredTasks"
                            min="0"
                            variant="vertical"
                            class="w-full"
                            @change="changed"
                        />
                    </div>
                </div>
            </ScrollArea>

            <SheetFooter class="px-6 py-4 border-t shrink-0 flex-row justify-between gap-2">
                <Button variant="ghost" @click="reset">
                    {{ t('summary.settings.reset') }}
                </Button>
                <div class="flex gap-2">
                    <Button variant="outline" @click="handleOpenUpdate(false)">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button @click="apply">
                        {{ t('summary.settings.apply') }}
                    </Button>
                </div>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
