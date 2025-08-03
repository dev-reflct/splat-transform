// Browser polyfills for Node.js APIs

// Polyfill for node:process
export const stdout = {
    write: (text: string) => {
        // In browser, we can use console.log instead
        console.log(text);
    },
};

// Polyfill for node:worker_threads
export const Worker =
    globalThis.Worker ||
    class MockWorker {
        constructor() {
            throw new Error('Workers not supported in this environment');
        }
    };

// Polyfill for jsdom
export const JSDOM = class MockJSDOM {
    constructor() {
        throw new Error('JSDOM not available in browser environment');
    }
};

// Polyfill for node:fs/promises
export const FileHandle = class MockFileHandle {
    constructor() {
        throw new Error('FileHandle not available in browser environment');
    }
};

// Polyfill for Buffer
export const Buffer = {
    alloc: (size: number) => new Uint8Array(size),
    from: (data: any) => new Uint8Array(data),
};

// Polyfill for sharp (image processing library)
export const sharp = {
    // Mock implementation - in browser we'll use native APIs
    webp: () => ({
        toFile: () => Promise.resolve(),
    }),
};
