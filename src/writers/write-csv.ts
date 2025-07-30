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

const writeCsv = async (fileHandle: BrowserFileHandle, dataTable: DataTable) => {
    const len = dataTable.numRows;

    // write header
    await fileHandle.write(`${dataTable.columnNames.join(',')}\n`);

    const columns = dataTable.columns.map(c => c.data);

    // write rows
    for (let i = 0; i < len; ++i) {
        let row = '';
        for (let c = 0; c < dataTable.columns.length; ++c) {
            if (c) row += ',';
            row += columns[c][i];
        }
        await fileHandle.write(`${row}\n`);
    }
};

export { writeCsv };
