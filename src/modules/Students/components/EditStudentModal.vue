<script setup>
import { ref, watch, computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const props = defineProps({
  isOpen: Boolean,
  student: Object,
  allGroups: Array
});

const emit = defineEmits(['close', 'save']);

const dialogOpen = computed({
  get: () => props.isOpen,
  set: (val) => {
    if (!val) emit('close');
  }
});

const formData = ref({
  name: '',
  groupName: '',
  email: ''
});

watch(() => props.student, (newVal) => {
  if (newVal) {
    formData.value = {
      name: newVal.name || '',
      groupName: newVal.groupName || '',
      email: newVal.email || ''
    };
  }
}, { immediate: true });

function save() {
  emit('save', { ...formData.value });
}
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ $t('students.editModal.title') }}</DialogTitle>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="name">{{ $t('students.editModal.name') }}</Label>
          <Input id="name" v-model="formData.name" :placeholder="$t('students.editModal.name')" />
        </div>

        <div class="grid gap-2">
          <Label for="groupName">{{ $t('students.editModal.groups') }}</Label>
          <div class="relative">
            <Input id="groupName" v-model="formData.groupName" list="group-suggestions"
              :placeholder="$t('students.editModal.groups')" autocomplete="off" />
            <datalist id="group-suggestions">
              <option v-for="g in allGroups" :key="g" :value="g">{{ g }}</option>
            </datalist>
          </div>
          <p class="text-[0.8rem] text-muted-foreground" v-if="allGroups.length > 0">
            {{ $t('students.editModal.groupHint') }}
          </p>
        </div>

        <div class="grid gap-2">
          <Label for="email">{{ $t('students.editModal.email') }}</Label>
          <Input id="email" v-model="formData.email" type="email"
            :placeholder="$t('students.editModal.emailPlaceholder')" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="dialogOpen = false">
          {{ $t('students.editModal.cancel') }}
        </Button>
        <Button @click="save">
          {{ $t('students.editModal.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
