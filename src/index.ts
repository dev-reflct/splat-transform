import { DataTable, Column } from './data-table';
import { ProcessAction, process } from './process';

// Core processing functions
export { process } from './process';
export { DataTable, Column } from './data-table';
export type { TypedArray } from './data-table';

// Readers
export { readPlyFromFile, readPlyFromBuffer } from './readers/read-ply';
export { readSplatFromFile, readSplatFromBuffer } from './readers/read-splat';
export { readKsplatFromFile, readKsplatFromBuffer } from './readers/read-ksplat';

// Writers
export { writePlyToBlob, writePlyToBuffer } from './writers/write-ply';
export {
    writeCompressedPlyToBlob,
    writeCompressedPlyToBuffer,
} from './writers/write-compressed-ply';
export { writeCsvToBlob, writeCsvToString } from './writers/write-csv';
export { writeSogsToBlobs } from './writers/write-sogs';

// Types
export type { ProcessAction } from './process';
export type { PlyData } from './readers/read-ply';
export type { SplatData } from './readers/read-splat';
export type { KsplatFileData } from './readers/read-ksplat';

/**
 * Process a DataTable with a series of transformations
 * @param dataTable - The input DataTable
 * @param actions - Array of processing actions to apply
 * @returns The processed DataTable
 */
export const processDataTable = (dataTable: DataTable, actions: ProcessAction[]): DataTable => {
    return process(dataTable, actions);
};

/**
 * Combine multiple DataTable objects into one
 * @param dataTables - Array of DataTable objects to combine
 * @returns The combined DataTable
 */
export const combine = (dataTables: DataTable[]): DataTable => {
    if (dataTables.length === 1) {
        return dataTables[0];
    }

    const findMatchingColumn = (columns: any[], column: any) => {
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
        const constructor = column.data.constructor as new (length: number) => any;
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

/**
 * Check if a DataTable contains Gaussian Splat data
 * @param dataTable - The DataTable to validate
 * @returns True if the DataTable contains Gaussian Splat data
 */
export const isGSDataTable = (dataTable: DataTable): boolean => {
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

/**
 * Process multiple DataTables and combine them
 * @param dataTables - Array of input DataTables
 * @param actions - Array of processing actions to apply to the combined result
 * @returns The processed and combined DataTable
 */
export const processAndCombine = async (
    dataTables: DataTable[],
    actions: ProcessAction[]
): Promise<DataTable> => {
    const combined = combine(dataTables);
    return process(combined, actions);
};

/**
 * Convert a file to SOGS format with optional processing
 * @param file - The input file to convert
 * @param actions - Array of processing actions to apply before conversion
 * @param shIterations - Number of iterations for spherical harmonics compression
 * @param shMethod - Method for spherical harmonics compression ('cpu' or 'gpu')
 * @returns Promise that resolves to SogsData containing meta and file blobs
 */
export const convertSogs = async (
    file: File,
    actions: ProcessAction[] = [],
    shIterations = 10,
    shMethod: 'cpu' | 'gpu' = 'cpu'
): Promise<{
    meta: any;
    files: {
        [key: string]: Blob;
    };
}> => {
    // Determine file type and read data
    const filename = file.name.toLowerCase();
    let dataTable: DataTable;

    if (filename.endsWith('.ply')) {
        const { readPlyFromFile } = await import('./readers/read-ply');
        const plyData = await readPlyFromFile(file);
        if (plyData.elements.length === 0) {
            throw new Error('No elements found in PLY file');
        }
        dataTable = plyData.elements[0].dataTable;
    } else if (filename.endsWith('.splat')) {
        const { readSplatFromFile } = await import('./readers/read-splat');
        const splatData = await readSplatFromFile(file);
        dataTable = splatData.elements[0].dataTable;
    } else if (filename.endsWith('.ksplat')) {
        const { readKsplatFromFile } = await import('./readers/read-ksplat');
        const ksplatData = await readKsplatFromFile(file);
        dataTable = ksplatData.elements[0].dataTable;
    } else {
        throw new Error(`Unsupported file type: ${filename}`);
    }

    // Validate it's Gaussian Splat data
    if (!isGSDataTable(dataTable)) {
        throw new Error('File does not contain valid Gaussian Splat data');
    }

    // Apply processing actions if any
    if (actions.length > 0) {
        dataTable = processDataTable(dataTable, actions);
    }

    // Convert to SOGS format
    const { writeSogsToBlobs } = await import('./writers/write-sogs');
    return writeSogsToBlobs(dataTable, shIterations, shMethod);
};
