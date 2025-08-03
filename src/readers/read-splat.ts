import { Column, DataTable } from '../data-table';

export type SplatData = {
    comments: string[];
    elements: {
        name: string;
        dataTable: DataTable;
    }[];
};

const BYTES_PER_SPLAT = 32;

/**
 * Read SPLAT data from an ArrayBuffer
 * @param buffer - The ArrayBuffer containing SPLAT data
 * @returns Promise that resolves to SplatData
 */
export const readSplatFromBuffer = async (buffer: ArrayBuffer): Promise<SplatData> => {
    const data = new Uint8Array(buffer);

    if (data.length < 4) {
        throw new Error('File too small to be a valid .splat file');
    }

    // Read number of splats (4 bytes, little-endian)
    const numSplats = new DataView(buffer).getUint32(0, true);

    if (data.length !== 4 + numSplats * BYTES_PER_SPLAT) {
        throw new Error('File size does not match expected size for .splat file');
    }

    // Create columns for all the data we need to store
    const columns = [
        new Column('x', new Float32Array(numSplats)),
        new Column('y', new Float32Array(numSplats)),
        new Column('z', new Float32Array(numSplats)),
        new Column('scale_0', new Float32Array(numSplats)),
        new Column('scale_1', new Float32Array(numSplats)),
        new Column('scale_2', new Float32Array(numSplats)),
        new Column('f_dc_0', new Float32Array(numSplats)),
        new Column('f_dc_1', new Float32Array(numSplats)),
        new Column('f_dc_2', new Float32Array(numSplats)),
        new Column('opacity', new Float32Array(numSplats)),
        new Column('rot_0', new Float32Array(numSplats)),
        new Column('rot_1', new Float32Array(numSplats)),
        new Column('rot_2', new Float32Array(numSplats)),
        new Column('rot_3', new Float32Array(numSplats)),
    ];

    // Read data in chunks
    const chunkSize = 1024;
    const numChunks = Math.ceil(numSplats / chunkSize);
    const chunkData = new Uint8Array(chunkSize * BYTES_PER_SPLAT);

    for (let c = 0; c < numChunks; ++c) {
        const numRows = Math.min(chunkSize, numSplats - c * chunkSize);
        const bytesToRead = numRows * BYTES_PER_SPLAT;

        if (4 + (c * chunkSize + numRows) * BYTES_PER_SPLAT > data.length) {
            throw new Error('Unexpected end of file while reading .splat data');
        }

        chunkData.set(
            data.subarray(
                4 + c * chunkSize * BYTES_PER_SPLAT,
                4 + c * chunkSize * BYTES_PER_SPLAT + bytesToRead
            )
        );

        // Parse each splat in the chunk
        for (let r = 0; r < numRows; ++r) {
            const splatIndex = c * chunkSize + r;
            const offset = r * BYTES_PER_SPLAT;

            // Read position (3 × float32)
            const x = new DataView(chunkData.buffer, chunkData.byteOffset + offset + 0).getFloat32(
                0,
                true
            );
            const y = new DataView(chunkData.buffer, chunkData.byteOffset + offset + 4).getFloat32(
                0,
                true
            );
            const z = new DataView(chunkData.buffer, chunkData.byteOffset + offset + 8).getFloat32(
                0,
                true
            );

            // Read scale (3 × float32)
            const scaleX = new DataView(
                chunkData.buffer,
                chunkData.byteOffset + offset + 12
            ).getFloat32(0, true);
            const scaleY = new DataView(
                chunkData.buffer,
                chunkData.byteOffset + offset + 16
            ).getFloat32(0, true);
            const scaleZ = new DataView(
                chunkData.buffer,
                chunkData.byteOffset + offset + 20
            ).getFloat32(0, true);

            // Read color and opacity (4 × uint8)
            const red = chunkData[offset + 24];
            const green = chunkData[offset + 25];
            const blue = chunkData[offset + 26];
            const opacity = chunkData[offset + 27];

            // Read rotation quaternion (4 × uint8)
            const rot0 = chunkData[offset + 28];
            const rot1 = chunkData[offset + 29];
            const rot2 = chunkData[offset + 30];
            const rot3 = chunkData[offset + 31];

            // Store position
            (columns[0].data as Float32Array)[splatIndex] = x;
            (columns[1].data as Float32Array)[splatIndex] = y;
            (columns[2].data as Float32Array)[splatIndex] = z;

            // Store scale (convert from linear in .splat to log scale for internal use)
            (columns[3].data as Float32Array)[splatIndex] = Math.log(scaleX);
            (columns[4].data as Float32Array)[splatIndex] = Math.log(scaleY);
            (columns[5].data as Float32Array)[splatIndex] = Math.log(scaleZ);

            // Store color (convert from uint8 back to spherical harmonics)
            const SH_C0 = 0.28209479177387814;
            (columns[6].data as Float32Array)[splatIndex] = (red / 255.0 - 0.5) / SH_C0;
            (columns[7].data as Float32Array)[splatIndex] = (green / 255.0 - 0.5) / SH_C0;
            (columns[8].data as Float32Array)[splatIndex] = (blue / 255.0 - 0.5) / SH_C0;

            // Store opacity (convert from uint8 to float and apply inverse sigmoid)
            const epsilon = 1e-6;
            const normalizedOpacity = Math.max(epsilon, Math.min(1.0 - epsilon, opacity / 255.0));
            (columns[9].data as Float32Array)[splatIndex] = Math.log(
                normalizedOpacity / (1.0 - normalizedOpacity)
            );

            // Store rotation quaternion (convert from uint8 [0,255] to float [-1,1] and normalize)
            const rot0Norm = (rot0 / 255.0) * 2.0 - 1.0;
            const rot1Norm = (rot1 / 255.0) * 2.0 - 1.0;
            const rot2Norm = (rot2 / 255.0) * 2.0 - 1.0;
            const rot3Norm = (rot3 / 255.0) * 2.0 - 1.0;

            // Normalize quaternion
            const length = Math.sqrt(
                rot0Norm * rot0Norm +
                    rot1Norm * rot1Norm +
                    rot2Norm * rot2Norm +
                    rot3Norm * rot3Norm
            );
            if (length > 0) {
                (columns[10].data as Float32Array)[splatIndex] = rot0Norm / length;
                (columns[11].data as Float32Array)[splatIndex] = rot1Norm / length;
                (columns[12].data as Float32Array)[splatIndex] = rot2Norm / length;
                (columns[13].data as Float32Array)[splatIndex] = rot3Norm / length;
            } else {
                // Default to identity quaternion if invalid
                (columns[10].data as Float32Array)[splatIndex] = 0.0;
                (columns[11].data as Float32Array)[splatIndex] = 0.0;
                (columns[12].data as Float32Array)[splatIndex] = 0.0;
                (columns[13].data as Float32Array)[splatIndex] = 1.0;
            }
        }
    }

    return {
        comments: [],
        elements: [
            {
                name: 'vertex',
                dataTable: new DataTable(columns),
            },
        ],
    };
};

/**
 * Read SPLAT data from a File object
 * @param file - The File object containing SPLAT data
 * @returns Promise that resolves to SplatData
 */
export const readSplatFromFile = async (file: File): Promise<SplatData> => {
    const buffer = await file.arrayBuffer();
    return readSplatFromBuffer(buffer);
};

// Legacy function for backward compatibility
export const readSplat = async (fileHandle: any): Promise<SplatData> => {
    if (fileHandle instanceof File) {
        return readSplatFromFile(fileHandle);
    }
    throw new Error('Unsupported file handle type');
};
