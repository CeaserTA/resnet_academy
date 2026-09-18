import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': __dirname + 'src',
        },
    },
    server: {
        host: '127.0.0.1',
        port: 3000,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        pool: 'threads',
        // e2e/ holds Playwright specs, which import @playwright/test and cannot run under
        // vitest — without this they are collected and reported as failures on every run.
        exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    },
});
