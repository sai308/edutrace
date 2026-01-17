import path from 'node:path'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@Analytics': path.resolve(__dirname, './src/modules/Analytics'),
      '@Groups': path.resolve(__dirname, './src/modules/Groups'),
      '@Marks': path.resolve(__dirname, './src/modules/Marks'),
      '@Reports': path.resolve(__dirname, './src/modules/Reports'),
      '@Students': path.resolve(__dirname, './src/modules/Students'),
      '@Summary': path.resolve(__dirname, './src/modules/Summary'),
    },
  },
})
