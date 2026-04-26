<script setup lang="ts">
import type { Meet } from '@Analytics/types/analytics'
import { calculateMeetDuration } from '@Reports/utils/duration'
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import ParticipantsListDataTable from '../components/ParticipantsList/DataTable.vue'

const props = defineProps<{
    meet: Meet
}>()

const totalDuration = computed(() => calculateMeetDuration(props.meet))
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>{{ $t('reports.session.participantsTitle') }}</CardTitle>
            <CardDescription>{{ $t('reports.session.participantsDesc') }}</CardDescription>
        </CardHeader>
        <CardContent>
            <ParticipantsListDataTable
                :participants="meet.participants"
                :total-duration="totalDuration"
            />
        </CardContent>
    </Card>
</template>
