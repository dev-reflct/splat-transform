import { Vec3 } from 'playcanvas';

import { Column, DataTable, TypedArray } from './data-table';
import { ProcessAction, process } from './process';
import { readKsplat } from './readers/read-ksplat';
import { readPly } from './readers/read-ply';
import { readSplat } from './readers/read-splat';
import { writeCompressedPly } from './writers/write-compressed-ply';
import { writeCsv } from './writers/write-csv';
import { writePly } from './writers/write-ply';
import { writeSogs } from './writers/write-sogs';

// Core data processing functions
export { process } from './process';
export { DataTable, Column } from './data-table';

// Reader functions
export { readPly } from './readers/read-ply';
export { readSplat } from './readers/read-splat';
export { readKsplat } from './readers/read-ksplat';

// Writer functions
export { writePly } from './writers/write-ply';
export { writeCompressedPly } from './writers/write-compressed-ply';
export { writeCsv } from './writers/write-csv';
export { writeSogs } from './writers/write-sogs';

// Re-export Vec3 for convenience
export { Vec3 } from 'playcanvas';

// Web-specific functions
export const readFileFromWeb = async (file: File) => {
    const lowerFilename = file.name.toLowerCase();
    let fileData;

    // Convert File to FileHandle-like interface for compatibility
    const fileHandle = {
        read: async (buffer: Uint8Array) => {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            buffer.set(uint8Array);
            return arrayBuffer.byteLength;
        },
        close: async () => {},
    };

    if (lowerFilename.endsWith('.ksplat')) {
        fileData = await readKsplat(file);
    } else if (lowerFilename.endsWith('.splat')) {
        fileData = await readSplat(file);
    } else if (lowerFilename.endsWith('.ply')) {
        fileData = await readPly(file);
    } else {
        throw new Error(`Unsupported input file type: ${file.name}`);
    }

    return fileData;
};

export const writeFileToWeb = async (
    dataTable: DataTable,
    format: string,
    filename: string,
    options: {
        iterations?: number;
        gpu?: boolean;
    } = {}
) => {
    const iterations = options.iterations ?? 10;
    const gpuMode = options.gpu ? 'gpu' : 'cpu';

    // Handle SOGS format specially since it returns a structured result
    if (format === 'json') {
        const sogsResult = await writeSogs(dataTable, iterations, gpuMode);
        return {
            format: 'sogs',
            meta: sogsResult.meta,
            files: sogsResult.files,
        };
    }

    // Create a virtual file handle that writes to memory for other formats
    const chunks: Uint8Array[] = [];
    const virtualFileHandle = {
        write: (data: Uint8Array) => {
            chunks.push(new Uint8Array(data));
        },
        close: async () => {},
    };

    switch (format) {
        case 'csv':
            await writeCsv(virtualFileHandle as any, dataTable);
            break;
        case 'compressed-ply':
            await writeCompressedPly(virtualFileHandle as any, dataTable);
            break;
        case 'ply':
            await writePly(virtualFileHandle as any, {
                comments: [],
                elements: [{ name: 'vertex', dataTable }],
            });
            break;
        default:
            throw new Error(`Unsupported output format: ${format}`);
    }

    // Combine all chunks into a single Uint8Array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
};

// Utility functions
export const isGSDataTable = (dataTable: DataTable) => {
    if (
        ![
            'x',
            'y',
            'z',
            'rot_0',
            'rot_1',
            'rot_2',
            'rot_3',
            'scale_0',
            'scale_1',
            'scale_2',
            'f_dc_0',
            'f_dc_1',
            'f_dc_2',
            'opacity',
        ].every(c => dataTable.hasColumn(c))
    ) {
        return false;
    }
    return true;
};

export interface ProcessOptions {
    scale?: number;
    translate?: Vec3;
    rotate?: Vec3;
    filterNaN?: boolean;
    outputFormat?: 'json' | 'ply' | 'csv';
    outputFilename?: string;
}

export interface ProcessResult {
    inputRows: number;
    outputRows: number;
    actionsApplied: string;
    outputFormat: string;
    outputData: any;
    outputFilename: string;
}

