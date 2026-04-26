<script setup lang="ts">
import type { Group, GroupFormData } from '@Groups/types/groups'
import { GOOGLE_MEET_ID_PATTERN } from '@Groups/constants/groups.constants'
import { suggestCourseFromName } from '@Groups/services/groups.service'
import { ChevronDown, Save } from 'lucide-vue-next'
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
import { settingsRepository } from '@/shared/services/settings.repository'

interface Props {
    open: boolean
    group?: Group | null
    allMeetIds?: string[]
    allTeachers?: string[]
    suggestedMeetIds?: string[]
    error?: string | null
    showSkip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    group: null,
    allMeetIds: () => [],
    allTeachers: () => [],
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'save', formData: GroupFormData): void
    (e: 'skip'): void
    (e: 'update:open', value: boolean): void
}>()

const formData = ref<GroupFormData>({
    name: '',
    meetId: '',
    teacher: '',
    course: undefined,
})

const defaultTeacher = ref('')

const showMeetIdSuggestions = ref(false)
const showTeacherSuggestions = ref(false)

onMounted(async () => {
    const teacher = await settingsRepository.getDefaultTeacher()
    defaultTeacher.value = teacher || ''
})

watch(
    () => props.open,
    (newVal) => {
        if (newVal) {
            if (props.group) {
                formData.value = { ...props.group }
                if (!formData.value.meetId) {
                    formData.value.meetId = props.suggestedMeetIds?.[0] ?? ''
                }
                if (!formData.value.course && formData.value.name) {
                    formData.value.course = suggestCourseFromName(formData.value.name)
                }
            }
            else {
                formData.value = {
                    name: '',
                    meetId: props.suggestedMeetIds?.[0] ?? '',
                    teacher: defaultTeacher.value,
                    course: undefined,
                }
            }
            showMeetIdSuggestions.value = false
            showTeacherSuggestions.value = false
        }
    },
)

// Auto-suggest course from name when course is not yet set
watch(
    () => formData.value.name,
    (newName) => {
        if (newName && !formData.value.course) {
            formData.value.course = suggestCourseFromName(newName)
        }
    },
)

const filteredSuggested = computed(() => {
    if (!props.suggestedMeetIds?.length)
        return []
    const query = formData.value.meetId.toLowerCase()
    return props.suggestedMeetIds.filter(id => id.toLowerCase().includes(query))
})

const filteredMeetIds = computed(() => {
    const suggestedSet = new Set(props.suggestedMeetIds ?? [])
    const query = formData.value.meetId.toLowerCase()
    return props.allMeetIds.filter(id => !suggestedSet.has(id) && id.toLowerCase().includes(query))
})

const hasAnyMeetIds = computed(() => (props.allMeetIds?.length ?? 0) > 0 || (props.suggestedMeetIds?.length ?? 0) > 0)

const meetIdInvalid = computed(() => {
    const id = (formData.value.meetId ?? '').trim()
    return id.length > 0 && !GOOGLE_MEET_ID_PATTERN.test(id)
})

const filteredTeachers = computed(() => {
    const query = (formData.value.teacher ?? '').toLowerCase()
    return props.allTeachers.filter(t => t.toLowerCase().includes(query))
})

function selectMeetId(id: string): void {
    formData.value.meetId = id
    showMeetIdSuggestions.value = false
}

function selectTeacher(name: string): void {
    formData.value.teacher = name
    showTeacherSuggestions.value = false
}

function handleSave(): void {
    emit('save', { ...formData.value })
}

// Small delay lets the click event on a suggestion item fire before the input loses focus
function handleBlur(type: 'meetId' | 'teacher'): void {
    setTimeout(() => {
        if (type === 'meetId')
            showMeetIdSuggestions.value = false
        if (type === 'teacher')
            showTeacherSuggestions.value = false
    }, 200)
}

function handlePaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text')
    if (!text)
        return
    const match = text.match(GOOGLE_MEET_ID_PATTERN)
    if (match) {
        event.preventDefault()
        formData.value.meetId = match[0]
    }
}

function handleOpenChange(val: boolean): void {
    emit('update:open', val)
    if (!val)
        emit('close')
}
</script>

