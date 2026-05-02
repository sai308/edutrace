<script setup lang="ts">
import type { MemberFormData, MemberFormErrors } from '@Members/services/members.service'
import type { Member } from '@Members/types/members'
import { ChevronDown, FileText, Save } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const props = withDefaults(defineProps<Props>(), {
    member: null,
    allGroups: () => [],
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'save', formData: MemberFormData): void
    (e: 'update:isOpen', value: boolean): void
}>()

const { t } = useI18n()

// ── Props & Emits ──────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean
    member?: Member | null
    allGroups?: string[]
}

// ── Local State ────────────────────────────────────────────────────────────────

const formData = ref<MemberFormData>({
    name: '',
    email: '',
    groupName: '',
    role: 'student',
    iep: '',
})

const errors = ref<MemberFormErrors>({ name: '', groupName: '' })

const showGroupSuggestions = ref(false)

// ── Watchers ───────────────────────────────────────────────────────────────────

watch(
    () => props.isOpen,
    (newVal) => {
        if (!newVal)
            return

        errors.value = { name: '', groupName: '' }
        showGroupSuggestions.value = false

        if (props.member) {
            formData.value = {
                name: props.member.name,
                email: props.member.email ?? '',
                groupName: props.member.groupName ?? '',
                role: props.member.role ?? 'student',
                iep: props.member.iep ?? '',
            }
        }
        else {
            formData.value = { name: '', email: '', groupName: '', role: 'student', iep: '' }
        }
    },
)

watch(
    () => formData.value.role,
    (newRole) => {
        if (newRole === 'teacher' || newRole === 'assistant') {
            formData.value.groupName = null
            formData.value.iep = ''
            errors.value.groupName = ''
        }
    },
)

// ── Computed ───────────────────────────────────────────────────────────────────

const isGroupDisabled = computed(() => formData.value.role === 'teacher' || formData.value.role === 'assistant')

const filteredGroups = computed<string[]>(() => {
    const query = formData.value.groupName?.toLowerCase() ?? ''
    return props.allGroups.filter(g => g.toLowerCase().includes(query))
})

// ── Handlers ───────────────────────────────────────────────────────────────────

function selectGroup(group: string): void {
    formData.value.groupName = group
    showGroupSuggestions.value = false
}

function validate(): boolean {
    errors.value = { name: '', groupName: '' }
    let isValid = true

    if (!formData.value.name.trim()) {
        errors.value.name = t('members.dialog.errors.nameRequired')
        isValid = false
    }

    if (!isGroupDisabled.value && (!formData.value.groupName || !formData.value.groupName.trim())) {
        errors.value.groupName = t('members.dialog.errors.groupRequired')
        isValid = false
    }

    return isValid
}

function handleSave(): void {
    if (!validate())
        return
    emit('save', { ...formData.value })
}

function handleBlur(type: 'group'): void {
    setTimeout(() => {
        if (type === 'group')
            showGroupSuggestions.value = false
    }, 200)
}

function handleOpenChange(val: boolean): void {
    emit('update:isOpen', val)
    if (!val)
        emit('close')
}
</script>

<template>
    <Dialog :open="isOpen" @update:open="handleOpenChange">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>
                    {{ member ? $t('members.dialog.edit') : $t('members.dialog.add') }}
                </DialogTitle>
                <DialogDescription>
                    {{ member ? $t('members.dialog.editDescription') : $t('members.dialog.addDescription') }}
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-4 py-4">
                <!-- Name -->
                <div class="grid gap-2">
                    <Label for="name" class="flex items-center">
                        {{ $t('members.dialog.nameLabel') }}
                        <span class="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                        id="name"
                        v-model="formData.name"
                        :placeholder="$t('members.dialog.namePlaceholder')"
                        :class="{ 'border-destructive': errors.name }"
                    />
                    <span v-if="errors.name" class="text-[0.8rem] text-destructive">{{ errors.name }}</span>
                </div>

                <!-- Email -->
                <div class="grid gap-2">
                    <Label for="email">{{ $t('members.dialog.emailLabel') }}</Label>
                    <Input
                        id="email"
                        v-model="formData.email"
                        :placeholder="$t('members.dialog.emailPlaceholder')"
                        type="email"
                    />
                </div>

                <!-- Role -->
                <div class="grid gap-2">
                    <Label for="role">{{ $t('members.dialog.roleLabel') }}</Label>
                    <Select
                        :model-value="formData.role"
                        @update:model-value="formData.role = $event as MemberFormData['role']"
                    >
                        <SelectTrigger>
                            <SelectValue :placeholder="$t('members.dialog.selectRole')" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="student">
                                    {{ $t('members.dialog.roleStudent') }}
                                </SelectItem>
                                <SelectItem value="teacher">
                                    {{ $t('members.dialog.roleTeacher') }}
                                </SelectItem>
                                <SelectItem value="assistant">
                                    {{ $t('members.dialog.roleAssistant') }}
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Group with Autocomplete -->
                <div class="grid gap-2 relative">
                    <Label for="group" class="flex items-center">
                        {{ $t('members.dialog.groupLabel') }}
                        <span class="text-destructive ml-1">*</span>
                    </Label>
                    <div class="relative">
                        <Input
                            id="group"
                            :model-value="formData.groupName ?? ''"
                            :placeholder="$t('members.dialog.groupPlaceholder')"
                            :class="{ 'border-destructive': errors.groupName }"
                            :disabled="isGroupDisabled"
                            @update:model-value="(val) => (formData.groupName = val as string)"
                            @focus="showGroupSuggestions = true"
                            @blur="handleBlur('group')"
                        />
                        <Button
                            v-if="allGroups.length > 0"
                            variant="ghost"
                            size="icon"
                            class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                            tabindex="-1"
                            :disabled="isGroupDisabled"
                            @mousedown.prevent="showGroupSuggestions = !showGroupSuggestions"
                        >
                            <ChevronDown class="w-4 h-4" />
                        </Button>
                    </div>
                    <span v-if="errors.groupName" class="text-[0.8rem] text-destructive">{{ errors.groupName }}</span>

                    <!-- Suggestions Dropdown -->
                    <div
                        v-if="showGroupSuggestions && filteredGroups.length > 0"
                        class="absolute top-[calc(100%+4px)] z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                        <div class="p-1 max-h-60 overflow-y-auto">
                            <div
                                v-for="group in filteredGroups"
                                :key="group"
                                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                                @click="selectGroup(group)"
                            >
                                {{ group }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- IEP (Only for Students) -->
                <div v-if="formData.role === 'student'" class="grid gap-2">
                    <Label for="iep" class="flex items-center">
                        <FileText class="w-4 h-4 mr-2" />
                        {{ $t('members.iep') }}
                    </Label>
                    <Textarea
                        id="iep"
                        v-model="formData.iep"
                        :placeholder="$t('members.iepPlaceholder')"
                        class="min-h-[100px] resize-none"
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleOpenChange(false)">
                    {{ $t('common.cancel') }}
                </Button>
                <Button type="submit" @click="handleSave">
                    <Save class="w-4 h-4 mr-2" />
                    {{ $t('common.save') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
