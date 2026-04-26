<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export interface MarksFilters {
    synced: 'all' | 'unsynced'
    dateFrom: string
    hideFailed: boolean
}

const props = defineProps<{
    open: boolean
    filters: MarksFilters
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'apply', filters: MarksFilters): void
}>()

const { t } = useI18n()

const localFilters = ref<MarksFilters>({ ...props.filters })

watch(
    () => props.open,
    async (newVal) => {
        if (newVal) {
            const filters = { ...props.filters }
            localFilters.value = filters

            // Force update for Checkbox if it's true (shadcn/radix sync issue work-around)
            if (filters.hideFailed) {
                localFilters.value.hideFailed = false
                await nextTick()
                localFilters.value.hideFailed = true
            }
        }
    }
)

function handleOpenUpdate(val: boolean) {
    emit('update:open', val)
}

function apply() {
    emit('apply', { ...localFilters.value })
    handleOpenUpdate(false)
}

function clear() {
    localFilters.value = {
        synced: 'unsynced', // Default to unsynced as requested
        dateFrom: '',
        hideFailed: true,
    }
}
</script>

<template>
    <Sheet :open="open" @update:open="handleOpenUpdate">
        <SheetContent class="w-full max-w-[540px]">
            <SheetHeader>
                <SheetTitle>{{ t('marks.filterModal.title') }}</SheetTitle>
                <SheetDescription>
                    {{ t('marks.subtitle', { count: 0, total: 0 }).split('.')[0] }}
                </SheetDescription>
            </SheetHeader>

            <div class="grid gap-6 p-4">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Synced Status -->
                    <div class="space-y-3">
                        <Label class="text-base font-semibold">{{ t('marks.filterModal.status') }}</Label>
                        <RadioGroup v-model="localFilters.synced" class="flex flex-col gap-2">
                            <div class="flex items-center space-x-2">
                                <RadioGroupItem id="synced-all" value="all" />
                                <Label html-for="synced-all" class="font-normal cursor-pointer">{{
                                    t('marks.filterModal.all')
                                }}</Label>
                            </div>
                            <div class="flex items-center space-x-2">
                                <RadioGroupItem id="synced-unsynced" value="unsynced" />
                                <Label html-for="synced-unsynced" class="font-normal cursor-pointer">{{
                                    t('marks.filterModal.unsynced')
                                }}</Label>
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
                    <Checkbox id="hideFailed" v-model="localFilters.hideFailed" />
                    <Label
                        html-for="hideFailed"
                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        {{ t('marks.filterModal.hideFailed') }}
                    </Label>
                </div>
            </div>

            <SheetFooter class="flex justify-between flex-row gap-2 flex-wrap">
                <Button variant="ghost" @click="clear">
                    {{ t('marks.filterModal.reset') }}
                </Button>
                <div class="flex justify-between gap-4">
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
