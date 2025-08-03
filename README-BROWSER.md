# Splat Transform Browser Module

This is the browser-compatible version of the splat-transform library. It provides the same functionality as the CLI tool but can be used directly in web browsers.

## Installation

```bash
npm install @playcanvas/splat-transform
```

## Usage

### Basic Usage

```javascript
import {
    readPlyFromFile,
    processDataTable,
    writePlyToBlob,
    writeCsvToBlob,
    isGSDataTable,
} from '@playcanvas/splat-transform';

// Load a PLY file
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];
const plyData = await readPlyFromFile(file);

// Get the data table
const dataTable = plyData.elements[0].dataTable;

// Process the data
const processedData = processDataTable(dataTable, [
    { kind: 'scale', value: 0.5 },
    { kind: 'translate', value: { x: 0, y: 0, z: 10 } },
]);

// Export as PLY
const plyBlob = writePlyToBlob({
    comments: [],
    elements: [{ name: 'vertex', dataTable: processedData }],
});

// Download the file
const url = URL.createObjectURL(plyBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'processed.ply';
a.click();
URL.revokeObjectURL(url);
```

### Available Functions

#### Readers

- `readPlyFromFile(file: File): Promise<PlyData>` - Read PLY data from a File object
- `readPlyFromBuffer(buffer: ArrayBuffer): Promise<PlyData>` - Read PLY data from an ArrayBuffer
- `readSplat(file: File): Promise<DataTable>` - Read SPLAT data from a File object
- `readKsplat(file: File): Promise<DataTable>` - Read KSPLAT data from a File object

#### Writers

- `writePlyToBlob(plyData: PlyData): Blob` - Convert PLY data to a Blob
- `writePlyToBuffer(plyData: PlyData): ArrayBuffer` - Convert PLY data to an ArrayBuffer
- `writeCsvToBlob(dataTable: DataTable): Blob` - Convert DataTable to CSV Blob
- `writeCsvToString(dataTable: DataTable): string` - Convert DataTable to CSV string
- `writeCompressedPlyToBlob(dataTable: DataTable): Blob` - Convert DataTable to compressed PLY Blob

#### Processing

- `processDataTable(dataTable: DataTable, actions: ProcessAction[]): DataTable` - Apply transformations to a DataTable
- `combine(dataTables: DataTable[]): DataTable` - Combine multiple DataTables
- `processAndCombine(dataTables: DataTable[], actions: ProcessAction[]): Promise<DataTable>` - Combine and process multiple DataTables

#### Utilities

- `isGSDataTable(dataTable: DataTable): boolean` - Check if a DataTable contains Gaussian Splat data

### Processing Actions

The following actions can be applied to DataTables:

```javascript
// Scale
{ kind: 'scale', value: 0.5 }

// Translate
{ kind: 'translate', value: { x: 0, y: 0, z: 10 } }

// Rotate (Euler angles in degrees)
{ kind: 'rotate', value: { x: 0, y: 90, z: 0 } }

// Filter NaN values
{ kind: 'filterNaN' }

// Filter by value
{ kind: 'filterByValue', columnName: 'opacity', comparator: 'gt', value: 0.5 }

// Filter spherical harmonic bands
{ kind: 'filterBands', value: 2 }
```

### Example: Complete Workflow

```javascript
import {
    readPlyFromFile,
    processDataTable,
    writePlyToBlob,
    isGSDataTable,
} from '@playcanvas/splat-transform';

async function processSplatFile(file) {
    try {
        // Load the file
        const plyData = await readPlyFromFile(file);
        let dataTable = plyData.elements[0].dataTable;

        // Validate it's Gaussian Splat data
        if (!isGSDataTable(dataTable)) {
            throw new Error('File does not contain valid Gaussian Splat data');
        }

        // Apply transformations
        dataTable = processDataTable(dataTable, [
            { kind: 'filterNaN' }, // Remove NaN values
            { kind: 'scale', value: 0.5 }, // Scale by 0.5
            { kind: 'translate', value: { x: 0, y: 0, z: 10 } }, // Move up by 10 units
            { kind: 'rotate', value: { x: 0, y: 90, z: 0 } }, // Rotate 90 degrees around Y
        ]);

        // Export the result
        const plyBlob = writePlyToBlob({
            comments: ['Processed with splat-transform'],
            elements: [{ name: 'vertex', dataTable }],
        });

        return plyBlob;
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}

// Usage
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async event => {
    const file = event.target.files[0];
    if (file) {
        try {
            const blob = await processSplatFile(file);

            // Download the result
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'processed_splat.ply';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Error processing file: ' + error.message);
        }
    }
});
```

### Browser Compatibility

This module is designed to work in modern browsers that support:

- ES6 modules
- ArrayBuffer and TypedArrays
- File API
- Blob API
- TextEncoder/TextDecoder

### Differences from CLI Version

The browser version differs from the CLI version in several ways:

1. **No file system access**: All I/O is done through browser APIs (File, Blob, ArrayBuffer)
2. **No command line arguments**: Configuration is done through JavaScript objects
3. **No console output**: Results are returned as data structures
4. **Async operations**: File reading is asynchronous
5. **Memory-based processing**: All data is kept in memory rather than streamed

### Building for Browser

To build the module for browser use:

```bash
npm run build
```

This will create the browser-compatible files in the `dist/` directory.

### Example HTML Page

See `example/browser-usage.html` for a complete example of how to use the module in a web page.
