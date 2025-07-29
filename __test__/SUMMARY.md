# Summary: CLI to Module Conversion Setup

## ✅ What We've Accomplished

### 1. Created Cursor Rule

- **File**: `.cursor/rules/cli-to-module.mdc`
- **Purpose**: Provides comprehensive guidance for converting CLI tool to JavaScript module
- **Type**: Auto Attached (triggers when working with `src/index.ts`, `bin/cli.mjs`, `package.json`)
- **Features**:
  - Core conversion strategy
  - Function extraction guide
  - API design principles
  - Module structure suggestions
  - Conversion checklist
  - Example usage patterns

### 2. Created Test Infrastructure

- **Directory**: `__test__/`
- **Files Created**:
  - `run-test.sh` - Shell script to test CLI export
  - `inspect-ply.mjs` - Node.js script to inspect PLY file structure
  - `test-cli-equivalent.js` - Programmatic CLI testing
  - `README.md` - Documentation for test directory
  - `SUMMARY.md` - This summary file

### 3. Updated Package.json

- **Added Scripts**:
  - `test:cli` - Run CLI test
  - `test:export` - Test PLY to meta.json conversion

### 4. Verified Build Process

- **Confirmed**: `npm run build` works and creates `dist/index.mjs`
- **Confirmed**: CLI tool is properly built and executable

## 🔍 Current Status

### CLI Tool Status

- ✅ **Build System**: Working (rollup builds successfully)
- ✅ **CLI Entry Point**: Working (`bin/cli.mjs` executes)
- ✅ **Argument Parsing**: Working (parses CLI arguments correctly)
- ✅ **File I/O**: Working (can read/write files)
- ❌ **Gaussian Splat Validation**: The `example/skull.ply` file doesn't contain the required columns

### Required Gaussian Splat Columns

The tool expects these columns in PLY files:

```typescript
[
  "x",
  "y",
  "z", // Position
  "rot_0",
  "rot_1",
  "rot_2",
  "rot_3", // Rotation (quaternion)
  "scale_0",
  "scale_1",
  "scale_2", // Scale
  "f_dc_0",
  "f_dc_1",
  "f_dc_2", // Spherical harmonics
  "opacity", // Opacity
];
```

### Test File Issue

The `example/skull.ply` file appears to be a standard PLY file (likely a mesh) rather than a Gaussian Splat PLY file. This is why the validation fails.

## 🎯 Next Steps

### Immediate (Testing)

1. **Find Valid Test Data**: Locate or create a proper Gaussian Splat PLY file for testing
2. **Test CLI Functionality**: Verify the tool works with correct input data
3. **Test All Formats**: Verify conversion to all supported output formats

### Module Conversion (Following Cursor Rule)

1. **Extract Core Functions**: Move `readFile()`, `writeFile()`, `combine()`, `process()` to separate modules
2. **Create Module API**: Design clean API that accepts `DataTable` objects
3. **Update Exports**: Export individual functions from `src/index.ts`
4. **Remove CLI Code**: Clean up argument parsing and file I/O from core logic
5. **Update Package.json**: Remove `bin` entry, add proper module exports

## 📋 Conversion Checklist (From Cursor Rule)

- [ ] Extract `readFile()` logic into separate reader modules
- [ ] Extract `writeFile()` logic into separate writer modules
- [ ] Remove `parseArguments()` and CLI argument handling
- [ ] Remove `main()` function and CLI entry point
- [ ] Remove `exit()` calls and replace with proper error handling
- [ ] Remove console.log statements or make them optional
- [ ] Update `package.json` to remove `bin` entry and add proper exports
- [ ] Create TypeScript interfaces for all public APIs
- [ ] Add JSDoc comments for all exported functions
- [ ] Update README with module usage examples

## 🛠️ How to Use the Cursor Rule

The rule will automatically apply when working with:

- `src/index.ts` - Main source file
- `bin/cli.mjs` - CLI entry point
- `package.json` - Package configuration

You can also reference it manually using `@cli-to-module` in conversations.

## 📚 Example Module Usage (Target)

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

## 🎉 Success Metrics

The conversion will be successful when:

1. ✅ All core functions are exported as modules
2. ✅ CLI functionality is preserved
3. ✅ Module API is clean and intuitive
4. ✅ Tests pass with both CLI and module usage
5. ✅ Documentation is updated
6. ✅ Package.json is properly configured for module usage
