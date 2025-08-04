import { dirname, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            exclude: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'ReflctApi',
            formats: ['es', 'cjs'],
            fileName: format => `index.${format === 'es' ? 'mjs' : 'js'}`,
        },
        rollupOptions: {
            external: ['playcanvas'],
            output: {
                globals: {
                    playcanvas: 'pc',
                },
            },
        },
        sourcemap: true,
        minify: true,
    },
    server: {
        port: 3000,
        open: true,
    },
    preview: {
        port: 3000,
    },
});
