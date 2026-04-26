import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { qrcode } from 'vite-plugin-qrcode'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// NODE_ENV is 'production' during `vite build`, 'development' during serve,
// and 'test' during vitest — equivalent to checking `command !== 'build'`.
// The callback form of defineConfig cannot be merged by vitest's mergeConfig.
// eslint-disable-next-line node/prefer-global/process
const isNotBuild = process.env.NODE_ENV !== 'production'

export default defineConfig({
    server: {
        host: true, // bind to 0.0.0.0 so phone on same Wi-Fi can connect
        watch: {
            ignored: ['./**/leankg.db', './**/leankg.db-journal', './**/tests/**/.*'],
        },
    },
    preview: {
        host: true,
    },
    plugins: [
        vue(),
        tailwindcss(),
        // serve-only tools — skipped during `pnpm build`
        ...(isNotBuild
            ? [
                // basicSSL(),   // self-signed HTTPS for local phone testing
                qrcode(), // prints QR code in terminal — scan from phone
            ]
            : []),
        VitePWA({
            registerType: 'prompt',
            // null = don't inject an auto-registration script; PwaUpdatePrompt.vue
            // uses useRegisterSW() which handles registration itself. Without this
            // the SW would be registered twice on every page load.
            injectRegister: null,
            includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
            manifest: {
                id: '/',
                name: 'EduTrace',
                short_name: 'EduTrace',
                description: 'Offline-first educational records — attendance, grades, groups',
                theme_color: '#09090b',
                background_color: '#09090b',
                display: 'standalone',
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/',
                icons: [
                    { src: 'favicon-96x96.png', sizes: '96x96', type: 'image/png' },
                    { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                    // 512 px serves both purposes: any = general use, maskable = adaptive icon on Android
                    { src: 'web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
                    { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
                ],
            },
            workbox: {
                // Precache all static build outputs
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                // Serve index.html for all navigation requests so Vue Router handles
                // every route offline (SPA fallback). Without this, any page refresh
                // or direct URL access while offline gets a network error because the
                // SW has no cached entry for the deep-linked URL.
                navigateFallback: '/index.html',
                // No runtime API caching needed — all data is in IndexedDB
            },
            // devOptions: { enabled: true } — not needed; use `pnpm build && pnpm preview` for PWA testing
        }),
    ],
    build: {
        // Emit <link rel="modulepreload"> for every static import of the entry point.
        // The polyfill covers Safari < 17 and any browser that fetches the HTML
        // directly (before the SW has cached it). This lets the browser fetch
        // vendor-vue, vendor-i18n, etc. in parallel with parsing main.ts rather
        // than waiting for each chunk to be discovered after its parent executes.
        modulePreload: { polyfill: true },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules'))
                        return

                    // Heavy chart library — only pulled in by analytics/profile pages
                    if (id.includes('@unovis'))
                        return 'vendor-charts'

                    // Heavy document libs — only pulled in by the documents section
                    if (
                        id.includes('docxtemplater')
                        || id.includes('pizzip')
                        || id.includes('docx-preview')
                    ) {
                        return 'vendor-docs'
                    }

                    // QR code — only used in the groups page
                    if (id.includes('qrcode'))
                        return 'vendor-qrcode'

                    // Core Vue ecosystem (always loaded)
                    if (
                        id.includes('/vue/')
                        || id.includes('/vue-router/')
                        || id.includes('/@vue/')
                    ) {
                        return 'vendor-vue'
                    }
                    if (id.includes('vue-i18n') || id.includes('@intlify'))
                        return 'vendor-i18n'

                    // Icons — split alphabetically so neither half exceeds the size limit
                    if (id.includes('lucide')) {
                        const match = id.match(/\/icons\/([a-z])/)
                        if (match && match[1] && match[1] < 'n')
                            return 'vendor-icons-1'
                        return 'vendor-icons-2'
                    }

                    // Headless UI primitives
                    if (id.includes('reka-ui'))
                        return 'vendor-ui'

                    // Utility libraries
                    if (id.includes('@vueuse/'))
                        return 'vendor-vueuse'
                    if (id.includes('date-fns'))
                        return 'vendor-date'
                    if (id.includes('@tanstack'))
                        return 'vendor-table'

                    // Anything else from node_modules goes into a shared vendor chunk
                    return 'vendor'
                },
            },
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@Analytics': path.resolve(__dirname, './src/modules/Analytics'),
            '@Groups': path.resolve(__dirname, './src/modules/Groups'),
            '@Marks': path.resolve(__dirname, './src/modules/Marks'),
            '@Reports': path.resolve(__dirname, './src/modules/Reports'),
            '@Members': path.resolve(__dirname, './src/modules/Members'),
            '@Students': path.resolve(__dirname, './src/modules/Students'),
            '@Summary': path.resolve(__dirname, './src/modules/Summary'),
            '@Tasks': path.resolve(__dirname, './src/modules/Tasks'),
            '@Units': path.resolve(__dirname, './src/modules/Units'),
            '@Sessions': path.resolve(__dirname, './src/modules/Sessions'),
            '@Plans': path.resolve(__dirname, './src/modules/Plans'),
        },
    },
})
