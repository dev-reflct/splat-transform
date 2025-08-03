import { DataTable } from '../data-table';

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
