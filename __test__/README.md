# Test Directory for CLI to Module Conversion

This directory contains tests to verify the functionality of the splat-transform CLI tool and prepare for module conversion.

## Test Files

### `run-test.sh`

A simple shell script that tests the CLI export functionality by converting `example/skull.ply` to `meta.json` format.

### `inspect-ply.mjs`

A Node.js script to inspect the structure of PLY files and understand what columns they contain.

### `test-cli-equivalent.js`

A Node.js script that programmatically tests the CLI functionality using child processes.

## Usage

### Test CLI Export (Recommended)

```bash
# Run the shell script test
./__test__/run-test.sh

# Or use npm script
npm run test:export
```

### Inspect PLY File Structure

```bash
node __test__/inspect-ply.mjs
```

## Current Status

The CLI tool is working and can convert PLY files to various formats including:

- `.ply` - Standard PLY format
- `.compressed.ply` - Compressed PLY format
- `meta.json` - SOGS format (JSON + WebP images)
- `.csv` - Comma-separated values

## Next Steps for Module Conversion

Based on the Cursor rule `.cursor/rules/cli-to-module.mdc`, the next steps are:

1. **Extract Functions**: Move `readFile()`, `writeFile()`, `combine()`, and `process()` to separate modules
2. **Create Clean API**: Design a module API that accepts `DataTable` objects instead of file paths
3. **Remove CLI Code**: Remove argument parsing, file I/O, and console output from the core logic
4. **Update Exports**: Export individual functions from `src/index.ts`
5. **Update Package.json**: Remove `bin` entry and add proper module exports

## Example Expected Module Usage

```typescript
import {
  readPly,
  process,
  writeSogs,
  DataTable,
} from "@playcanvas/splat-transform";

// Read data
const dataTable = await readPly(fileHandle);

// Process with transformations
const processed = process(dataTable, [
  { kind: "scale", value: 0.5 },
  { kind: "translate", value: new Vec3(0, 0, 10) },
]);

// Write output
await writeSogs(outputFile, processed, "output.meta.json", 10, "cpu");
```

## Testing the Current CLI

The current CLI works as documented in the main README:

```bash
# Convert PLY to meta.json (SOGS format)
splat-transform example/skull.ply __test__/skull_output.meta.json

# Apply transformations
splat-transform example/skull.ply -s 0.5 -t 0,0,10 __test__/skull_transformed.meta.json
```
