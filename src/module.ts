import { open } from "node:fs/promises";

import { Vec3 } from "playcanvas";

import { Column, DataTable, TypedArray } from "./data-table";
import { ProcessAction, process } from "./process";
import { readKsplat } from "./readers/read-ksplat";
import { readPly } from "./readers/read-ply";
import { readSplat } from "./readers/read-splat";
import { writeCompressedPly } from "./writers/write-compressed-ply";
import { writeCsv } from "./writers/write-csv";
import { writePly } from "./writers/write-ply";
import { writeSogs } from "./writers/write-sogs";

// Core data processing functions
export { process } from "./process";
export { DataTable, Column } from "./data-table";

// Reader functions
export { readPly } from "./readers/read-ply";
export { readSplat } from "./readers/read-splat";
export { readKsplat } from "./readers/read-ksplat";

// Writer functions
export { writePly } from "./writers/write-ply";
export { writeCompressedPly } from "./writers/write-compressed-ply";
export { writeCsv } from "./writers/write-csv";
export { writeSogs } from "./writers/write-sogs";

// Utility functions - isGSDataTable is defined below

// Module-specific functions
export const readFile = async (fileHandle: any) => {
  const lowerFilename = fileHandle.name?.toLowerCase() || "";
  let fileData;

  if (lowerFilename.endsWith(".ksplat")) {
    fileData = await readKsplat(fileHandle);
  } else if (lowerFilename.endsWith(".splat")) {
    fileData = await readSplat(fileHandle);
  } else if (lowerFilename.endsWith(".ply")) {
    fileData = await readPly(fileHandle);
  } else {
    throw new Error(`Unsupported input file type: ${lowerFilename}`);
  }

  return fileData;
};

export const writeFile = async (
  fileHandle: any,
  dataTable: DataTable,
  format: string,
  options: {
    iterations?: number;
    gpu?: boolean;
  } = {}
) => {
  const { iterations = 10, gpu = false } = options;

  switch (format) {
    case "csv":
      await writeCsv(fileHandle, dataTable);
      break;
    case "json":
    case "sogs":
      await writeSogs(
        fileHandle,
        dataTable,
        fileHandle.name || "output.json",
        iterations,
        gpu ? "gpu" : "cpu"
      );
      break;
    case "compressed-ply":
      await writeCompressedPly(fileHandle, dataTable);
      break;
    case "ply":
      await writePly(fileHandle, {
        comments: [],
        elements: [
          {
            name: "vertex",
            dataTable: dataTable,
          },
        ],
      });
      break;
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
};

// Combine multiple tables into one
// columns with matching name and type are combined
export const combine = (dataTables: DataTable[]) => {
  if (dataTables.length === 1) {
    // nothing to combine
    return dataTables[0];
  }

  const findMatchingColumn = (columns: Column[], column: Column) => {
    for (let i = 0; i < columns.length; ++i) {
      if (
        columns[i].name === column.name &&
        columns[i].dataType === column.dataType
      ) {
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
  const totalRows = dataTables.reduce(
    (sum, dataTable) => sum + dataTable.numRows,
    0
  );

  // construct output dataTable
  const resultColumns = columns.map((column) => {
    const constructor = column.data.constructor as new (
      length: number
    ) => TypedArray;
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

// Validation function
export const isGSDataTable = (dataTable: DataTable) => {
  if (
    ![
      "x",
      "y",
      "z",
      "rot_0",
      "rot_1",
      "rot_2",
      "rot_3",
      "scale_0",
      "scale_1",
      "scale_2",
      "f_dc_0",
      "f_dc_1",
      "f_dc_2",
      "opacity",
    ].every((c) => dataTable.hasColumn(c))
  ) {
    return false;
  }
  return true;
};

// Type exports
export type { ProcessAction } from "./process";

// Re-export Vec3 for convenience
export { Vec3 } from "playcanvas";

// Comprehensive example function demonstrating complete workflow
export const processGaussianSplat = async (
  inputFileHandle: any,
  outputFileHandle: any,
  options: {
    scale?: number;
    translate?: Vec3;
    rotate?: Vec3;
    filterNaN?: boolean;
    iterations?: number;
    gpu?: boolean;
  } = {}
) => {
  console.log("🔄 Processing Gaussian Splat file...");

  // Read the input file
  const fileData = await readPly(inputFileHandle);

  // Validate it's a Gaussian Splat file
  if (
    fileData.elements.length !== 1 ||
    fileData.elements[0].name !== "vertex"
  ) {
    throw new Error("Invalid PLY file: Expected single vertex element");
  }

  const dataTable = fileData.elements[0].dataTable;
  if (dataTable.numRows === 0 || !isGSDataTable(dataTable)) {
    throw new Error("Invalid PLY file: Not a valid Gaussian Splat format");
  }

  console.log(`📊 Loaded ${dataTable.numRows} splats`);

  // Build processing actions from options
  const actions: ProcessAction[] = [];

  if (options.scale !== undefined) {
    actions.push({ kind: "scale", value: options.scale });
    console.log(`🔍 Scaling by factor: ${options.scale}`);
  }

  if (options.translate) {
    actions.push({ kind: "translate", value: options.translate });
    console.log(
      `🔍 Translating by: (${options.translate.x}, ${options.translate.y}, ${options.translate.z})`
    );
  }

  if (options.rotate) {
    actions.push({ kind: "rotate", value: options.rotate });
    console.log(
      `🔍 Rotating by: (${options.rotate.x}, ${options.rotate.y}, ${options.rotate.z}) degrees`
    );
  }

  if (options.filterNaN) {
    actions.push({ kind: "filterNaN" });
    console.log("🔍 Filtering out NaN/Inf values");
  }

  // Process the data
  const processedData = process(dataTable, actions);
  console.log(
    `✅ Processing complete. ${processedData.numRows} splats remaining`
  );

  // Write the output
  const iterations = options.iterations ?? 10;
  const gpuMode = options.gpu ? "gpu" : "cpu";

  await writeSogs(
    outputFileHandle,
    processedData,
    "output.meta.json",
    iterations,
    gpuMode
  );
  console.log(
    `💾 Output written with ${iterations} iterations using ${gpuMode} mode`
  );

  return {
    inputRows: dataTable.numRows,
    outputRows: processedData.numRows,
    actionsApplied: actions.length,
    iterations,
    gpuMode,
  };
};
