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
        pool: 'forks',
        forkOptions: {
            // Worker startup on Windows with many imports can exceed the default 60s.
            execTimeout: 120_000,
        },
    },
});
