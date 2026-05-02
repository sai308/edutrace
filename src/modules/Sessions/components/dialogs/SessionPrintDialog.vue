<script setup lang="ts">
import type { SessionReport } from '../../models/session.model'
import type { Group } from '@/modules/Groups/types/groups'
import { studentsRepository } from '@Students/services/students.repository'
import { Plus, Printer, X } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import i18n from '@/i18n'
import { settingsRepository } from '@/shared/services/settings.repository'
import { SessionTypeEnum } from '../../models/session.model'

export interface PrintFormData {
    recordNumber: string
    subject: string
    studyForm: string
    specialty: string
    formOfControl: string
    semester: string
    academicYear: string
    totalHours: string
    examiners: string[] // single for main, multiple for retakes
    practicalTeacher: string
    date: string
}

const props = defineProps<{
    open: boolean
    session: SessionReport
    group: Group | null
    /** Controls button/title wording: 'print' triggers window.print(), 'download' generates a .docx */
    mode?: 'print' | 'download'
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm', form: PrintFormData): void
}>()

const teacherSuggestions = ref<string[]>([])

onMounted(async () => {
    const [members, settings] = await Promise.all([
        studentsRepository.getAllMembers({ includeHidden: false }),
        settingsRepository.getPrintSettings(),
    ])

    teacherSuggestions.value = members
        .filter(m => m.role === 'teacher' || m.role === 'assistant')
        .map(m => m.name)
        .sort()

    // Apply defaults from settings if they exist
    if (settings.subject)
        form.value.subject = settings.subject
    if (settings.studyForm)
        form.value.studyForm = settings.studyForm
    if (settings.specialty)
        form.value.specialty = settings.specialty
    if (settings.formOfControl)
        form.value.formOfControl = settings.formOfControl
    if (settings.semester)
        form.value.semester = settings.semester
    if (settings.academicYear)
        form.value.academicYear = settings.academicYear
    if (settings.totalHours !== undefined) {
        form.value.totalHours = settings.totalHours.toString()
    }
    if (settings.practicalTeacher) {
        form.value.practicalTeacher = settings.practicalTeacher
        practicalTeacherTouched.value = true
    }
    if (settings.examiner) {
        form.value.examiners[0] = settings.examiner
    }
})

const isRetake = computed(() => props.session.sessionType !== SessionTypeEnum.MAIN)

const today = new Date()
const ukrainianMonths = [
    'січня',
    'лютого',
    'березня',
    'квітня',
    'травня',
    'червня',
    'липня',
    'серпня',
    'вересня',
    'жовтня',
    'листопада',
    'грудня',
]
const defaultDate = `${today.getDate()} ${ukrainianMonths[today.getMonth()]} ${today.getFullYear()} року`

