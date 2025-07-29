import { open } from "node:fs/promises";
import { resolve } from "node:path";

import { readPly, process, writeSogs, Vec3 } from "../dist/module.mjs";

async function testSogsExport() {
  console.log("🧪 Testing SOGS Export with Real Data");
  console.log("=====================================");

  const startTime = Date.now();

  try {
    // Read the valid Gaussian Splat file
    console.log("📁 Reading example/couch.ply...");
    const readStart = Date.now();
    const inputFile = await open("example/couch.ply", "r");
    const fileData = await readPly(inputFile);
    await inputFile.close();
    const readTime = Date.now() - readStart;

    console.log(`✅ Successfully read couch.ply (${readTime}ms)`);
    console.log(
      `📊 Original data: ${fileData.elements[0].dataTable.numRows} splats`
    );

    // Get the data table
    const dataTable = fileData.elements[0].dataTable;

    // Apply some transformations
    console.log("\n🔧 Applying transformations...");
    const transformStart = Date.now();
    const transformations = [
      { kind: "scale", value: 0.5 },
      { kind: "translate", value: new Vec3(0, 0, 10) },
      { kind: "rotate", value: new Vec3(0, 45, 0) },
      { kind: "filterNaN" },
    ];

    console.log("✅ Scale: 0.5x");
    console.log("✅ Translate: (0, 0, 10)");
    console.log("✅ Rotate: (0, 45, 0) degrees");
    console.log("✅ Filter: Remove NaN values");

    // Process the data
    const processedData = process(dataTable, transformations);
    const transformTime = Date.now() - transformStart;
    console.log(
      `✅ Processing complete: ${processedData.numRows} splats remaining (${transformTime}ms)`
    );

    // Write to SOGS format
    console.log("\n💾 Writing to SOGS format...");
    const writeStart = Date.now();
    const outputFile = await open("__test__/couch_processed.meta.json", "w");

    await writeSogs(
      outputFile,
      processedData,
      "couch_processed.meta.json",
      10,
      "gpu"
    );
    await outputFile.close();
    const writeTime = Date.now() - writeStart;

    console.log(`✅ SOGS file written successfully! (${writeTime}ms)`);
    console.log("📁 Output: __test__/couch_processed.meta.json");

    // Check file size
    const fs = await import("node:fs/promises");
    const stats = await fs.stat("__test__/couch_processed.meta.json");
    console.log(`📏 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const totalTime = Date.now() - startTime;
    console.log("\n🎉 SOGS Export Test PASSED!");
    console.log("\n📚 Summary:");
    console.log(`   • Input: ${dataTable.numRows} splats`);
    console.log(`   • Output: ${processedData.numRows} splats`);
    console.log(`   • Transformations: ${transformations.length}`);
    console.log(`   • Format: SOGS (meta.json)`);
    console.log("\n⏱️  Timing Breakdown:");
    console.log(`   • File reading: ${readTime}ms`);
    console.log(`   • Transformations: ${transformTime}ms`);
    console.log(`   • SOGS writing: ${writeTime}ms`);
    console.log(
      `   • Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`
    );
  } catch (error) {
    console.error("❌ SOGS Export Test FAILED:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSogsExport();
