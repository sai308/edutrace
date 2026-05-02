<script setup lang="ts">
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-vue-next'
import { computed, useAttrs } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/utils'

defineOptions({
    inheritAttrs: false,
})

const props = defineProps({
    min: { type: [Number, String], default: -Infinity },
    max: { type: [Number, String], default: Infinity },
    step: { type: [Number, String], default: 1 },
    variant: {
        type: String,
        default: 'horizontal',
        validator: (value: string) => ['horizontal', 'vertical'].includes(value),
    },
    buttonClass: {
        type: String,
        default: 'w-10 h-10',
    },
})

const attrs = useAttrs()

const modelValue = defineModel({ type: Number, default: 0 })

const numMin = computed(() => Number(props.min))
const numMax = computed(() => Number(props.max))
const numStep = computed(() => Number(props.step))

// All attrs except class forwarded to <Input> so <Label for="id"> association works.
// class is handled separately via cn().
const inputAttrs = computed(() => {
    const { class: _class, ...rest } = attrs as Record<string, unknown>
    return rest
})

function increment() {
    if (modelValue.value < numMax.value) {
        modelValue.value += numStep.value
    }
}

function decrement() {
    if (modelValue.value > numMin.value) {
        modelValue.value -= numStep.value
    }
}

function clamp() {
    const val = Number(modelValue.value) || 0
    modelValue.value = Math.min(numMax.value, Math.max(numMin.value, val))
}
</script>

<template>
    <div v-if="variant === 'horizontal'" class="flex items-center space-x-2">
        <Button
            variant="outline"
            size="icon"
            :disabled="modelValue <= numMin"
            class="shrink-0 cursor-pointer"
            :class="[buttonClass]"
            @click="decrement"
        >
            <Minus class="w-4 h-4" />
        </Button>

        <Input
            v-bind="inputAttrs"
            v-model="modelValue"
            type="number"
            :min="numMin"
            :max="numMax"
            :step="numStep"
            :class="
                cn(
                    'text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    attrs.class as string,
                )
            "
            @change="clamp"
        />

        <Button
            variant="outline"
            size="icon"
            :disabled="modelValue >= numMax"
            class="shrink-0 cursor-pointer"
            :class="[buttonClass]"
            @click="increment"
        >
            <Plus class="w-4 h-4" />
        </Button>
    </div>

    <div v-else-if="variant === 'vertical'" class="relative flex items-center">
        <Input
            v-bind="inputAttrs"
            v-model="modelValue"
            type="number"
            :min="numMin"
            :max="numMax"
            :step="numStep"
            :class="
                cn(
                    'text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    attrs.class as string,
                )
            "
            @change="clamp"
        />

        <div class="absolute right-1 top-1 bottom-1 flex flex-col justify-between w-6">
            <Button
                variant="ghost"
                class="h-1/2 w-full p-0 rounded-b-none hover:bg-muted cursor-pointer"
                :disabled="modelValue >= numMax"
                @click="increment"
            >
                <ChevronUp class="w-2 h-2" />
            </Button>
            <Button
                variant="ghost"
                class="h-1/2 w-full p-0 rounded-t-none hover:bg-muted cursor-pointer"
                :disabled="modelValue <= numMin"
                @click="decrement"
            >
                <ChevronDown class="w-2 h-2" />
            </Button>
        </div>
    </div>
</template>