// Determine current year for academic year auto-fill
const year = today.getFullYear()
const academicYearDefault = today.getMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`

const form = ref<PrintFormData>({
    recordNumber: '',
    subject: '',
    studyForm: '',
    specialty: '',
    formOfControl: i18n.global.t('sessions.printDialog.forms.exam'),
    semester: '',
    academicYear: academicYearDefault,
    totalHours: '',
    examiners: [''],
    practicalTeacher: '',
    date: defaultDate,
})

// When first examiner changes, keep practicalTeacher in sync if it wasn't manually edited
const practicalTeacherTouched = ref(false)
watch(
    () => form.value.examiners[0],
    (newVal) => {
        if (!practicalTeacherTouched.value) {
            form.value.practicalTeacher = newVal ?? ''
        }
    },
)

function addExaminer() {
    form.value.examiners.push('')
}
function removeExaminer(index: number) {
    form.value.examiners.splice(index, 1)
}

function handleConfirm() {
    emit('confirm', { ...form.value, examiners: [...form.value.examiners] })
    emit('update:open', false)
}

function handleClose() {
    emit('update:open', false)
}

// Filter teacher suggestions for autocomplete
function filteredSuggestions(index: number) {
    const text = form.value.examiners[index] || ''
    if (!text)
        return teacherSuggestions.value.slice(0, 8)
    return teacherSuggestions.value.filter(t => t.toLowerCase().includes(text.toLowerCase())).slice(0, 8)
}
const showSuggestions = ref<boolean[]>([false])
function selectSuggestion(index: number, name: string) {
    form.value.examiners[index] = name
    showSuggestions.value[index] = false
}
function onExaminerInput(index: number) {
    showSuggestions.value[index] = true
}
function onExaminerBlur(index: number) {
    // small delay to allow click on suggestion
    setTimeout(() => {
        showSuggestions.value[index] = false
    }, 150)
}
function ensureArrayLength(index: number) {
    while (showSuggestions.value.length <= index) {
        showSuggestions.value.push(false)
    }
}

// Practical teacher suggestion dropdown
const showPracticalSuggestions = ref(false)
const filteredPracticalSuggestions = computed(() => {
    const text = form.value.practicalTeacher || ''
    if (!text)
        return teacherSuggestions.value.slice(0, 8)
    return teacherSuggestions.value.filter(t => t.toLowerCase().includes(text.toLowerCase())).slice(0, 8)
})
function selectPracticalSuggestion(name: string) {
    form.value.practicalTeacher = name
    practicalTeacherTouched.value = true
    showPracticalSuggestions.value = false
}
function hidePracticalSuggestions() {
    setTimeout(() => {
        showPracticalSuggestions.value = false
    }, 150)
}

const isDownloadMode = computed(() => props.mode === 'download')

const sessionTypeLabel = computed(() => {
    switch (props.session.sessionType) {
        case SessionTypeEnum.MAIN:
            return i18n.global.t('sessions.types.MAIN')
        case SessionTypeEnum.FIRST_RETAKE:
            return i18n.global.t('sessions.types.FIRST_RETAKE_TITLE')
        case SessionTypeEnum.SECOND_RETAKE:
            return i18n.global.t('sessions.types.SECOND_RETAKE_TITLE')
        default:
            return ''
    }
})
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>
                    {{ isDownloadMode ? $t('sessions.document.dialogTitle') : $t('sessions.printDialog.title') }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        $t('sessions.printDialog.description', {
                            type: sessionTypeLabel,
                            group: group?.name,
                        })
                    }}
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-5 py-2">
                <!-- Row: Record number + Date -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <Label for="record-number">{{ $t('sessions.printDialog.recordNumber') }}</Label>
                        <Input
                            id="record-number"
                            v-model="form.recordNumber"
                            :placeholder="$t('sessions.printDialog.recordNumberPlaceholder')"
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="record-date">{{ $t('sessions.printDialog.date') }}</Label>
                        <Input
                            id="record-date"
                            v-model="form.date"
                            :placeholder="$t('sessions.printDialog.datePlaceholder')"
                        />
                    </div>
                </div>

                <!-- Subject -->
                <div class="space-y-1.5">
                    <Label for="subject">{{ $t('sessions.printDialog.subject') }}</Label>
                    <Input
                        id="subject"
                        v-model="form.subject"
                        :placeholder="$t('sessions.printDialog.subjectPlaceholder')"
                    />
                </div>

                <!-- Row: Form of Control + Semester + Total Hours -->
                <div class="grid grid-cols-3 gap-4">
                    <div class="space-y-1.5">
                        <Label>{{ $t('sessions.printDialog.formOfControl') }}</Label>
                        <Select v-model="form.formOfControl">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem :value="$t('sessions.printDialog.forms.exam')">
                                    {{ $t('sessions.printDialog.forms.exam') }}
                                </SelectItem>
                                <SelectItem :value="$t('sessions.printDialog.forms.credit')">
                                    {{ $t('sessions.printDialog.forms.credit') }}
                                </SelectItem>
                                <SelectItem :value="$t('sessions.printDialog.forms.diffCredit')">
                                    {{ $t('sessions.printDialog.forms.diffCreditShort') }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="semester">{{ $t('sessions.printDialog.semester') }}</Label>
                        <Input
                            id="semester"
                            v-model="form.semester"
                            :placeholder="$t('sessions.printDialog.semesterPlaceholder')"
                        />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="total-hours">{{ $t('sessions.printDialog.totalHours') }}</Label>
                        <Input
                            id="total-hours"
                            v-model="form.totalHours"
                            :placeholder="$t('sessions.printDialog.totalHoursPlaceholder')"
                            type="number"
                        />
                    </div>
                </div>

                <!-- Examiners -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <Label>{{ $t('sessions.printDialog.examiners') }}</Label>
                        <Button
                            v-if="isRetake"
                            variant="ghost"
                            size="sm"
                            class="h-7 text-xs gap-1"
                            @click="addExaminer"
                        >
                            <Plus class="w-3 h-3" /> {{ $t('sessions.printDialog.addExaminer') }}
                        </Button>
                    </div>

                    <div v-for="(_, index) in form.examiners" :key="index" class="relative flex items-center gap-2">
                        <div class="relative flex-1">
                            <Input
                                v-model="form.examiners[index]"
                                :placeholder="
                                    index === 0
                                        ? $t('sessions.printDialog.examinerPlaceholderMajor')
                                        : $t('sessions.printDialog.examinerPlaceholderMinor')
                                "
                                @input="
                                    ensureArrayLength(index);
                                    onExaminerInput(index);
                                "
                                @focus="
                                    ensureArrayLength(index);
                                    showSuggestions[index] = true;
                                "
                                @blur="onExaminerBlur(index)"
                            />
                            <!-- Autocomplete dropdown -->
                            <div
                                v-if="showSuggestions[index] && filteredSuggestions(index).length > 0"
                                class="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto"
                            >
                                <button
                                    v-for="suggestion in filteredSuggestions(index)"
                                    :key="suggestion"
                                    class="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                    @mousedown.prevent="selectSuggestion(index, suggestion)"
                                >
                                    {{ suggestion }}
                                </button>
                            </div>
                        </div>
                        <Button
                            v-if="isRetake && form.examiners.length > 1"
                            variant="ghost"
                            size="icon"
                            class="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                            @click="removeExaminer(index)"
                        >
                            <X class="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <!-- Practical teacher -->
                <div class="space-y-1.5">
                    <Label for="practical-teacher">{{ $t('sessions.printDialog.practicalTeacher') }}</Label>
                    <div class="relative">
                        <Input
                            id="practical-teacher"
                            v-model="form.practicalTeacher"
                            :placeholder="$t('sessions.printDialog.practicalTeacherPlaceholder')"
                            @input="
                                practicalTeacherTouched = true;
                                showPracticalSuggestions = true;
                            "
                            @focus="showPracticalSuggestions = true"
                            @blur="hidePracticalSuggestions()"
                        />
                        <div
                            v-if="showPracticalSuggestions && filteredPracticalSuggestions.length > 0"
                            class="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto"
                        >
                            <button
                                v-for="suggestion in filteredPracticalSuggestions"
                                :key="suggestion"
                                class="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                @mousedown.prevent="selectPracticalSuggestion(suggestion)"
                            >
                                {{ suggestion }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter class="gap-2">
                <Button variant="outline" @click="handleClose">
                    {{ $t('sessions.actions.cancel') }}
                </Button>
                <Button :disabled="!form.subject || !form.examiners[0]" @click="handleConfirm">
                    <Printer v-if="!isDownloadMode" class="w-4 h-4 mr-2" />
                    {{ isDownloadMode ? $t('sessions.document.generateButton') : $t('sessions.actions.print') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
