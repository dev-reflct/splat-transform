// Remove Node.js imports and replace with browser-compatible alternatives
// import { FileHandle } from 'node:fs/promises';

import { DataTable } from '../data-table';

// Browser-compatible FileHandle interface
interface BrowserFileHandle {
    write: (data: string | Uint8Array) => Promise<void>;
    close: () => Promise<void>;
}

// Create a browser FileHandle for writing to memory
const createBrowserFileHandle = (): BrowserFileHandle => {
    const chunks: Uint8Array[] = [];

    return {
        write: (data: string | Uint8Array) => {
            if (typeof data === 'string') {
                const encoder = new TextEncoder();
                chunks.push(encoder.encode(data));
            } else {
                chunks.push(data);
            }
            return Promise.resolve();
        },
        close: async () => {
            // No-op for browser
        },
    };
};

const columnTypeToPlyType = (type: string): string => {
    switch (type) {
        case 'float32':
            return 'float';
        case 'float64':
            return 'double';
        case 'int8':
            return 'char';
        case 'uint8':
            return 'uchar';
        case 'int16':
            return 'short';
        case 'uint16':
            return 'ushort';
        case 'int32':
            return 'int';
        case 'uint32':
            return 'uint';
    }
};

type PlyData = {
    comments: string[];
    elements: {
        name: string;
        dataTable: DataTable;
    }[];
};

const writePly = async (fileHandle: BrowserFileHandle, plyData: PlyData) => {
    const header = [
        'ply',
        'format binary_little_endian 1.0',
        plyData.comments.map(c => `comment ${c}`),
        plyData.elements.map(element => {
            return [
                `element ${element.name} ${element.dataTable.numRows}`,
                element.dataTable.columns.map(column => {
                    return `property ${columnTypeToPlyType(column.dataType)} ${column.name}`;
                }),
            ];
        }),
        'end_header',
    ];

    // write the header
    await fileHandle.write(new TextEncoder().encode(`${header.flat(3).join('\n')}\n`));

    for (let i = 0; i < plyData.elements.length; ++i) {
        const table = plyData.elements[i].dataTable;
        const columns = table.columns;
        const buffers = columns.map(c => new Uint8Array(c.data.buffer));
        const sizes = columns.map(c => c.data.BYTES_PER_ELEMENT);
        const rowSize = sizes.reduce((total: number, size: number) => total + size, 0);

        // write to file in chunks of 1024 rows
        const chunkSize = 1024;
        const numChunks = Math.ceil(table.numRows / chunkSize);
        const chunkData = new Uint8Array(chunkSize * rowSize);

        for (let c = 0; c < numChunks; ++c) {
            const numRows = Math.min(chunkSize, table.numRows - c * chunkSize);

            let offset = 0;

            for (let r = 0; r < numRows; ++r) {
                const rowOffset = c * chunkSize + r;

                for (let p = 0; p < columns.length; ++p) {
                    const s = sizes[p];
                    chunkData.set(buffers[p].subarray(rowOffset * s, rowOffset * s + s), offset);
                    offset += s;
                }
            }

            // write the chunk
            await fileHandle.write(chunkData.subarray(0, offset));
        }
    }
};

export { writePly };
