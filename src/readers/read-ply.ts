import { Column, DataTable } from '../data-table';

type PlyProperty = {
    name: string; // 'x', f_dc_0', etc
    type: string; // 'float', 'char', etc
};

type PlyElement = {
    name: string; // 'vertex', etc
    count: number;
    properties: PlyProperty[];
};

type PlyHeader = {
    comments: string[];
    elements: PlyElement[];
};

export type PlyData = {
    comments: string[];
    elements: {
        name: string;
        dataTable: DataTable;
    }[];
};

const getDataType = (type: string) => {
    switch (type) {
        case 'char':
            return Int8Array;
        case 'uchar':
            return Uint8Array;
        case 'short':
            return Int16Array;
        case 'ushort':
            return Uint16Array;
        case 'int':
            return Int32Array;
        case 'uint':
            return Uint32Array;
        case 'float':
            return Float32Array;
        case 'double':
            return Float64Array;
        default:
            return null;
    }
};

// parse the ply header text and return an array of Element structures and a
// string containing the ply format
const parseHeader = (data: Uint8Array): PlyHeader => {
    // decode header and split into lines
    const strings = new TextDecoder('ascii')
        .decode(data)
        .split('\n')
        .filter(line => line);

    const elements: PlyElement[] = [];
    const comments: string[] = [];
    let element;
    for (let i = 1; i < strings.length; ++i) {
        const words = strings[i].split(' ');

        switch (words[0]) {
            case 'ply':
            case 'format':
            case 'end_header':
                // skip
                break;
            case 'comment':
                comments.push(strings[i].substring(8)); // skip 'comment '
                break;
            case 'element': {
                if (words.length !== 3) {
                    throw new Error('invalid ply header');
                }
                element = {
                    name: words[1],
                    count: parseInt(words[2], 10),
                    properties: [],
                };
                elements.push(element);
                break;
            }
            case 'property': {
                if (!element || words.length !== 3 || !getDataType(words[1])) {
                    throw new Error('invalid ply header');
                }
                element.properties.push({
                    name: words[2],
                    type: words[1],
                });
                break;
            }
            default: {
                throw new Error(`unrecognized header value '${words[0]}' in ply header`);
            }
        }
    }

    return { comments, elements };
};

const cmp = (a: Uint8Array, b: Uint8Array, aOffset = 0) => {
    for (let i = 0; i < b.length; ++i) {
        if (a[aOffset + i] !== b[i]) {
            return false;
        }
    }
    return true;
};

const magicBytes = new Uint8Array([112, 108, 121, 10]); // ply\n
const endHeaderBytes = new Uint8Array([10, 101, 110, 100, 95, 104, 101, 97, 100, 101, 114, 10]); // \nend_header\n

/**
 * Parse PLY header from text
 * @param headerText - The header text to parse
 * @returns Parsed header information
 */
const parseHeaderFromText = (headerText: string): PlyHeader => {
    const lines = headerText.split('\n').filter(line => line.trim());
    const comments: string[] = [];
    const elements: PlyElement[] = [];

    let currentElement: PlyElement | null = null;

    for (const line of lines) {
        const words = line.trim().split(/\s+/);

        switch (words[0]) {
            case 'ply':
            case 'format':
            case 'end_header':
                // Skip these lines
                break;

            case 'comment':
                comments.push(line.substring(8)); // Skip 'comment '
                break;

            case 'element': {
                if (words.length !== 3) {
                    throw new Error('Invalid PLY header: element line');
                }
                currentElement = {
                    name: words[1],
                    count: parseInt(words[2], 10),
                    properties: [],
                };
                elements.push(currentElement);
                break;
            }

            case 'property': {
                if (!currentElement || words.length !== 3 || !getDataType(words[1])) {
                    throw new Error('Invalid PLY header: property line');
                }
                currentElement.properties.push({
                    name: words[2],
                    type: words[1],
                });
                break;
            }

            default: {
                throw new Error(`Unrecognized header value '${words[0]}' in PLY header`);
            }
        }
    }

    return { comments, elements };
};

/**
 * Read PLY data from an ArrayBuffer
 * @param buffer - The ArrayBuffer containing PLY data
 * @returns Promise that resolves to PlyData
 */
export const readPlyFromBuffer = async (buffer: ArrayBuffer): Promise<PlyData> => {
    const data = new Uint8Array(buffer);

    // Check for PLY magic number
    if (data.length < 4 || !cmp(data, magicBytes, 0)) {
        throw new Error('Invalid PLY file: missing magic number');
    }

    // Find the end of the header
    let headerEnd = -1;
    for (let i = 0; i < data.length - endHeaderBytes.length; i++) {
        if (cmp(data, endHeaderBytes, i)) {
            headerEnd = i + endHeaderBytes.length;
            break;
        }
    }

    if (headerEnd === -1) {
        throw new Error('Invalid PLY file: missing end_header');
    }

    // Parse the header
    const headerText = new TextDecoder().decode(data.subarray(0, headerEnd));
    const header = parseHeaderFromText(headerText);

    // Create a data table for each ply element
    const elements = [];
    let dataOffset = headerEnd;

    for (let i = 0; i < header.elements.length; ++i) {
        const element = header.elements[i];

        const columns = element.properties.map(property => {
            return new Column(property.name, new (getDataType(property.type))(element.count));
        });

        const buffers = columns.map(column => new Uint8Array(column.data.buffer));
        const sizes = columns.map(column => column.data.BYTES_PER_ELEMENT);
        const rowSize = sizes.reduce((total, size) => total + size, 0);

        // Read data in chunks of 1024 rows at a time
        const chunkSize = 1024;
        const numChunks = Math.ceil(element.count / chunkSize);
        const chunkData = new Uint8Array(chunkSize * rowSize);

        for (let c = 0; c < numChunks; ++c) {
            const numRows = Math.min(chunkSize, element.count - c * chunkSize);
            const chunkBytes = rowSize * numRows;

            // Copy chunk data from the buffer
            if (dataOffset + chunkBytes > data.length) {
                throw new Error('Unexpected end of file while reading PLY data');
            }

            chunkData.set(data.subarray(dataOffset, dataOffset + chunkBytes));
            dataOffset += chunkBytes;

            let offset = 0;

            // Process data row at a time
            for (let r = 0; r < numRows; ++r) {
                const rowOffset = c * chunkSize + r;

                // Copy into column data
                for (let p = 0; p < columns.length; ++p) {
                    const s = sizes[p];
                    buffers[p].set(chunkData.subarray(offset, offset + s), rowOffset * s);
                    offset += s;
                }
            }
        }

        elements.push({
            name: element.name,
            dataTable: new DataTable(columns),
        });
    }

    return {
        comments: header.comments,
        elements,
    };
};

/**
 * Read PLY data from a File object
 * @param file - The File object containing PLY data
 * @returns Promise that resolves to PlyData
 */
export const readPlyFromFile = async (file: File): Promise<PlyData> => {
    const buffer = await file.arrayBuffer();
    return readPlyFromBuffer(buffer);
};
