import { dirname, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SplatTransform',
            fileName: 'splat-transform',
            formats: ['es', 'umd'],
        },
        rollupOptions: {
            external: ['playcanvas'],
            output: {
                globals: {
                    playcanvas: 'pc',
                },
            },
        },
        target: 'es2020',
        sourcemap: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'node:buffer': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:fs/promises': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:path': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:process': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:worker_threads': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:util': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:stream': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:events': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:os': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:crypto': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:url': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:module': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:http': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:https': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:net': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:tls': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:vm': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:zlib': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:assert': resolve(__dirname, 'src/browser-polyfills.ts'),
            'node:child_process': resolve(__dirname, 'src/browser-polyfills.ts'),
            fs: resolve(__dirname, 'src/browser-polyfills.ts'),
            path: resolve(__dirname, 'src/browser-polyfills.ts'),
            util: resolve(__dirname, 'src/browser-polyfills.ts'),
            stream: resolve(__dirname, 'src/browser-polyfills.ts'),
            events: resolve(__dirname, 'src/browser-polyfills.ts'),
            os: resolve(__dirname, 'src/browser-polyfills.ts'),
            crypto: resolve(__dirname, 'src/browser-polyfills.ts'),
            url: resolve(__dirname, 'src/browser-polyfills.ts'),
            module: resolve(__dirname, 'src/browser-polyfills.ts'),
            http: resolve(__dirname, 'src/browser-polyfills.ts'),
            https: resolve(__dirname, 'src/browser-polyfills.ts'),
            net: resolve(__dirname, 'src/browser-polyfills.ts'),
            tls: resolve(__dirname, 'src/browser-polyfills.ts'),
            vm: resolve(__dirname, 'src/browser-polyfills.ts'),
            zlib: resolve(__dirname, 'src/browser-polyfills.ts'),
            assert: resolve(__dirname, 'src/browser-polyfills.ts'),
            child_process: resolve(__dirname, 'src/browser-polyfills.ts'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    preview: {
        port: 3000,
    },
});
