<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Calendar } from 'lucide-vue-next';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const props = defineProps<{
    isOpen: boolean;
    groups: any[];
    filters: {
        synced: 'all' | 'unsynced';
        dateFrom: string;
        group: string | null;
        hideFailed: boolean;
    };
}>();

const emit = defineEmits(['update:isOpen', 'apply']);

const { t } = useI18n();

const localFilters = ref({ ...props.filters });

// Map null group to '_all' for the Select component
const groupValue = computed({
    get: () => localFilters.value.group || '_all',
    set: (val: string) => {
        localFilters.value.group = val === '_all' ? null : val;
    }
});

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        localFilters.value = { ...props.filters };
    }
});

function handleOpenUpdate(val: boolean) {
    emit('update:isOpen', val);
}

function apply() {
    emit('apply', { ...localFilters.value });
    handleOpenUpdate(false);
}

function clear() {
    localFilters.value = {
        synced: 'all',
        dateFrom: '',
        group: null,
        hideFailed: false
    };
}
</script>

<template>
    <Sheet :open="isOpen" @update:open="handleOpenUpdate">
        <SheetContent class="w-[400px] sm:w-[540px]">
            <SheetHeader>
                <SheetTitle>{{ t('marks.filterModal.title') }}</SheetTitle>
                <SheetDescription>
                    {{ t('marks.subtitle', { count: 0, total: 0 }).split('.')[0] }}
                </SheetDescription>
            </SheetHeader>

            <div class="grid gap-6 p-4">
                <!-- Group Filter -->
                <div class="space-y-2">
                    <Label class="text-base font-semibold">{{ t('marks.table.group') }}</Label>
                    <Select v-model="groupValue">
                        <SelectTrigger class="w-full">
                            <SelectValue :placeholder="t('marks.filterModal.allGroups')" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="_all">
                                    {{ t('marks.filterModal.allGroups') }}
                                </SelectItem>
                                <SelectItem v-for="group in groups" :key="group.id" :value="group.name">
                                    {{ group.name }}
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Synced Status -->
                    <div class="space-y-3">
                        <Label class="text-base font-semibold">{{ t('marks.filterModal.status') }}</Label>
                        <RadioGroup v-model="localFilters.synced" class="flex flex-col gap-2">
                            <div class="flex items-center space-x-2">
                                <RadioGroupItem id="synced-all" value="all" />
                                <Label htmlFor="synced-all" class="font-normal cursor-pointer">{{
                                    t('marks.filterModal.all')
                                    }}</Label>
                            </div>
                            <div class="flex items-center space-x-2">
                                <RadioGroupItem id="synced-unsynced" value="unsynced" />
                                <Label htmlFor="synced-unsynced" class="font-normal cursor-pointer">{{
                                    t('marks.filterModal.unsynced') }}</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <!-- Date From -->
                    <div class="space-y-3">
                        <Label class="text-base font-semibold">{{ t('marks.filterModal.dateFrom') }}</Label>
                        <div class="relative">
                            <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input v-model="localFilters.dateFrom" type="date" class="pl-9" />
                        </div>
                    </div>
                </div>

                <!-- Hide Failed Grades -->
                <div class="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox id="hideFailed" :checked="localFilters.hideFailed"
                        @update:checked="(v: boolean) => localFilters.hideFailed = v" />
                    <Label htmlFor="hideFailed"
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {{ t('marks.filterModal.hideFailed') }}
                    </Label>
                </div>
            </div>

            <SheetFooter class="flex sm:justify-between flex-row gap-2">
                <Button variant="ghost" @click="clear">
                    {{ t('marks.filterModal.reset') }}
                </Button>
                <div class="flex gap-2">
                    <Button variant="outline" @click="handleOpenUpdate(false)">
                        {{ t('marks.filterModal.cancel') }}
                    </Button>
                    <Button @click="apply">
                        {{ t('marks.filterModal.apply') }}
                    </Button>
                </div>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
