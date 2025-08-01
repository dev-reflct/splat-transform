// Browser polyfills for Node.js modules
// This file provides browser-compatible versions of Node.js modules

// Buffer polyfill
export const Buffer = {
    from: (data: any) => new Uint8Array(data),
    alloc: (size: number) => new Uint8Array(size),
    allocUnsafe: (size: number) => new Uint8Array(size),
    allocUnsafeSlow: (size: number) => new Uint8Array(size),
    isBuffer: (obj: any) => obj instanceof Uint8Array,
    byteLength: (string: string, encoding?: string) => new TextEncoder().encode(string).length,
    concat: (list: Uint8Array[], totalLength?: number) => {
        const total = totalLength || list.reduce((acc, buf) => acc + buf.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        for (const buf of list) {
            result.set(buf, offset);
            offset += buf.length;
        }
        return result;
    },
    compare: (a: Uint8Array, b: Uint8Array) => {
        const minLength = Math.min(a.length, b.length);
        for (let i = 0; i < minLength; i++) {
            if (a[i] !== b[i]) {
                return a[i] - b[i];
            }
        }
        return a.length - b.length;
    },
    copy: (
        source: Uint8Array,
        target: Uint8Array,
        targetStart = 0,
        sourceStart = 0,
        sourceEnd = source.length
    ) => {
        const length = sourceEnd - sourceStart;
        target.set(source.subarray(sourceStart, sourceEnd), targetStart);
        return length;
    },
    fill: (buffer: Uint8Array, value: any, start = 0, end = buffer.length) => {
        for (let i = start; i < end; i++) {
            buffer[i] = value;
        }
        return buffer;
    },
    indexOf: (buffer: Uint8Array, value: any, byteOffset = 0, encoding?: string) => {
        return buffer.indexOf(value, byteOffset);
    },
    lastIndexOf: (
        buffer: Uint8Array,
        value: any,
        byteOffset = buffer.length,
        encoding?: string
    ) => {
        return buffer.lastIndexOf(value, byteOffset);
    },
    swap16: (buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i += 2) {
            const temp = buffer[i];
            buffer[i] = buffer[i + 1];
            buffer[i + 1] = temp;
        }
        return buffer;
    },
    swap32: (buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i += 4) {
            const temp = buffer[i];
            buffer[i] = buffer[i + 3];
            buffer[i + 3] = temp;
            const temp2 = buffer[i + 1];
            buffer[i + 1] = buffer[i + 2];
            buffer[i + 2] = temp2;
        }
        return buffer;
    },
    swap64: (buffer: Uint8Array) => {
        for (let i = 0; i < buffer.length; i += 8) {
            for (let j = 0; j < 4; j++) {
                const temp = buffer[i + j];
                buffer[i + j] = buffer[i + 7 - j];
                buffer[i + 7 - j] = temp;
            }
        }
        return buffer;
    },
    toBuffer: (buffer: Uint8Array) => buffer,
    toString: (buffer: Uint8Array, encoding = 'utf8', start = 0, end = buffer.length) => {
        return new TextDecoder(encoding).decode(buffer.subarray(start, end));
    },
    write: (
        buffer: Uint8Array,
        string: string,
        offset = 0,
        length = buffer.length - offset,
        encoding = 'utf8'
    ) => {
        const encoded = new TextEncoder().encode(string);
        const writeLength = Math.min(length, encoded.length);
        buffer.set(encoded.subarray(0, writeLength), offset);
        return writeLength;
    },
    writeUInt8: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = value;
        return offset + 1;
    },
    writeUInt16LE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = value & 0xff;
        buffer[offset + 1] = (value >> 8) & 0xff;
        return offset + 2;
    },
    writeUInt16BE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = (value >> 8) & 0xff;
        buffer[offset + 1] = value & 0xff;
        return offset + 2;
    },
    writeUInt32LE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = value & 0xff;
        buffer[offset + 1] = (value >> 8) & 0xff;
        buffer[offset + 2] = (value >> 16) & 0xff;
        buffer[offset + 3] = (value >> 24) & 0xff;
        return offset + 4;
    },
    writeUInt32BE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = (value >> 24) & 0xff;
        buffer[offset + 1] = (value >> 16) & 0xff;
        buffer[offset + 2] = (value >> 8) & 0xff;
        buffer[offset + 3] = value & 0xff;
        return offset + 4;
    },
    writeInt8: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = value & 0xff;
        return offset + 1;
    },
    writeInt16LE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = value & 0xff;
        buffer[offset + 1] = (value >> 8) & 0xff;
        return offset + 2;
    },
    writeInt16BE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = (value >> 8) & 0xff;
        buffer[offset + 1] = value & 0xff;
        return offset + 2;
    },
    writeInt32LE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = value & 0xff;
        buffer[offset + 1] = (value >> 8) & 0xff;
        buffer[offset + 2] = (value >> 16) & 0xff;
        buffer[offset + 3] = (value >> 24) & 0xff;
        return offset + 4;
    },
    writeInt32BE: (buffer: Uint8Array, value: number, offset = 0) => {
        buffer[offset] = (value >> 24) & 0xff;
        buffer[offset + 1] = (value >> 16) & 0xff;
        buffer[offset + 2] = (value >> 8) & 0xff;
        buffer[offset + 3] = value & 0xff;
        return offset + 4;
    },
    writeFloatLE: (buffer: Uint8Array, value: number, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
        view.setFloat32(0, value, true);
        return offset + 4;
    },
    writeFloatBE: (buffer: Uint8Array, value: number, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
        view.setFloat32(0, value, false);
        return offset + 4;
    },
    writeDoubleLE: (buffer: Uint8Array, value: number, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        view.setFloat64(0, value, true);
        return offset + 8;
    },
    writeDoubleBE: (buffer: Uint8Array, value: number, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        view.setFloat64(0, value, false);
        return offset + 8;
    },
    readUInt8: (buffer: Uint8Array, offset = 0) => {
        return buffer[offset];
    },
    readUInt16LE: (buffer: Uint8Array, offset = 0) => {
        return buffer[offset] | (buffer[offset + 1] << 8);
    },
    readUInt16BE: (buffer: Uint8Array, offset = 0) => {
        return (buffer[offset] << 8) | buffer[offset + 1];
    },
    readUInt32LE: (buffer: Uint8Array, offset = 0) => {
        return (
            buffer[offset] |
            (buffer[offset + 1] << 8) |
            (buffer[offset + 2] << 16) |
            (buffer[offset + 3] << 24)
        );
    },
    readUInt32BE: (buffer: Uint8Array, offset = 0) => {
        return (
            (buffer[offset] << 24) |
            (buffer[offset + 1] << 16) |
            (buffer[offset + 2] << 8) |
            buffer[offset + 3]
        );
    },
    readInt8: (buffer: Uint8Array, offset = 0) => {
        const value = buffer[offset];
        return value & 0x80 ? value - 0x100 : value;
    },
    readInt16LE: (buffer: Uint8Array, offset = 0) => {
        const value = buffer[offset] | (buffer[offset + 1] << 8);
        return value & 0x8000 ? value - 0x10000 : value;
    },
    readInt16BE: (buffer: Uint8Array, offset = 0) => {
        const value = (buffer[offset] << 8) | buffer[offset + 1];
        return value & 0x8000 ? value - 0x10000 : value;
    },
    readInt32LE: (buffer: Uint8Array, offset = 0) => {
        const value =
            buffer[offset] |
            (buffer[offset + 1] << 8) |
            (buffer[offset + 2] << 16) |
            (buffer[offset + 3] << 24);
        return value & 0x80000000 ? value - 0x100000000 : value;
    },
    readInt32BE: (buffer: Uint8Array, offset = 0) => {
        const value =
            (buffer[offset] << 24) |
            (buffer[offset + 1] << 16) |
            (buffer[offset + 2] << 8) |
            buffer[offset + 3];
        return value & 0x80000000 ? value - 0x100000000 : value;
    },
    readFloatLE: (buffer: Uint8Array, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
        return view.getFloat32(0, true);
    },
    readFloatBE: (buffer: Uint8Array, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
        return view.getFloat32(0, false);
    },
    readDoubleLE: (buffer: Uint8Array, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        return view.getFloat64(0, true);
    },
    readDoubleBE: (buffer: Uint8Array, offset = 0) => {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        return view.getFloat64(0, false);
    },
};