export const processGaussianSplatWeb = async (
    file: File,
    options: ProcessOptions = {}
): Promise<ProcessResult> => {
    const {
        scale = 1,
        translate = new Vec3(0, 0, 0),
        rotate = new Vec3(0, 0, 0),
        filterNaN = false,
        outputFormat = 'json',
        outputFilename = 'processed',
    } = options;

    console.log('🔄 Processing Gaussian Splat file in web...');

    // Read the file
    const fileData = await readFileFromWeb(file);

    // Validate it's a Gaussian Splat file
    if (fileData.elements.length !== 1 || fileData.elements[0].name !== 'vertex') {
        throw new Error('Invalid PLY file: Expected single vertex element');
    }

    const element = fileData.elements[0];
    const dataTable = element.dataTable;

    if (dataTable.numRows === 0 || !isGSDataTable(dataTable)) {
        throw new Error('Invalid PLY file: Not a valid Gaussian Splat format');
    }

    console.log(`📊 Loaded ${dataTable.numRows} splats`);

    // Build processing actions from options
    const actions: ProcessAction[] = [];

    if (scale !== 1) {
        actions.push({ kind: 'scale', value: scale });
        console.log(`🔍 Scaling by factor: ${scale}`);
    }

    if (translate.x !== 0 || translate.y !== 0 || translate.z !== 0) {
        actions.push({ kind: 'translate', value: translate });
        console.log(`🔍 Translating by: (${translate.x}, ${translate.y}, ${translate.z})`);
    }

    if (rotate.x !== 0 || rotate.y !== 0 || rotate.z !== 0) {
        actions.push({ kind: 'rotate', value: rotate });
        console.log(`🔍 Rotating by: (${rotate.x}, ${rotate.y}, ${rotate.z}) degrees`);
    }

    if (filterNaN) {
        actions.push({ kind: 'filterNaN' });
        console.log('🔍 Filtering out NaN/Inf values');
    }

    // Process the data
    const processedData = process(dataTable, actions);
    console.log(`✅ Processing complete. ${processedData.numRows} splats remaining`);

    // Write output based on format
    let outputData: any;
    let finalOutputFormat = outputFormat;

    if (outputFormat === 'json') {
        // SOGS format
        const sogsResult = await writeSogs(processedData, 3); // Use 3 iterations for faster processing
        outputData = sogsResult;
        finalOutputFormat = 'json';
    } else if (outputFormat === 'ply') {
        // PLY format
        outputData = await writeFileToWeb(processedData, 'ply', outputFilename);
        finalOutputFormat = 'ply';
    } else if (outputFormat === 'csv') {
        // CSV format
        outputData = await writeFileToWeb(processedData, 'csv', outputFilename);
        finalOutputFormat = 'csv';
    } else {
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    console.log(`💾 Output written in ${finalOutputFormat} format`);

    return {
        inputRows: dataTable.numRows,
        outputRows: processedData.numRows,
        actionsApplied: `Scale(${scale}), Translate(${translate.x},${translate.y},${translate.z}), Rotate(${rotate.x},${rotate.y},${rotate.z})${filterNaN ? ', FilterNaN' : ''}`,
        outputFormat: finalOutputFormat,
        outputData,
        outputFilename,
    };
};

// Utility functions
export const combine = (dataTables: DataTable[]) => {
    if (dataTables.length === 1) {
        return dataTables[0];
    }

    const findMatchingColumn = (columns: Column[], column: Column) => {
        for (let i = 0; i < columns.length; ++i) {
            if (columns[i].name === column.name && columns[i].dataType === column.dataType) {
                return columns[i];
            }
        }
        return null;
    };

    // make unique list of columns where name and type much match
    const columns = dataTables[0].columns.slice();
    for (let i = 1; i < dataTables.length; ++i) {
        const dataTable = dataTables[i];
        for (let j = 0; j < dataTable.columns.length; ++j) {
            if (!findMatchingColumn(columns, dataTable.columns[j])) {
                columns.push(dataTable.columns[j]);
            }
        }
    }

    // count total number of rows
    const totalRows = dataTables.reduce((sum, dataTable) => sum + dataTable.numRows, 0);

    // construct output dataTable
    const resultColumns = columns.map(column => {
        const constructor = column.data.constructor as new (length: number) => TypedArray;
        return new Column(column.name, new constructor(totalRows));
    });
    const result = new DataTable(resultColumns);

    // copy data
    let rowOffset = 0;
    for (let i = 0; i < dataTables.length; ++i) {
        const dataTable = dataTables[i];

        for (let j = 0; j < dataTable.columns.length; ++j) {
            const column = dataTable.columns[j];
            const targetColumn = findMatchingColumn(result.columns, column);
            targetColumn.data.set(column.data, rowOffset);
        }

        rowOffset += dataTable.numRows;
    }

    return result;
};

// Type exports
export type { ProcessAction } from './process';