<template>
    <Dialog :open="open" @update:open="handleOpenChange">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>
                    {{ group ? $t('groups.modal.editTitle') : $t('groups.modal.addTitle') }}
                </DialogTitle>
                <DialogDescription>
                    {{
                        group
                            ? $t('groups.modal.editDescription', 'Update group details.')
                            : $t('groups.modal.addDescription', 'Add a new group.')
                    }}
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-4 py-4">
                <!-- Group Name -->
                <div class="grid gap-2">
                    <Label for="name" class="flex items-center">
                        {{ $t('groups.modal.name') }} <span class="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                        id="name"
                        v-model="formData.name"
                        :placeholder="$t('groups.modal.namePlaceholder')"
                        autofocus
                    />
                </div>

                <!-- Course -->
                <div class="grid gap-2">
                    <Label for="course">{{ $t('groups.modal.course') }}</Label>
                    <Input
                        id="course"
                        v-model.number="formData.course"
                        type="number"
                        min="1"
                        max="4"
                        :placeholder="$t('groups.modal.coursePlaceholder')"
                    />
                </div>

                <!-- Meet ID with Autocomplete -->
                <div class="grid gap-2 relative">
                    <Label for="meetId" class="flex items-center">
                        {{ $t('groups.modal.meetId') }} <span class="text-destructive ml-1">*</span>
                    </Label>
                    <div class="relative">
                        <Input
                            id="meetId"
                            v-model="formData.meetId"
                            :placeholder="$t('groups.modal.meetIdPlaceholder')"
                            :class="{
                                'border-destructive focus-visible:ring-destructive/30': meetIdInvalid,
                            }"
                            @focus="showMeetIdSuggestions = true"
                            @blur="handleBlur('meetId')"
                            @paste="handlePaste"
                        />
                        <Button
                            v-if="hasAnyMeetIds"
                            variant="ghost"
                            size="icon"
                            class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                            tabindex="-1"
                            aria-hidden="true"
                            @mousedown.prevent
                            @click="showMeetIdSuggestions = !showMeetIdSuggestions"
                        >
                            <ChevronDown class="w-4 h-4" />
                        </Button>
                    </div>

                    <p v-if="meetIdInvalid" class="text-xs text-destructive mt-1">
                        {{ $t('groups.modal.meetIdInvalid') }}
                    </p>

                    <div
                        v-if="showMeetIdSuggestions && (filteredSuggested.length > 0 || filteredMeetIds.length > 0)"
                        class="absolute top-[calc(100%+4px)] z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                        <div class="p-1 max-h-60 overflow-y-auto">
                            <template v-if="filteredSuggested.length > 0">
                                <div class="px-2 py-1 text-xs font-medium text-muted-foreground select-none">
                                    {{ $t('groups.modal.meetIdSuggested') }}
                                </div>
                                <div
                                    v-for="id in filteredSuggested"
                                    :key="`s-${id}`"
                                    class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    @mousedown.prevent
                                    @click="selectMeetId(id)"
                                >
                                    {{ id }}
                                </div>
                                <div v-if="filteredMeetIds.length > 0" class="my-1 border-t border-border" />
                            </template>
                            <div
                                v-for="id in filteredMeetIds"
                                :key="id"
                                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                @mousedown.prevent
                                @click="selectMeetId(id)"
                            >
                                {{ id }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Teacher Name with Autocomplete -->
                <div class="grid gap-2 relative">
                    <Label for="teacher">{{ $t('groups.modal.teacher') }}</Label>
                    <div class="relative">
                        <Input
                            id="teacher"
                            v-model="formData.teacher"
                            :placeholder="$t('groups.modal.teacherPlaceholder')"
                            @focus="showTeacherSuggestions = true"
                            @blur="handleBlur('teacher')"
                        />
                        <Button
                            v-if="allTeachers.length > 0"
                            variant="ghost"
                            size="icon"
                            class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                            tabindex="-1"
                            aria-hidden="true"
                            @mousedown.prevent
                            @click="showTeacherSuggestions = !showTeacherSuggestions"
                        >
                            <ChevronDown class="w-4 h-4" />
                        </Button>
                    </div>

                    <div
                        v-if="showTeacherSuggestions && filteredTeachers.length > 0"
                        class="absolute top-[calc(100%+4px)] z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                        <div class="p-1 max-h-60 overflow-y-auto">
                            <div
                                v-for="teacher in filteredTeachers"
                                :key="teacher"
                                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                @mousedown.prevent
                                @click="selectTeacher(teacher)"
                            >
                                {{ teacher }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <p v-if="error" class="text-sm text-destructive -mt-2">
                {{ error === 'duplicate' ? $t('groups.modal.errorDuplicate') : $t('groups.modal.errorGeneric') }}
            </p>

            <DialogFooter>
                <Button v-if="showSkip" variant="ghost" class="w-full sm:w-auto sm:mr-auto" @click="emit('skip')">
                    {{ $t('groups.modal.skip') }}
                </Button>
                <Button variant="outline" @click="handleOpenChange(false)">
                    {{ $t('groups.modal.cancel') }}
                </Button>
                <Button type="submit" :disabled="meetIdInvalid" @click="handleSave">
                    <Save class="w-4 h-4 mr-2" />
                    {{ $t('groups.modal.save') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