// Process polyfill
export const process = {
    platform: 'browser',
    env: {},
    nextTick: (callback: () => void) => setTimeout(callback, 0),
    stdout: {
        write: (data: string) => console.log(data),
    },
    stderr: {
        write: (data: string) => console.error(data),
    },
};

// Path polyfill
export const path = {
    resolve: (...args: string[]) => args.join('/'),
    join: (...args: string[]) => args.join('/'),
    extname: (path: string) => {
        const lastDot = path.lastIndexOf('.');
        return lastDot > 0 ? path.slice(lastDot) : '';
    },
    basename: (path: string, ext?: string) => {
        const name = path.split('/').pop() || '';
        return ext ? name.replace(new RegExp(`${ext}$`), '') : name;
    },
    dirname: (path: string) => {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/') || '.';
    },
};

// FileHandle polyfill
export interface FileHandle {
    read: (buffer: Uint8Array, offset: number, length: number) => Promise<{ bytesRead: number }>;
    write: (
        buffer: Uint8Array,
        offset: number,
        length: number
    ) => Promise<{ bytesWritten: number }>;
    close: () => Promise<void>;
}

// Worker polyfill
export const Worker = globalThis.Worker;

// Other Node.js module polyfills
export const fs = {
    promises: {
        readFile: async (path: string) => {
            const response = await fetch(path);
            return new Uint8Array(await response.arrayBuffer());
        },
        writeFile: async (path: string, data: Uint8Array) => {
            // Browser can't write files directly
            throw new Error('File writing not supported in browser');
        },
    },
};

export const util = {
    promisify:
        (fn: (...args: any[]) => void) =>
        (...args: any[]) =>
            new Promise((resolve, reject) => {
                fn(...args, (err: any, result: any) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            }),
};

export const stream = {
    Readable: class Readable {
        constructor() {}
    },
    Writable: class Writable {
        constructor() {}
    },
};

export const events = {
    EventEmitter: class EventEmitter {
        constructor() {}
    },
};

export const os = {
    platform: () => 'browser',
    homedir: () => '/',
};

export const crypto = {
    randomBytes: (size: number) => {
        const array = new Uint8Array(size);
        globalThis.crypto.getRandomValues(array);
        return array;
    },
};

export const url = {
    fileURLToPath: (url: string) => url.replace('file://', ''),
    pathToFileURL: (path: string) => `file://${path}`,
};

export const module = {
    createRequire: () => () => {},
};

export const http = {};
export const https = {};
export const net = {};
export const tls = {};
export const vm = {};
export const zlib = {};
export const assert = {};
export const child_process = {};
