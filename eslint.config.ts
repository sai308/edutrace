import antfu from '@antfu/eslint-config'

export default antfu({
    vue: true,
    typescript: true,
    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: false,
    },
    formatters: {
        css: true,
        html: true,
    },
    rules: {
        // Disallow raw console calls — use src/shared/lib/logger.ts
        'no-console': 'error',
        // Vue-specific relaxations
        'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
        // Vue composition API frequently references reactive state before its explicit declaration
        // (e.g. destructuring from a composable whose internals reference a ref defined later).
        'ts/no-use-before-define': 'off',
        // Event names are kebab-case throughout the codebase; renaming requires touching both
        // defineEmits and every template listener — out of scope for deployment prep.
        'vue/custom-event-name-casing': 'off',
        // Number.isNaN / Number.isFinite are equivalent to global versions in practice.
        'unicorn/prefer-number-properties': 'off',
        // comment-alignment with multiple spaces is intentional in ignores arrays
        'style/no-multi-spaces': 'off',
    },
    ignores: [
        'dist/**',
        'dev-dist/**',
        'public/**',
        'reports/**',
        'coverage/**',
        'src/workers/**',         // plain JS workers
        '**/*.md',
        '**/*.yaml',
        '**/*.yml',
        'tests/artifacts-gen/**', // screenshot utility scripts
        'scripts/**',             // Node.js dev scripts
        '*.mjs',                  // root-level Node.js utility scripts
    ],
})
