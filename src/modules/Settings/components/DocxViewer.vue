<script setup lang="ts">
import { renderAsync } from 'docx-preview'
import { AlertCircle, Loader2, Maximize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { logger } from '@/shared/lib/logger'

const props = defineProps<{
    documentBlob: Blob | null
}>()

const container = ref<HTMLElement | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Scaling logic
const scale = ref(1)
const SCALE_STEP = 0.1
const MIN_SCALE = 0.5
const MAX_SCALE = 2.0

function zoomIn() {
    if (scale.value < MAX_SCALE) scale.value = Number((scale.value + SCALE_STEP).toFixed(1))
}

function zoomOut() {
    if (scale.value > MIN_SCALE) scale.value = Number((scale.value - SCALE_STEP).toFixed(1))
}

function resetZoom() {
    scale.value = 1
}

const wrapperStyle = computed(() => ({
    transform: `scale(${scale.value})`,
    transformOrigin: 'top center',
    transition: 'transform 0.2s ease-in-out',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
}))

async function renderDocument() {
    if (!container.value) return

    if (!props.documentBlob) {
        container.value.innerHTML = ''
        return
    }

    isLoading.value = true
    error.value = null

    try {
        await renderAsync(props.documentBlob, container.value, undefined, {
            className: 'docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: false,
            renderChanges: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            debug: false,
        })
    } catch (err) {
        logger.error('Failed to render docx', err)
        error.value = 'Failed to render document. It may be corrupted or unsupported.'
    } finally {
        isLoading.value = false
    }
}

watch(
    () => props.documentBlob,
    () => {
        renderDocument()
    },
)

onMounted(() => {
    renderDocument()
})

onUnmounted(() => {
    if (container.value) {
        container.value.innerHTML = ''
    }
})
</script>

<template>
    <div
        class="relative w-full h-full min-h-[400px] border rounded-md bg-muted/20 overflow-hidden flex flex-col"
    >
        <!-- Toolbar -->
        <div
            class="flex items-center justify-between p-2 border-b bg-background sticky top-0 z-20 shadow-sm shrink-0"
        >
            <div class="text-sm font-medium px-2 flex items-center gap-2">
                Document Viewer
                <Badge variant="secondary" class="font-mono text-[10px] hidden sm:inline-flex">
                    A4 Layout
                </Badge>
            </div>

            <TooltipProvider>
                <div class="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8"
                                aria-label="Zoom out"
                                :disabled="scale <= MIN_SCALE"
                                @click="zoomOut"
                            >
                                <ZoomOut class="w-4 h-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom Out</TooltipContent>
                    </Tooltip>

                    <span class="text-xs font-mono w-12 text-center select-none"
                        >{{ Math.round(scale * 100) }}%</span
                    >

                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8"
                                aria-label="Zoom in"
                                :disabled="scale >= MAX_SCALE"
                                @click="zoomIn"
                            >
                                <ZoomIn class="w-4 h-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zoom In</TooltipContent>
                    </Tooltip>

                    <div class="w-px h-4 bg-border mx-1" />

                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8"
                                aria-label="Reset zoom"
                                @click="resetZoom"
                            >
                                <RotateCcw class="w-4 h-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset Zoom</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger as-child>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8"
                                aria-label="Fit page"
                                @click="scale = 1.2"
                            >
                                <Maximize class="w-4 h-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Fit Page</TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        </div>

        <!-- Main Content Area -->
        <div class="relative flex-1 w-full h-full overflow-auto bg-[#f0f2f5] custom-scrollbar">
            <!-- Loading State -->
            <div
                v-if="isLoading"
                class="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 gap-4"
            >
                <Loader2 class="w-8 h-8 animate-spin text-primary" />
                <p class="text-sm text-muted-foreground animate-pulse">Rendering document...</p>
            </div>

            <!-- Error State -->
            <div
                v-if="error"
                class="absolute inset-0 flex flex-col items-center justify-center bg-destructive/5 text-destructive z-10 p-6 text-center gap-3"
            >
                <AlertCircle class="w-10 h-10 mb-2 opacity-80" />
                <p class="font-medium">
                    {{ error }}
                </p>
                <p class="text-xs opacity-70">
                    Try downloading the file and opening it in a desktop application.
                </p>
            </div>

            <!-- Empty State -->
            <div
                v-if="!documentBlob && !isLoading && !error"
                class="absolute inset-0 flex items-center justify-center text-muted-foreground z-10"
            >
                <p>No document loaded</p>
            </div>

            <!-- Document Container -->
            <div :style="wrapperStyle" class="min-h-full pb-12 pt-6">
                <!-- A4 scale container -->
                <div ref="container" class="text-black docx-wrapper-container" />
            </div>
        </div>
    </div>
</template>

<style>
/* Reset basic styles for the docx-preview wrapper to prevent it from conflicting with our app UI */
.docx-wrapper-container .docx-wrapper {
    background: transparent !important;
    padding: 0 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.docx-wrapper-container .docx {
    box-shadow:
        0 10px 15px -3px rgb(0 0 0 / 0.1),
        0 4px 6px -4px rgb(0 0 0 / 0.1);
    margin: 0 auto 16px auto !important;
    border-radius: 2px;
    background: white;
}
</style>
