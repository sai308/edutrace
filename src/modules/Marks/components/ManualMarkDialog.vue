<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import type { Member } from '@Students/types/students'
import type { Task } from '@Tasks/types/tasks'
import { studentsRepository } from '@Students/services/students.repository'
import { tasksRepository } from '@Tasks/services/tasks.repository'
import { ChevronDown, PenLine } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/custom/number-input'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface ManualMarkData {
    groupName: string
    studentId: string
    taskId: string
    score: number
}

const props = defineProps<{
    open: boolean
    groups: Group[]
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm', data: ManualMarkData): void
}>()

const { t } = useI18n()

// Form state
const selectedGroupName = ref('')
const selectedStudent = ref<Member | null>(null)
const selectedTask = ref<Task | null>(null)
const score = ref(0)

// Loaded data
const students = ref<Member[]>([])
const tasks = ref<Task[]>([])

// Combobox search state
const studentSearch = ref('')
const taskSearch = ref('')
const showStudentList = ref(false)
const showTaskList = ref(false)

const filteredStudents = computed(() => {
    const q = studentSearch.value.toLowerCase()
    return q ? students.value.filter(s => s.name.toLowerCase().includes(q)) : students.value
})

const filteredTasks = computed(() => {
    const q = taskSearch.value.toLowerCase()
    return q ? tasks.value.filter(t => t.name.toLowerCase().includes(q)) : tasks.value
})

const maxScore = computed(() => selectedTask.value?.maxPoints ?? 100)

const isValid = computed(
    () =>
        !!selectedGroupName.value
        && !!selectedStudent.value
        && !!selectedTask.value
        && score.value >= 0
        && score.value <= maxScore.value,
)

// Load tasks on open; reset form
watch(
    () => props.open,
    async (open) => {
        if (!open)
            return
        tasks.value = await tasksRepository.getAllTasks()
        selectedGroupName.value = ''
        selectedStudent.value = null
        selectedTask.value = null
        score.value = 0
        studentSearch.value = ''
        taskSearch.value = ''
        students.value = []
    },
)

// Load students when group changes
watch(selectedGroupName, async (groupName) => {
    selectedStudent.value = null
    studentSearch.value = ''
    students.value = groupName ? await studentsRepository.getMembersByGroup(groupName) : []
})

// Sync selected task back to search input
watch(selectedTask, (task) => {
    taskSearch.value = task?.name ?? ''
})

// Sync selected student back to search input
watch(selectedStudent, (student) => {
    studentSearch.value = student?.name ?? ''
})

function selectStudent(student: Member) {
    selectedStudent.value = student
    showStudentList.value = false
}

function selectTask(task: Task) {
    selectedTask.value = task
    score.value = 0
    showTaskList.value = false
}

function handleBlur(type: 'student' | 'task') {
    setTimeout(() => {
        if (type === 'student')
            showStudentList.value = false
        if (type === 'task')
            showTaskList.value = false
    }, 200)
}

function handleSave() {
    if (!isValid.value || !selectedStudent.value || !selectedTask.value)
        return
    emit('confirm', {
        groupName: selectedGroupName.value,
        studentId: selectedStudent.value.id,
        taskId: selectedTask.value.id,
        score: score.value,
    })
    emit('update:open', false)
}
</script>

<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[440px]">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <PenLine class="w-4 h-4" />
                    {{ t('marks.manual.title') }}
                </DialogTitle>
                <DialogDescription>{{ t('marks.manual.description') }}</DialogDescription>
            </DialogHeader>

            <div class="grid gap-5 py-2">
                <!-- Group -->
                <div class="grid gap-2">
                    <Label>{{ t('marks.manual.group') }} <span class="text-destructive ml-0.5">*</span></Label>
                    <Select v-model="selectedGroupName">
                        <SelectTrigger>
                            <SelectValue :placeholder="t('marks.manual.selectGroup')" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="group in groups" :key="group.id" :value="group.name">
                                {{ group.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Student -->
                <div class="grid gap-2 relative">
                    <Label :class="{ 'opacity-40': !selectedGroupName }">
                        {{ t('marks.manual.student') }}
                        <span class="text-destructive ml-0.5">*</span>
                    </Label>
                    <div class="relative">
                        <Input
                            v-model="studentSearch"
                            :placeholder="
                                selectedGroupName ? t('marks.manual.searchStudent') : t('marks.manual.selectGroupFirst')
                            "
                            :disabled="!selectedGroupName"
                            @focus="showStudentList = true"
                            @blur="handleBlur('student')"
                            @input="selectedStudent = null"
                        />
                        <Button
                            v-if="students.length > 0"
                            variant="ghost"
                            size="icon"
                            class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                            tabindex="-1"
                            @mousedown.prevent
                            @click="showStudentList = !showStudentList"
                        >
                            <ChevronDown class="w-4 h-4" />
                        </Button>
                    </div>
                    <div
                        v-if="showStudentList && filteredStudents.length > 0"
                        class="absolute top-[calc(100%+2px)] z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                        <div class="p-1 max-h-48 overflow-y-auto">
                            <div
                                v-for="student in filteredStudents"
                                :key="student.id"
                                class="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                @mousedown.prevent
                                @click="selectStudent(student)"
                            >
                                {{ student.name }}
                            </div>
                        </div>
                    </div>
                    <p v-if="selectedGroupName && students.length === 0" class="text-xs text-muted-foreground">
                        {{ t('marks.manual.noStudents') }}
                    </p>
                </div>

                <!-- Task -->
                <div class="grid gap-2 relative">
                    <Label>{{ t('marks.manual.task') }} <span class="text-destructive ml-0.5">*</span></Label>
                    <div class="relative">
                        <Input
                            v-model="taskSearch"
                            :placeholder="t('marks.manual.searchTask')"
                            @focus="showTaskList = true"
                            @blur="handleBlur('task')"
                            @input="selectedTask = null"
                        />
                        <Button
                            v-if="tasks.length > 0"
                            variant="ghost"
                            size="icon"
                            class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                            tabindex="-1"
                            @mousedown.prevent
                            @click="showTaskList = !showTaskList"
                        >
                            <ChevronDown class="w-4 h-4" />
                        </Button>
                    </div>
                    <div
                        v-if="showTaskList && filteredTasks.length > 0"
                        class="absolute top-[calc(100%+2px)] z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                        <div class="p-1 max-h-48 overflow-y-auto">
                            <div
                                v-for="task in filteredTasks"
                                :key="task.id"
                                class="flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                @mousedown.prevent
                                @click="selectTask(task)"
                            >
                                <span class="truncate">{{ task.name }}</span>
                                <span class="text-xs text-muted-foreground ml-2 shrink-0">/ {{ task.maxPoints }}</span>
                            </div>
                        </div>
                    </div>
                    <p v-if="tasks.length === 0" class="text-xs text-muted-foreground">
                        {{ t('marks.manual.noTasks') }}
                    </p>
                </div>

                <!-- Score -->
                <div class="grid gap-2">
                    <Label :class="{ 'opacity-40': !selectedTask }">
                        {{ t('marks.manual.score') }}
                        <span v-if="selectedTask" class="text-muted-foreground font-normal ml-1">
                            {{ t('marks.manual.outOf', { max: maxScore }) }}
                        </span>
                    </Label>
                    <NumberInput
                        v-model.number="score"
                        :min="0"
                        :max="maxScore"
                        :disabled="!selectedTask"
                        variant="horizontal"
                        class="w-full"
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="$emit('update:open', false)">
                    {{ t('common.cancel') }}
                </Button>
                <Button :disabled="!isValid" @click="handleSave">
                    {{ t('common.save') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
