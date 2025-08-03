import { PlyData } from '../readers/read-ply';

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

/**
 * Write PLY data to an ArrayBuffer
 * @param plyData - The PLY data to write
 * @returns ArrayBuffer containing the PLY data
 */
export const writePlyToBuffer = (plyData: PlyData): ArrayBuffer => {
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

    // calculate total size
    let totalSize = 0;
    const headerText = `${header.flat(3).join('\n')}\n`;
    totalSize += new TextEncoder().encode(headerText).length;

    for (let i = 0; i < plyData.elements.length; ++i) {
        const table = plyData.elements[i].dataTable;
        const columns = table.columns;
        const sizes = columns.map(c => c.data.BYTES_PER_ELEMENT);
        const rowSize = sizes.reduce((total, size) => total + size, 0);
        totalSize += table.numRows * rowSize;
    }

    // create buffer
    const buffer = new ArrayBuffer(totalSize);
    const uint8Array = new Uint8Array(buffer);
    let offset = 0;

    // write the header
    const headerBytes = new TextEncoder().encode(headerText);
    uint8Array.set(headerBytes, offset);
    offset += headerBytes.length;

    // write the data
    for (let i = 0; i < plyData.elements.length; ++i) {
        const table = plyData.elements[i].dataTable;
        const columns = table.columns;
        const buffers = columns.map(c => new Uint8Array(c.data.buffer));
        const sizes = columns.map(c => c.data.BYTES_PER_ELEMENT);
        const rowSize = sizes.reduce((total, size) => total + size, 0);

        // write to buffer in chunks of 1024 rows
        const chunkSize = 1024;
        const numChunks = Math.ceil(table.numRows / chunkSize);
        const chunkData = new Uint8Array(chunkSize * rowSize);

        for (let c = 0; c < numChunks; ++c) {
            const numRows = Math.min(chunkSize, table.numRows - c * chunkSize);

            let chunkOffset = 0;

            for (let r = 0; r < numRows; ++r) {
                const rowOffset = c * chunkSize + r;

                for (let p = 0; p < columns.length; ++p) {
                    const s = sizes[p];
                    chunkData.set(
                        buffers[p].subarray(rowOffset * s, rowOffset * s + s),
                        chunkOffset
                    );
                    chunkOffset += s;
                }
            }

            // write the chunk
            uint8Array.set(chunkData.subarray(0, chunkOffset), offset);
            offset += chunkOffset;
        }
    }

    return buffer;
};

/**
 * Write PLY data to a Blob
 * @param plyData - The PLY data to write
 * @returns Blob containing the PLY data
 */
export const writePlyToBlob = (plyData: PlyData): Blob => {
    const buffer = writePlyToBuffer(plyData);
    return new Blob([buffer], { type: 'application/octet-stream' });
};

// Legacy function for backward compatibility
export const writePly = async (fileHandle: any, plyData: PlyData): Promise<void> => {
    if (fileHandle instanceof File) {
        throw new Error('Cannot write to File object');
    }
    throw new Error('Unsupported file handle type');
};
