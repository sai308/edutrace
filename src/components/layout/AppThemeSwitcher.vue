<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { Moon, Sun } from 'lucide-vue-next'
import { nextTick, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const mode = useColorMode()
const spinning = ref(false)

// Guard against simultaneous transitions (rapid tapping on mobile)
let transitioning = false

async function toggleTheme(event: MouseEvent) {
    if (transitioning) return

    const isAppearanceTransition =
        'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!isAppearanceTransition) {
        spinning.value = true
        setTimeout(() => {
            spinning.value = false
        }, 500)
        mode.value = mode.value === 'dark' ? 'light' : 'dark'
        return
    }

    transitioning = true
    spinning.value = true
    setTimeout(() => {
        spinning.value = false
    }, 500)

    const x = event.clientX
    const y = event.clientY
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    const transition = document.startViewTransition(async () => {
        mode.value = mode.value === 'dark' ? 'light' : 'dark'
        await nextTick()
    })

    // style.css z-index rules control which pseudo-element is in front:
    //   now dark  → old (light) is z-index 9999 → shrink it away via ::view-transition-old
    //   now light → new (light) is z-index 9999 → expand it in  via ::view-transition-new
    // mode.value is read AFTER the toggle so the z-index selectors already match.
    transition.ready.then(() => {
        const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
        document.documentElement.animate(
            { clipPath: mode.value === 'dark' ? [...clipPath].reverse() : clipPath },
            {
                duration: 400,
                easing: 'ease-in-out',
                fill: 'forwards',
                pseudoElement: mode.value === 'dark' ? '::view-transition-old(root)' : '::view-transition-new(root)',
            }
        )
    })

    transition.finished.finally(() => {
        transitioning = false
    })
}
</script>

<template>
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger as-child>
                <Button
                    variant="ghost"
                    size="icon"
                    class="relative overflow-hidden w-9 h-9 rounded-full transition-transform duration-500"
                    :class="{ 'rotate-[360deg]': spinning }"
                    @click="toggleTheme"
                >
                    <Sun
                        class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
                    />
                    <Moon
                        class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
                    />
                    <span class="sr-only">Toggle theme</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Toggle theme</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
</template>
