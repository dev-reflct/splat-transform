#!/bin/bash

echo "Testing CLI export to meta.json format..."
echo "Running: node bin/cli.mjs example/skull.ply __test__/skull_output.meta.json"

# Run the CLI command
node bin/cli.mjs example/skull.ply __test__/skull_output.meta.json

# Check if the output file was created
if [ -f "__test__/skull_output.meta.json" ]; then
    echo "✅ Success! Output file created: __test__/skull_output.meta.json"
    echo "File size: $(ls -lh __test__/skull_output.meta.json | awk '{print $5}')"
else
    echo "❌ Error: Output file was not created"
    exit 1
fi 