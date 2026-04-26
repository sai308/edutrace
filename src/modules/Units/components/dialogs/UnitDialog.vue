<script setup lang="ts">
import type { Task } from '@Tasks/types/tasks'
import type { Unit } from '@Units/types/units'
import { Calculator, Check, FileText, HelpCircle, ListTodo, Target } from 'lucide-vue-next'
import { computed, markRaw, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Stepper,
    StepperDescription,
    StepperIndicator,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps<{
    isOpen: boolean
    unit: Unit | null
    availableTasks: Task[]
}>()

const emit = defineEmits<{
    'update:isOpen': [value: boolean]
    close: []
    save: [unitData: Partial<Unit>]
}>()

const { t } = useI18n()

const stepIndex = ref(1)
const steps = computed(() => [
    {
        step: 1,
        title: t('modules.dialog.steps.details.title'),
        description: t('modules.dialog.steps.details.desc'),
        icon: markRaw(FileText),
    },
    {
        step: 2,
        title: t('modules.dialog.steps.tasks.title'),
        description: t('modules.dialog.steps.tasks.desc'),
        icon: markRaw(ListTodo),
    },
    {
        step: 3,
        title: t('modules.dialog.steps.testTask.title'),
        description: t('modules.dialog.steps.testTask.desc'),
        icon: markRaw(Target),
    },
    {
        step: 4,
        title: t('modules.dialog.steps.grading.title'),
        description: t('modules.dialog.steps.grading.desc'),
        icon: markRaw(Calculator),
    },
])

const searchQuery = ref('')

const formData = ref<{
    name: string
    description: string
    taskIds: string[]
    testTaskId: string | undefined
    taskCoef: number
    testCoef: number
}>({
    name: '',
    description: '',
    taskIds: [],
    testTaskId: undefined,
    taskCoef: 1,
    testCoef: 1,
})

watch(
    () => props.isOpen,
    (newVal) => {
        if (newVal) {
            stepIndex.value = 1 // Reset to step 1 on open
            if (props.unit) {
                formData.value = {
                    name: props.unit.name,
                    description: props.unit.description || '',
                    taskIds: [...(props.unit.taskIds || [])],
                    testTaskId: props.unit.testTaskId ? String(props.unit.testTaskId) : undefined,
                    taskCoef: props.unit.taskCoef ?? 1,
                    testCoef: props.unit.testCoef ?? 1,
                }
            } else {
                formData.value = {
                    name: '',
                    description: '',
                    taskIds: [],
                    testTaskId: undefined,
                    taskCoef: 1,
                    testCoef: 1,
                }
            }
            searchQuery.value = ''
        }
    }
)

function handleTaskToggle(taskId: string, checked: boolean | 'indeterminate') {
    const isChecked = checked === true
    const index = formData.value.taskIds.indexOf(taskId)
    if (isChecked && index === -1) {
        formData.value.taskIds.push(taskId)
    } else if (!isChecked && index > -1) {
        formData.value.taskIds.splice(index, 1)
        if (formData.value.testTaskId === taskId) {
            formData.value.testTaskId = undefined
        }
    }
}

const processedTasks = computed(() => {
    let filtered = props.availableTasks

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter((task) => task.name.toLowerCase().includes(query))
    }

    return [...filtered].sort((a, b) => {
        const aSelected = formData.value.taskIds.includes(a.id)
        const bSelected = formData.value.taskIds.includes(b.id)

        if (aSelected && !bSelected) return -1
        if (!aSelected && bSelected) return 1

        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })
})

const availableTestTasks = computed(() => {
    return props.availableTasks.filter((task) => formData.value.taskIds.includes(task.id))
})

const isStep1Valid = computed(() => {
    return formData.value.name.trim().length > 0
})

const canProceed = computed(() => {
    if (stepIndex.value === 1) return isStep1Valid.value
    return true // Other steps are technically always physically valid as they have defaults
})

function nextStep() {
    if (canProceed.value && stepIndex.value < steps.value.length) {
        stepIndex.value++
    }
}

function prevStep() {
    if (stepIndex.value > 1) {
        stepIndex.value--
    }
}

function handleSave() {
    if (!isStep1Valid.value) return

    const taskIds = [...formData.value.taskIds]
    const testTaskId =
        formData.value.testTaskId && formData.value.testTaskId !== 'none' ? formData.value.testTaskId : null

    emit('save', {
        name: formData.value.name.trim(),
        description: formData.value.description.trim() || undefined,
        taskIds,
        testTaskId,
        taskCoef: Number(formData.value.taskCoef) || 1,
        testCoef: Number(formData.value.testCoef) || 1,
    })
}

