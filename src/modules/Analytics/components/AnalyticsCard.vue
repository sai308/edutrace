<script setup lang="ts">
import type { EnrichedStat } from '@Analytics/types/analytics'
import { Copy, Eye, MonitorPlay, QrCode, Timer, Users } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { logger } from '@/shared/lib/logger'
import { toast } from '@/shared/services/toast'

defineProps<Props>()

const emit = defineEmits<{
    (e: 'view-details', meetId: string): void
    (e: 'show-qr', meetId: string): void
}>()

const { t } = useI18n()

interface Props {
    stat: EnrichedStat
}

async function copyMeetId(meetId: string) {
    try {
        await navigator.clipboard.writeText(meetId)
        toast.success(t('analytics.toast.copySuccess'))
    } catch (e) {
        logger.error('Failed to copy:', e)
        toast.error(t('analytics.toast.copyError'))
    }
}
</script>

<template>
    <Item
        variant="outline"
        size="sm"
        class="group relative overflow-hidden transition-all hover:shadow-md"
    >
        <ItemContent class="gap-3">
            <!-- Top Row: Info & Actions -->
            <div class="flex items-start justify-between gap-4">
                <div class="flex flex-col min-w-0 gap-1">
                    <ItemTitle :title="$t('analytics.card.tooltips.groupName')">
                        {{ stat.displayName || stat.meetId }}
                    </ItemTitle>
                    <ItemDescription
                        class="flex items-center gap-1.5 text-xs"
                        :title="$t('analytics.card.tooltips.meetId')"
                    >
                        {{ stat.meetId }}
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            :title="$t('analytics.card.tooltips.copyMeetId')"
                            @click.stop="copyMeetId(stat.meetId)"
                        >
                            <Copy class="w-2.5 h-2.5" />
                        </Button>
                    </ItemDescription>
                </div>

                <ItemActions class="gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 rounded-full"
                        :title="$t('analytics.card.tooltips.showQr')"
                        @click.stop="emit('show-qr', stat.meetId)"
                    >
                        <QrCode class="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        class="h-7 w-7 rounded-full"
                        :title="$t('analytics.card.tooltips.viewDetails')"
                        @click.stop="emit('view-details', stat.meetId)"
                    >
                        <Eye class="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                </ItemActions>
            </div>

            <!-- Bottom Row: Stats & Attendance -->
            <div class="flex items-center justify-between pt-1">
                <!-- Compact Stats Row (Inline) -->
                <div class="flex items-center gap-4 text-muted-foreground">
                    <div
                        class="flex items-center gap-1.5"
                        :title="$t('analytics.card.tooltips.totalSessions')"
                    >
                        <MonitorPlay :size="16" />
                        <span class="text-xs font-medium text-foreground">{{
                            stat.totalSessions
                        }}</span>
                    </div>
                    <div
                        class="flex items-center gap-1.5"
                        :title="$t('analytics.card.tooltips.avgDuration')"
                    >
                        <Timer :size="16" />
                        <span class="text-xs font-medium text-foreground"
                            >~{{ stat.avgDuration.toFixed(0) }}{{ $t('duration.minutes') }}</span
                        >
                    </div>
                    <div
                        class="flex items-center gap-1.5"
                        :title="$t('analytics.card.tooltips.participants')"
                    >
                        <Users :size="16" />
                        <span class="text-xs font-medium text-foreground">
                            {{ stat.activeParticipantsCount
                            }}<span class="text-muted-foreground text-[10px]"
                                >/{{ stat.uniqueParticipantsCount }}</span
                            >
                        </span>
                    </div>
                </div>

                <Badge
                    class="cursor-help px-2 py-0 text-[10px] font-medium h-5"
                    :class="[
                        stat.attendancePercentage >= 75
                            ? 'bg-green-200 text-green-800 hover:bg-green-200/80 border-transparent'
                            : stat.attendancePercentage >= 50
                              ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200/80 border-transparent'
                              : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent',
                    ]"
                    variant="outline"
                    :title="$t('analytics.card.tooltips.attendance')"
                >
                    {{ stat.attendancePercentage }}%
                </Badge>
            </div>
        </ItemContent>
    </Item>
</template>
