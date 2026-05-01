<script setup lang="ts">
import type { Group } from '@Groups/types/groups'
import { Calendar, ChevronDown  } from 'lucide-vue-next'
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export interface MarksFilters {
    synced: 'all' | 'unsynced'
    dateFrom: string
    hideFailed: boolean
    group: string | null
}

const props = defineProps<{
    open: boolean
    filters: MarksFilters
    groups?: Group[]
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
    },
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
        synced: 'unsynced',
        dateFrom: '',
        hideFailed: true,
        group: null,
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
                <!-- Group Selector -->
                <div v-if="groups && groups.length > 0" class="space-y-3">
                    <Label class="text-base font-semibold">{{ t('marks.table.group') }}</Label>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button variant="outline" class="w-full justify-between gap-1 font-normal">
                                <span class="truncate">{{ localFilters.group || t('marks.filterModal.allGroups') }}</span>
                                <ChevronDown class="h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                            <DropdownMenuItem
                                :class="!localFilters.group ? 'bg-primary/15 text-primary font-medium' : ''"
                                @click="localFilters.group = null"
                            >
                                {{ t('marks.filterModal.allGroups') }}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                v-for="group in groups"
                                :key="group.id"
                                :class="localFilters.group === group.name ? 'bg-primary/15 text-primary font-medium' : ''"
                                @click="localFilters.group = group.name"
                            >
                                {{ group.name }}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

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