function handleClose() {
    emit('update:isOpen', false)
    emit('close')
}
</script>

<template>
    <Dialog :open="isOpen" @update:open="(val) => emit('update:isOpen', val)">
        <DialogContent
            v-if="isOpen"
            class="sm:max-w-[700px] flex flex-col h-dvh md:h-[750px] md:max-h-[95dvh] justify-between p-4 sm:p-6 overflow-hidden"
        >
            <div class="flex flex-col flex-1 overflow-hidden">
                <DialogHeader class="mb-4 shrink-0 px-1">
                    <DialogTitle>
                        {{ unit ? t('modules.dialog.editTitle') : t('modules.dialog.createTitle') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ t('modules.dialog.description') }}
                    </DialogDescription>
                </DialogHeader>

                <Stepper v-model="stepIndex" class="flex w-full items-start gap-2 mb-8 shrink-0 px-1">
                    <StepperItem
                        v-for="step in steps"
                        :key="step.step"
                        v-slot="{ state }"
                        class="relative flex w-full flex-col items-center justify-center -space-y-4"
                        :step="step.step"
                    >
                        <StepperSeparator
                            v-if="steps[steps.length - 1] && step.step !== steps[steps.length - 1]?.step"
                            class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
                        />

                        <StepperTrigger as-child>
                            <Button
                                :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
                                size="icon"
                                class="z-10 rounded-full shrink-0 transition-all data-[state=active]:ring-2 data-[state=active]:ring-ring data-[state=active]:ring-offset-2 data-[state=active]:ring-offset-background"
                            >
                                <StepperIndicator>
                                    <Check v-if="state === 'completed'" class="size-4" />
                                    <component :is="step.icon" v-else class="size-4" />
                                </StepperIndicator>
                            </Button>
                        </StepperTrigger>

                        <div class="mt-5 flex flex-col items-center text-center">
                            <StepperTitle
                                :class="[state === 'active' && 'text-primary']"
                                class="text-sm font-semibold transition lg:text-base mt-4"
                            >
                                {{ step.title }}
                            </StepperTitle>
                            <StepperDescription
                                :class="[state === 'active' && 'text-primary']"
                                class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm mt-1"
                            >
                                {{ step.description }}
                            </StepperDescription>
                        </div>
                    </StepperItem>
                </Stepper>

                <div class="py-2 px-1 flex-1 overflow-y-auto overflow-x-hidden">
                    <!-- Step 1: Basic Details -->
                    <template v-if="stepIndex === 1">
                        <div class="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div class="grid gap-2">
                                <Label for="name">{{ t('modules.dialog.nameLabel') }}</Label>
                                <Input
                                    id="name"
                                    v-model="formData.name"
                                    :placeholder="t('modules.dialog.namePlaceholder')"
                                />
                            </div>

                            <div class="grid gap-2">
                                <Label for="description">{{ t('modules.dialog.descLabel') }}</Label>
                                <Textarea
                                    id="description"
                                    v-model="formData.description"
                                    :placeholder="t('modules.dialog.descPlaceholder')"
                                    class="resize-none h-32"
                                />
                            </div>
                        </div>
                    </template>

                    <!-- Step 2: Tasks (v-show keeps Checkboxes mounted to prevent unmount state loss) -->
                    <div v-show="stepIndex === 2" class="h-full flex flex-col min-h-0">
                        <div class="flex flex-col gap-4 h-full min-h-0">
                            <div class="flex flex-col gap-2 h-full min-h-0">
                                <Label>{{ t('modules.dialog.assignTasks') }}</Label>
                                <Input
                                    v-model="searchQuery"
                                    :placeholder="t('modules.dialog.searchTasks')"
                                    class="mb-2 shrink-0"
                                />
                                <div
                                    class="border rounded-md flex-1 min-h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar bg-background"
                                >
                                    <div class="p-4">
                                        <div class="flex flex-col gap-3">
                                            <div
                                                v-for="task in processedTasks"
                                                :key="task.id"
                                                class="flex items-start space-x-3 group w-full py-1"
                                            >
                                                <Checkbox
                                                    :id="`task-${task.id}`"
                                                    :model-value="formData.taskIds.includes(task.id)"
                                                    class="mt-0.5"
                                                    @update:model-value="(val) => handleTaskToggle(task.id, val)"
                                                />
                                                <Label
                                                    :for="`task-${task.id}`"
                                                    class="text-sm font-normal cursor-pointer leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4"
                                                >
                                                    <span class="flex-1">{{ task.name }}</span>
                                                    <span
                                                        v-show="task.date"
                                                        class="text-muted-foreground whitespace-nowrap shrink-0 text-xs sm:text-sm"
                                                        >({{ task.date }})</span
                                                    >
                                                </Label>
                                            </div>
                                            <div
                                                v-show="processedTasks.length === 0"
                                                class="text-muted-foreground text-sm text-center py-8"
                                            >
                                                {{ t('modules.dialog.noTasks') }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Test Task -->
                    <template v-if="stepIndex === 3">
                        <div class="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div class="grid gap-2">
                                <Label>{{ t('modules.dialog.selectTestTask') }}</Label>
                                <Select v-model="formData.testTaskId">
                                    <SelectTrigger>
                                        <SelectValue :placeholder="t('modules.dialog.selectTestPlaceholder')" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="none">
                                                {{ t('modules.dialog.none') }}
                                            </SelectItem>
                                            <SelectItem
                                                v-for="task in availableTestTasks"
                                                :key="`test-${task.id}`"
                                                :value="task.id.toString()"
                                            >
                                                {{ task.name }}
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <span class="text-xs text-muted-foreground">{{
                                    t('modules.dialog.testTaskHint')
                                }}</span>
                            </div>
                        </div>
                    </template>

                    <!-- Step 4: Grading -->
                    <template v-if="stepIndex === 4">
                        <div class="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <!-- Coefficients Row -->
                            <TooltipProvider>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="grid gap-2">
                                        <div class="flex items-center gap-2">
                                            <Label for="taskCoef">{{ t('modules.dialog.taskCoefLabel') }}</Label>
                                            <Tooltip>
                                                <TooltipTrigger tabindex="-1">
                                                    <HelpCircle class="h-4 w-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{{ t('modules.dialog.taskCoefHelp') }}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input
                                            id="taskCoef"
                                            v-model="formData.taskCoef"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div class="grid gap-2">
                                        <div class="flex items-center gap-2">
                                            <Label for="testCoef">{{ t('modules.dialog.testCoefLabel') }}</Label>
                                            <Tooltip>
                                                <TooltipTrigger tabindex="-1">
                                                    <HelpCircle class="h-4 w-4 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{{ t('modules.dialog.testCoefHelp') }}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input
                                            id="testCoef"
                                            v-model="formData.testCoef"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </TooltipProvider>

                            <!-- Selected Tasks Summary -->
                            <div class="grid gap-2 mt-2">
                                <Label>{{ t('modules.dialog.summaryLabel') }}</Label>
                                <div class="border rounded-md bg-muted/30">
                                    <ScrollArea class="h-[150px] md:h-[200px] p-4">
                                        <div class="space-y-3">
                                            <div
                                                v-for="task in availableTestTasks"
                                                :key="`summary-${task.id}`"
                                                class="flex items-center space-x-2"
                                            >
                                                <div
                                                    class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                                                    :class="{
                                                        'bg-amber-500': formData.testTaskId === task.id,
                                                    }"
                                                />
                                                <div class="text-sm font-medium leading-none flex items-center">
                                                    {{ task.name }}
                                                    <span
                                                        v-show="formData.testTaskId === task.id"
                                                        class="text-amber-500 ml-2 text-xs font-semibold flex items-center gap-1"
                                                    >
                                                        <Check class="w-3 h-3" />
                                                        {{ t('modules.dialog.testTaskBadge') }}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                v-show="availableTestTasks.length === 0"
                                                class="text-muted-foreground text-sm text-center py-4"
                                            >
                                                {{ t('modules.dialog.noTasksSelected') }}
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <DialogFooter class="flex sm:justify-between w-full mt-4 pt-4 flex-row items-center border-t shrink-0 px-1">
                <Button type="button" variant="outline" class="mr-auto" @click="handleClose">
                    {{ t('modules.dialog.cancel') }}
                </Button>

                <div class="flex gap-2">
                    <Button type="button" variant="ghost" :disabled="stepIndex === 1" @click="prevStep">
                        {{ t('modules.dialog.previous') }}
                    </Button>
                    <Button v-if="stepIndex < steps.length" type="button" :disabled="!canProceed" @click="nextStep">
                        {{ t('modules.dialog.next') }}
                    </Button>
                    <Button v-else type="submit" :disabled="!canProceed" @click="handleSave">
                        {{ t('modules.dialog.save') }}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
