<script setup lang="ts">
import SessionTabItem from '@Sessions/components/SessionTabItem.vue'
import { useSessionsPage } from '@Sessions/composables/useSessionsPage'
import { SessionStatusEnum, SessionTypeEnum } from '@Sessions/models/session.model'
import { Check, FileText, Layers, RotateCcw, Users } from 'lucide-vue-next'
import { computed, markRaw, onMounted } from 'vue'

import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Stepper,
    StepperIndicator,
    StepperItem,
    StepperSeparator,
    StepperTitle,
    StepperTrigger,
} from '@/components/ui/stepper'
import EmptyState from '@/shared/components/EmptyState.vue'

const router = useRouter()

const {
    groups,
    selectedGroupId,
    isInitializing,
    isSyncing,
    mainSession,
    firstRetakeSession,
    secondRetakeSession,
    activeTab,
    currentGroup,
    isStepperLinear,
    handleCreateMainSession,
    handleCreateFirstRetake,
    handleCreateSecondRetake,
    handleSessionClosed,
    handleSyncSession,
    initialize,
} = useSessionsPage()

const steps = [
    { step: 1, title: 'sessions.types.MAIN', value: SessionTypeEnum.MAIN, icon: markRaw(FileText) },
    {
        step: 2,
        title: 'sessions.types.FIRST_RETAKE',
        value: SessionTypeEnum.FIRST_RETAKE,
        icon: markRaw(RotateCcw),
    },
    {
        step: 3,
        title: 'sessions.types.SECOND_RETAKE',
        value: SessionTypeEnum.SECOND_RETAKE,
        icon: markRaw(Users),
    },
]

const stepIndex = computed({
    get: () => {
        if (activeTab.value === SessionTypeEnum.SECOND_RETAKE) return 3
        if (activeTab.value === SessionTypeEnum.FIRST_RETAKE) return 2
        return 1
    },
    set: (val) => {
        if (val === 1) activeTab.value = SessionTypeEnum.MAIN
        else if (val === 2) activeTab.value = SessionTypeEnum.FIRST_RETAKE
        else if (val === 3) activeTab.value = SessionTypeEnum.SECOND_RETAKE
    },
})

onMounted(() => initialize())
</script>

