<script setup lang="ts">
import type { SessionEntry } from '../../models/session.model'
import { AlertTriangle, UserX } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

defineProps<{
    open: boolean
    stats: {
        A: number
        B: number
        C: number
        D: number
        E: number
        FX: number
        F: number
        absent: number
    }
    absentStudents: SessionEntry[]
}>()

const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
    (e: 'confirm'): void
}>()

function handleClose() {
    emit('update:open', false)
}

function handleConfirm() {
    emit('confirm')
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-[450px]">
            <DialogHeader>
                <DialogTitle>{{ $t('sessions.closeDialog.title') }}</DialogTitle>
                <DialogDescription>
                    {{ $t('sessions.closeDialog.description') }}
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-6 py-4">
                <!-- Short Stats Widget -->
                <div
                    class="flex items-center gap-3 text-xs bg-muted/50 border px-4 py-2 rounded-lg shadow-sm justify-center"
                >
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-green-600 dark:text-green-400">A</span
                        ><span :class="stats.A === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.A
                        }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-semibold text-emerald-500 dark:text-emerald-400">B</span
                        ><span :class="stats.B === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.B
                        }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-semibold text-yellow-600 dark:text-yellow-500">C</span
                        ><span :class="stats.C === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.C
                        }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-medium text-orange-500 dark:text-orange-400">D</span
                        ><span :class="stats.D === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.D
                        }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-medium text-orange-600 dark:text-orange-500">E</span
                        ><span :class="stats.E === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.E
                        }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-red-500 dark:text-red-400">FX</span
                        ><span :class="stats.FX === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.FX
                        }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <span class="font-bold text-red-600 dark:text-red-500">F</span
                        ><span :class="stats.F === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.F
                        }}</span>
                    </div>
                    <div class="w-px h-6 bg-border mx-1" />
                    <div class="flex flex-col items-center">
                        <span class="text-muted-foreground flex items-center gap-1">
                            <UserX class="w-3 h-3 opacity-60" /> {{ $t('sessions.grades.absent') }}
                        </span>
                        <span :class="stats.absent === 0 ? 'opacity-30' : 'font-medium'">{{
                            stats.absent
                        }}</span>
                    </div>
                </div>

                <!-- Absent Students List -->
                <div v-if="absentStudents.length > 0" class="space-y-3">
                    <div class="flex items-center gap-2 text-sm font-medium text-destructive">
                        <AlertTriangle class="w-4 h-4" />
                        {{ $t('sessions.closeDialog.absentWarning') }}
                    </div>
                    <ScrollArea class="h-[120px] rounded-md border p-3 bg-muted/20">
                        <ul class="space-y-2 text-sm">
                            <li
                                v-for="student in absentStudents"
                                :key="student.studentId"
                                class="flex items-center gap-2 text-muted-foreground"
                            >
                                <UserX class="w-3 h-3" />
                                {{ student.studentSnapshot.fullName }}
                            </li>
                        </ul>
                    </ScrollArea>
                </div>
                <div v-else class="text-sm text-muted-foreground flex items-center gap-2">
                    {{ $t('sessions.closeDialog.allGraded') }}
                </div>
            </div>

            <DialogFooter class="sm:justify-between items-center sm:items-center">
                <Button variant="outline" @click="handleClose">
                    {{ $t('sessions.actions.cancel') }}
                </Button>
                <Button variant="destructive" @click="handleConfirm">
                    {{ $t('sessions.actions.closeAndFix') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
