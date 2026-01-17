import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom', // gives you window, localStorage, etc.
            globals: true,
            setupFiles: [
                './tests/setup.ts',
            ],
            restoreMocks: true,
            clearMocks: true,
            mockReset: true,
        },
    })
);
