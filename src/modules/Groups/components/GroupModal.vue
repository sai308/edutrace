<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Save, ChevronDown } from 'lucide-vue-next';
import { settingsRepository } from '@/shared/services/settings.repository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const props = defineProps({
  isOpen: Boolean,
  group: {
    type: Object as () => any,
    default: null
  },
  allMeetIds: {
    type: Array as () => string[],
    default: () => []
  },
  allTeachers: {
    type: Array as () => string[],
    default: () => []
  }
});

const emit = defineEmits(['close', 'save', 'update:isOpen']);

const formData = ref({
  name: '',
  meetId: '',
  teacher: '',
  course: undefined as number | undefined
});

const defaultTeacher = ref('');

// Autocomplete states
const showMeetIdSuggestions = ref(false);
const showTeacherSuggestions = ref(false);

onMounted(async () => {
  const teacher = await settingsRepository.getDefaultTeacher();
  defaultTeacher.value = teacher || '';
});

// Initialize form when modal opens or group changes
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.group) {
      formData.value = { ...props.group };
      // Suggest course if missing for existing group
      if (!formData.value.course && formData.value.name) {
        suggestCourse(formData.value.name);
      }
    } else {
      formData.value = {
        name: '',
        meetId: '',
        teacher: defaultTeacher.value, // Pre-fill with default teacher
        course: undefined
      };
    }
    showMeetIdSuggestions.value = false;
    showTeacherSuggestions.value = false;
  }
});

// Auto-suggest course from name
watch(() => formData.value.name, (newName) => {
  if (!props.group && newName) { // Only auto-suggest for new groups or if explicit
    // Actually, let's suggest if course is empty, even for existing groups if user is editing name
    if (!formData.value.course) {
      suggestCourse(newName);
    }
  }
});

function suggestCourse(name: string) {
  const match = name.match(/\d/);
  if (match) {
    const course = parseInt(match[0], 10);
    if (course >= 1 && course <= 4) {
      formData.value.course = course;
    }
  }
}

// Filtered suggestions
const filteredMeetIds = computed(() => {
  const query = formData.value.meetId.toLowerCase();
  return props.allMeetIds.filter(id => id.toLowerCase().includes(query));
});

const filteredTeachers = computed(() => {
  const query = formData.value.teacher.toLowerCase();
  return props.allTeachers.filter(t => t.toLowerCase().includes(query));
});

function selectMeetId(id: string) {
  formData.value.meetId = id;
  showMeetIdSuggestions.value = false;
}

function selectTeacher(name: string) {
  formData.value.teacher = name;
  showTeacherSuggestions.value = false;
}

function handleSave() {
  emit('save', { ...formData.value });
}

// Close suggestions when clicking outside (simplified for now, can use v-click-outside if available or just blur with delay)
function handleBlur(type: 'meetId' | 'teacher') {
  // Small delay to allow click event on suggestion to fire
  setTimeout(() => {
    if (type === 'meetId') showMeetIdSuggestions.value = false;
    if (type === 'teacher') showTeacherSuggestions.value = false;
  }, 200);
}

function handlePaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text');
  if (!text) return;

  // Regex to match Google Meet IDs (xxx-xxxx-xxx)
  // It might be part of a URL like https://meet.google.com/abc-defg-hij
  // or just the ID itself.
  const match = text.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
  if (match) {
    event.preventDefault();
    formData.value.meetId = match[0];
  }
}

function handleOpenChange(val: boolean) {
  emit('update:isOpen', val);
  if (!val) {
    emit('close');
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ group ? $t('groups.modal.editTitle') : $t('groups.modal.addTitle') }}</DialogTitle>
        <DialogDescription>
          {{ group ? $t('groups.modal.editDescription', 'Update group details.') : $t('groups.modal.addDescription',
            'Add a new group.') }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Group Name -->
        <div class="grid gap-2">
          <Label for="name" class="flex items-center">
            {{ $t('groups.modal.name') }} <span class="text-destructive ml-1">*</span>
          </Label>
          <Input id="name" v-model="formData.name" :placeholder="$t('groups.modal.namePlaceholder')" autofocus />
        </div>

        <!-- Course -->
        <div class="grid gap-2">
          <Label for="course">{{ $t('groups.modal.course') }}</Label>
          <Input id="course" v-model.number="formData.course" type="number" min="1" max="4"
            :placeholder="$t('groups.modal.coursePlaceholder')" />
        </div>

        <!-- Meet ID with Autocomplete -->
        <div class="grid gap-2 relative">
          <Label for="meetId" class="flex items-center">
            {{ $t('groups.modal.meetId') }} <span class="text-destructive ml-1">*</span>
          </Label>
          <div class="relative">
            <Input id="meetId" v-model="formData.meetId" :placeholder="$t('groups.modal.meetIdPlaceholder')"
              @focus="showMeetIdSuggestions = true" @blur="handleBlur('meetId')" @paste="handlePaste" />
            <Button v-if="allMeetIds.length > 0" variant="ghost" size="icon"
              class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
              @click="showMeetIdSuggestions = !showMeetIdSuggestions" tabindex="-1">
              <ChevronDown class="w-4 h-4" />
            </Button>
          </div>

          <!-- Suggestions Dropdown -->
          <div v-if="showMeetIdSuggestions && filteredMeetIds.length > 0"
            class="absolute top-[calc(100%+4px)] z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            <div class="p-1 max-h-60 overflow-y-auto">
              <div v-for="id in filteredMeetIds" :key="id" @click="selectMeetId(id)"
                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50">
                {{ id }}
              </div>
            </div>
          </div>
        </div>

        <!-- Teacher Name with Autocomplete -->
        <div class="grid gap-2 relative">
          <Label for="teacher">{{ $t('groups.modal.teacher') }}</Label>
          <div class="relative">
            <Input id="teacher" v-model="formData.teacher" :placeholder="$t('groups.modal.teacherPlaceholder')"
              @focus="showTeacherSuggestions = true" @blur="handleBlur('teacher')" />
            <Button v-if="allTeachers.length > 0" variant="ghost" size="icon"
              class="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
              @click="showTeacherSuggestions = !showTeacherSuggestions" tabindex="-1">
              <ChevronDown class="w-4 h-4" />
            </Button>
          </div>

          <!-- Suggestions Dropdown -->
          <div v-if="showTeacherSuggestions && filteredTeachers.length > 0"
            class="absolute top-[calc(100%+4px)] z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            <div class="p-1 max-h-60 overflow-y-auto">
              <div v-for="teacher in filteredTeachers" :key="teacher" @click="selectTeacher(teacher)"
                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50">
                {{ teacher }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)">
          {{ $t('groups.modal.cancel') }}
        </Button>
        <Button type="submit" @click="handleSave">
          <Save class="w-4 h-4 mr-2" />
          {{ $t('groups.modal.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>