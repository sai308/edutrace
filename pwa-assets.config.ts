import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
    preset: {
        ...minimalPreset,
        maskable: {
            sizes: [512],
            padding: 0.1, // safe zone = central 80%; 0.3 made content too small for Android masks
            resizeOptions: { background: '#09090b' },
        },
        apple: {
            sizes: [180],
            padding: 0, // SVG already has correct proportions; iOS clips to squircle on its own
            resizeOptions: { background: '#09090b' },
        },
    },
    images: ['public/favicon.svg'],
})
