import { DataTable } from '../data-table';

/**
 * Write DataTable to CSV string
 * @param dataTable - The DataTable to convert to CSV
 * @returns CSV string
 */
export const writeCsvToString = (dataTable: DataTable): string => {
    const len = dataTable.numRows;
    const lines: string[] = [];

    // write header
    lines.push(dataTable.columnNames.join(','));

    const columns = dataTable.columns.map(c => c.data);

    // write rows
    for (let i = 0; i < len; ++i) {
        let row = '';
        for (let c = 0; c < dataTable.columns.length; ++c) {
            if (c) row += ',';
            row += columns[c][i];
        }
        lines.push(row);
    }

    return lines.join('\n');
};

/**
 * Write DataTable to CSV Blob
 * @param dataTable - The DataTable to convert to CSV
 * @returns Blob containing CSV data
 */
export const writeCsvToBlob = (dataTable: DataTable): Blob => {
    const csvString = writeCsvToString(dataTable);
    return new Blob([csvString], { type: 'text/csv' });
};
