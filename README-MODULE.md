# SplatTransform Module

This package can be used both as a CLI tool and as a JavaScript module for 3D Gaussian splat format conversion and transformation.

## Installation

```bash
npm install @playcanvas/splat-transform
```

## Module Usage

### Basic Import

```typescript
import {
  readPly,
  process,
  writeSogs,
  DataTable,
  Vec3,
} from "@playcanvas/splat-transform";
```

### Core Functions

#### Reading Files

```typescript
import { readPly, readSplat, readKsplat } from "@playcanvas/splat-transform";

// Read PLY file
const fileHandle = await open("input.ply", "r");
const fileData = await readPly(fileHandle);
await fileHandle.close();

// Access the data table
const dataTable = fileData.elements[0].dataTable;
```

#### Processing Data

```typescript
import { process, Vec3 } from "@playcanvas/splat-transform";

// Apply transformations
const processed = process(dataTable, [
  { kind: "scale", value: 0.5 },
  { kind: "translate", value: new Vec3(0, 0, 10) },
  { kind: "rotate", value: new Vec3(0, 90, 0) },
]);
```

#### Writing Files

```typescript
import {
  writePly,
  writeSogs,
  writeCsv,
  writeCompressedPly,
} from "@playcanvas/splat-transform";

// Write to different formats
const outputFile = await open("output.ply", "w");

// PLY format
await writePly(outputFile, {
  comments: [],
  elements: [{ name: "vertex", dataTable: processed }],
});

// SOGS format (meta.json)
await writeSogs(outputFile, processed, "output.meta.json", 10, "cpu");

// CSV format
await writeCsv(outputFile, processed);

// Compressed PLY
await writeCompressedPly(outputFile, processed);

await outputFile.close();
```

#### Combining Multiple Datasets

```typescript
import { combine } from "@playcanvas/splat-transform";

// Combine multiple data tables
const combined = combine([dataTable1, dataTable2, dataTable3]);
```

#### Validation

```typescript
import { isGSDataTable } from "@playcanvas/splat-transform";

// Check if data table is valid Gaussian Splat data
if (isGSDataTable(dataTable)) {
  console.log("Valid Gaussian Splat data");
} else {
  console.log("Invalid or missing required columns");
}
```

### Complete Examples

#### Option 1: Step-by-step approach

```typescript
import { readPly, process, writeSogs, Vec3 } from "@playcanvas/splat-transform";
import { open } from "node:fs/promises";

async function transformSplat() {
  try {
    // Read input file
    const inputFile = await open("input.ply", "r");
    const fileData = await readPly(inputFile);
    await inputFile.close();

    // Get data table
    const dataTable = fileData.elements[0].dataTable;

    // Apply transformations
    const processed = process(dataTable, [
      { kind: "scale", value: 0.5 },
      { kind: "translate", value: new Vec3(0, 0, 10) },
    ]);

    // Write output
    const outputFile = await open("output.meta.json", "w");
    await writeSogs(outputFile, processed, "output.meta.json", 10, "cpu");
    await outputFile.close();

    console.log("Transformation complete!");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

transformSplat();
```

#### Option 2: Aggregated function (recommended)

For convenience, we provide an aggregated function that handles the complete workflow:

```typescript
import { processGaussianSplat, Vec3 } from "@playcanvas/splat-transform";
import { open } from "node:fs/promises";

async function transformSplat() {
  try {
    const inputFile = await open("input.ply", "r");
    const outputFile = await open("output.meta.json", "w");

    const result = await processGaussianSplat(inputFile, outputFile, {
      scale: 0.5,
      translate: new Vec3(0, 0, 10),
      rotate: new Vec3(0, 90, 0),
      filterNaN: true,
      iterations: 15,
      gpu: false,
    });

    console.log("Processing complete:", result);
    // Result includes: inputRows, outputRows, actionsApplied, iterations, gpuMode
  } catch (error) {
    console.error("Error:", error.message);
  }
}

transformSplat();
```

The aggregated function provides:

- **File reading and validation**
- **Multiple transformation options** (scale, translate, rotate, filterNaN)
- **Progress logging** with emojis for better UX
- **Error handling** with descriptive messages
- **Result summary** with statistics

### Available Functions

#### Readers

- `readPly(fileHandle)` - Read PLY format files
- `readSplat(fileHandle)` - Read SPLAT format files
- `readKsplat(fileHandle)` - Read KSPLAT format files

#### Writers

- `writePly(fileHandle, data)` - Write PLY format
- `writeCompressedPly(fileHandle, dataTable)` - Write compressed PLY
- `writeSogs(fileHandle, dataTable, filename, iterations, mode)` - Write SOGS format
- `writeCsv(fileHandle, dataTable)` - Write CSV format

#### Processing

- `process(dataTable, actions)` - Apply transformations
- `combine(dataTables)` - Combine multiple datasets
- `processGaussianSplat(inputFile, outputFile, options)` - Complete workflow function

#### Validation

- `isGSDataTable(dataTable)` - Validate Gaussian Splat data

#### Types

- `DataTable` - Main data structure
- `Column` - Column data structure
- `ProcessAction` - Transformation action types
- `Vec3` - 3D vector from PlayCanvas

### Transformation Actions

```typescript
type ProcessAction =
  | { kind: "scale"; value: number }
  | { kind: "translate"; value: Vec3 }
  | { kind: "rotate"; value: Vec3 }
  | { kind: "filterNaN" }
  | {
      kind: "filterByValue";
      columnName: string;
      comparator: string;
      value: number;
    }
  | { kind: "filterBands"; value: 0 | 1 | 2 | 3 };
```

### Supported Formats

**Input Formats:**

- `.ply` - Standard PLY format
- `.splat` - Binary splat format
- `.ksplat` - Compressed binary splat format

**Output Formats:**

- `.ply` - Standard PLY format
- `.compressed.ply` - Compressed PLY format
- `meta.json` - SOGS format (JSON + WebP images)
- `.csv` - Comma-separated values

### CLI Usage

The package also includes a CLI tool:

```bash
# Install globally
npm install -g @playcanvas/splat-transform

# Use CLI
splat-transform input.ply -s 0.5 -t 0,0,10 output.meta.json
```

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/module.mjs",
      "types": "./dist/module.d.ts"
    },
    "./cli": {
      "import": "./bin/cli.mjs"
    }
  }
}
```

This allows you to import either the main module or the CLI:

```typescript
// Main module
import { readPly, process } from "@playcanvas/splat-transform";

// CLI (if needed)
import { main } from "@playcanvas/splat-transform/cli";
```