<template>
    <div
        class="h-full flex-1 flex flex-col space-y-4 p-4 md:p-6 pt-2 md:flex max-w-[1400px] mx-auto w-full min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
        <!-- Zone 1: Page header — always visible -->
        <div
            class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-4 shrink-0"
        >
            <div>
                <h1 class="text-2xl font-bold tracking-tight">
                    {{ $t('sessions.title') }}
                </h1>
                <p class="text-sm text-muted-foreground mt-0.5">
                    {{ $t('sessions.description') }}
                </p>
            </div>
            <div v-if="groups.length > 0" class="w-full sm:w-auto flex justify-center">
                <Select v-model="selectedGroupId" class="w-full sm:w-[200px]">
                    <SelectTrigger class="w-[200px] sm:w-[200px] mx-auto sm:mx-0">
                        <SelectValue :placeholder="$t('sessions.selectGroup')" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="group in groups"
                            :key="group.id"
                            :value="group.id!.toString()"
                        >
                            {{ group.name }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <template v-if="groups.length > 0">
            <!-- No group selected yet — lightweight placeholder, group selector in header is the action -->
            <EmptyState
                v-if="!selectedGroupId"
                :title="$t('sessions.noGroupSelected')"
                class="border-dashed bg-card/50"
            />

            <div v-else class="flex-1 min-h-0 w-full flex flex-col space-y-4">
                <Stepper
                    v-model="stepIndex"
                    :linear="isStepperLinear"
                    class="flex flex-col md:flex-row w-full items-start md:items-center gap-6 md:gap-2 mb-8 md:mb-12 px-1 shrink-0"
                >
                    <StepperItem
                        v-for="step in steps"
                        :key="step.step"
                        v-slot="{ state }"
                        class="relative flex w-full flex-row md:flex-col items-center gap-4 md:gap-0 md:justify-center md:-space-y-4"
                        :step="step.step"
                    >
                        <StepperSeparator
                            v-if="step.step !== steps.length"
                            class="absolute left-5 top-[calc(100%+4px)] block h-6 w-0.5 md:left-[calc(50%+20px)] md:right-[calc(-50%+10px)] md:top-5 md:h-0.5 md:w-auto shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
                        />

                        <StepperTrigger as-child>
                            <Button
                                :variant="
                                    state === 'completed' || state === 'active'
                                        ? 'default'
                                        : 'outline'
                                "
                                size="icon"
                                class="z-10 rounded-full shrink-0 transition-all data-[state=active]:ring-2 data-[state=active]:ring-ring data-[state=active]:ring-offset-2 data-[state=active]:ring-offset-background"
                            >
                                <StepperIndicator>
                                    <Check v-if="state === 'completed'" class="size-4" />
                                    <component :is="step.icon" v-else class="size-4" />
                                </StepperIndicator>
                            </Button>
                        </StepperTrigger>

                        <div
                            class="md:mt-5 flex flex-col items-start md:items-center text-left md:text-center"
                        >
                            <StepperTitle
                                :class="[state === 'active' && 'text-primary']"
                                class="text-sm font-semibold transition lg:text-base md:mt-4 whitespace-nowrap"
                            >
                                {{ $t(step.title) }}
                            </StepperTitle>
                        </div>
                    </StepperItem>
                </Stepper>

                <div class="pt-4 flex flex-col flex-1 min-h-0">
                    <template v-if="activeTab === SessionTypeEnum.MAIN">
                        <Card v-if="!mainSession">
                            <CardHeader>
                                <CardTitle>{{ $t('sessions.types.MAIN') }}</CardTitle>
                                <CardDescription>
                                    {{ $t('sessions.notCreated.main') }}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button :disabled="isInitializing" @click="handleCreateMainSession">
                                    {{ $t('sessions.actions.generateMain') }}
                                </Button>
                            </CardContent>
                        </Card>
                        <SessionTabItem
                            v-else
                            :session="mainSession"
                            :is-syncing="isSyncing"
                            :group="currentGroup"
                            @closed="handleSessionClosed"
                            @sync="handleSyncSession"
                        />
                    </template>

                    <template v-else-if="activeTab === SessionTypeEnum.FIRST_RETAKE">
                        <Card
                            v-if="!mainSession || mainSession.status !== SessionStatusEnum.CLOSED"
                        >
                            <CardContent class="pt-6 text-center text-muted-foreground">
                                {{ $t('sessions.notAvailable.firstRetake') }}
                            </CardContent>
                        </Card>
                        <Card v-else-if="!firstRetakeSession">
                            <CardHeader>
                                <CardTitle>{{ $t('sessions.types.FIRST_RETAKE_TITLE') }}</CardTitle>
                                <CardDescription>
                                    {{ $t('sessions.notCreated.firstRetake') }}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button :disabled="isInitializing" @click="handleCreateFirstRetake">
                                    {{ $t('sessions.actions.generateFirstRetake') }}
                                </Button>
                            </CardContent>
                        </Card>
                        <SessionTabItem
                            v-else
                            :session="firstRetakeSession"
                            :is-syncing="isSyncing"
                            :group="currentGroup"
                            :reference-entries="mainSession?.entries"
                            @closed="handleSessionClosed"
                            @sync="handleSyncSession"
                        />
                    </template>

                    <template v-else-if="activeTab === SessionTypeEnum.SECOND_RETAKE">
                        <Card
                            v-if="
                                !firstRetakeSession ||
                                firstRetakeSession.status !== SessionStatusEnum.CLOSED
                            "
                        >
                            <CardContent class="pt-6 text-center text-muted-foreground">
                                {{ $t('sessions.notAvailable.secondRetake') }}
                            </CardContent>
                        </Card>
                        <Card v-else-if="!secondRetakeSession">
                            <CardHeader>
                                <CardTitle>
                                    {{ $t('sessions.types.SECOND_RETAKE_TITLE') }}
                                </CardTitle>
                                <CardDescription>
                                    {{ $t('sessions.notCreated.secondRetake') }}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    :disabled="isInitializing"
                                    @click="handleCreateSecondRetake"
                                >
                                    {{ $t('sessions.actions.generateSecondRetake') }}
                                </Button>
                            </CardContent>
                        </Card>
                        <SessionTabItem
                            v-else
                            :session="secondRetakeSession"
                            :is-syncing="isSyncing"
                            :group="currentGroup"
                            :reference-entries="mainSession?.entries"
                            @closed="handleSessionClosed"
                            @sync="handleSyncSession"
                        />
                    </template>
                </div>
            </div>
        </template>
        <EmptyState
            v-else
            :title="$t('sessions.noGroups')"
            :description="$t('sessions.noGroupsDescription')"
            :icon="Layers"
            class="min-h-[400px]"
            learn-more-url="#"
        >
            <Button class="mt-4 gap-2" @click="router.push({ name: 'Groups' })">
                <Users class="w-4 h-4" />
                {{ $t('nav.groups') }}
            </Button>
        </EmptyState>
    </div>
</template>
