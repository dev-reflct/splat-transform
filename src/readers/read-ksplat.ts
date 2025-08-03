import { Column, DataTable } from '../data-table';

export type KsplatFileData = {
    comments: string[];
    elements: {
        name: string;
        dataTable: DataTable;
    }[];
};

interface CompressionConfig {
    centerBytes: number;
    scaleBytes: number;
    rotationBytes: number;
    colorBytes: number;
    harmonicsBytes: number;
    scaleStartByte: number;
    rotationStartByte: number;
    colorStartByte: number;
    harmonicsStartByte: number;
    scaleQuantRange: number;
}

function decodeFloat16(encoded: number): number {
    const sign = (encoded >> 15) & 1;
    const exponent = (encoded >> 10) & 0x1f;
    const mantissa = encoded & 0x3ff;

    if (exponent === 0) {
        return 0;
    }

    const bias = 15;
    const actualExponent = exponent - bias;
    const actualMantissa = mantissa / 1024.0;

    const value = (1.0 + actualMantissa) * Math.pow(2, actualExponent);
    return sign ? -value : value;
}

function decodeHarmonics(data: DataView, offset: number, component: number): number {
    // This is a simplified implementation
    // In a real implementation, you would decode the spherical harmonics properly
    return 0.0;
}

/**
 * Read KSPLAT data from an ArrayBuffer
 * @param buffer - The ArrayBuffer containing KSPLAT data
 * @returns Promise that resolves to KsplatFileData
 */
export const readKsplatFromBuffer = async (buffer: ArrayBuffer): Promise<KsplatFileData> => {
    const data = new Uint8Array(buffer);

    if (data.length < 8) {
        throw new Error('File too small to be a valid .ksplat file');
    }

    const view = new DataView(buffer);

    // Read header
    const magic = new TextDecoder().decode(data.subarray(0, 4));
    if (magic !== 'KSPL') {
        throw new Error('Invalid .ksplat file: wrong magic number');
    }

    const version = view.getUint32(4, true);
    if (version !== 1) {
        throw new Error(`Unsupported .ksplat version: ${version}`);
    }

    // Read file header
    const headerSize = view.getUint32(8, true);
    const numSplats = view.getUint32(12, true);
    const compressionMode = view.getUint8(16);
    const harmonicsComponentCount = view.getUint8(17);
    const bucketCount = view.getUint16(18, true);
    const bucketStorageSize = view.getUint32(20, true);

    // Calculate compression config
    const compressionConfig: CompressionConfig = {
        centerBytes: 12,
        scaleBytes: compressionMode === 0 ? 12 : 6,
        rotationBytes: compressionMode === 0 ? 16 : 8,
        colorBytes: 4,
        harmonicsBytes: harmonicsComponentCount * (compressionMode === 0 ? 4 : 2),
        scaleStartByte: 12,
        rotationStartByte: 12 + (compressionMode === 0 ? 12 : 6),
        colorStartByte: 12 + (compressionMode === 0 ? 12 : 6) + (compressionMode === 0 ? 16 : 8),
        harmonicsStartByte:
            12 + (compressionMode === 0 ? 12 : 6) + (compressionMode === 0 ? 16 : 8) + 4,
        scaleQuantRange: compressionMode === 0 ? 1.0 : 0.1,
    };

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

    // Add spherical harmonics columns
    for (let i = 0; i < harmonicsComponentCount; i++) {
        columns.push(new Column(`f_rest_${i}`, new Float32Array(numSplats)));
    }

    // Read bucket data
    let currentSectionDataOffset = headerSize;
    let splatIndex = 0;

    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
        // Read bucket header
        const bucketHeaderOffset = currentSectionDataOffset;
        const bucketHeaderSize = view.getUint32(bucketHeaderOffset, true);
        const sectionDataSize = view.getUint32(bucketHeaderOffset + 4, true);
        const totalBucketStorageSize = view.getUint32(bucketHeaderOffset + 8, true);

        // Read section data
        const sectionDataOffset = bucketHeaderOffset + bucketHeaderSize;
        const sectionData = new DataView(buffer, sectionDataOffset, sectionDataSize);

        // Process each splat in this bucket
        const splatsInBucket =
            sectionDataSize /
            (compressionConfig.centerBytes +
                compressionConfig.scaleBytes +
                compressionConfig.rotationBytes +
                compressionConfig.colorBytes +
                compressionConfig.harmonicsBytes);

        for (let i = 0; i < splatsInBucket && splatIndex < numSplats; i++) {
            const splatByteOffset =
                i *
                (compressionConfig.centerBytes +
                    compressionConfig.scaleBytes +
                    compressionConfig.rotationBytes +
                    compressionConfig.colorBytes +
                    compressionConfig.harmonicsBytes);

            // Decode position
            const x = sectionData.getFloat32(splatByteOffset, true);
            const y = sectionData.getFloat32(splatByteOffset + 4, true);
            const z = sectionData.getFloat32(splatByteOffset + 8, true);

            // Decode scale
            let scaleX: number, scaleY: number, scaleZ: number;
            if (compressionMode === 0) {
                scaleX = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.scaleStartByte,
                    true
                );
                scaleY = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.scaleStartByte + 4,
                    true
                );
                scaleZ = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.scaleStartByte + 8,
                    true
                );
            } else {
                scaleX = decodeFloat16(
                    sectionData.getUint16(splatByteOffset + compressionConfig.scaleStartByte, true)
                );
                scaleY = decodeFloat16(
                    sectionData.getUint16(
                        splatByteOffset + compressionConfig.scaleStartByte + 2,
                        true
                    )
                );
                scaleZ = decodeFloat16(
                    sectionData.getUint16(
                        splatByteOffset + compressionConfig.scaleStartByte + 4,
                        true
                    )
                );
            }

            // Decode rotation quaternion
            let rot0: number, rot1: number, rot2: number, rot3: number;
            if (compressionMode === 0) {
                rot0 = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.rotationStartByte,
                    true
                );
                rot1 = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.rotationStartByte + 4,
                    true
                );
                rot2 = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.rotationStartByte + 8,
                    true
                );
                rot3 = sectionData.getFloat32(
                    splatByteOffset + compressionConfig.rotationStartByte + 12,
                    true
                );
            } else {
                rot0 = decodeFloat16(
                    sectionData.getUint16(
                        splatByteOffset + compressionConfig.rotationStartByte,
                        true
                    )
                );
                rot1 = decodeFloat16(
                    sectionData.getUint16(
                        splatByteOffset + compressionConfig.rotationStartByte + 2,
                        true
                    )
                );
                rot2 = decodeFloat16(
                    sectionData.getUint16(
                        splatByteOffset + compressionConfig.rotationStartByte + 4,
                        true
                    )
                );
                rot3 = decodeFloat16(
                    sectionData.getUint16(
                        splatByteOffset + compressionConfig.rotationStartByte + 6,
                        true
                    )
                );
            }

            // Decode color and opacity
            const red = sectionData.getUint8(splatByteOffset + compressionConfig.colorStartByte);
            const green = sectionData.getUint8(
                splatByteOffset + compressionConfig.colorStartByte + 1
            );
            const blue = sectionData.getUint8(
                splatByteOffset + compressionConfig.colorStartByte + 2
            );
            const opacity = sectionData.getUint8(
                splatByteOffset + compressionConfig.colorStartByte + 3
            );

            // Store position
            (columns[0].data as Float32Array)[splatIndex] = x;
            (columns[1].data as Float32Array)[splatIndex] = y;
            (columns[2].data as Float32Array)[splatIndex] = z;

            // Store scale (convert from linear in .ksplat to log scale for internal use)
            (columns[3].data as Float32Array)[splatIndex] = scaleX > 0 ? Math.log(scaleX) : -10;
            (columns[4].data as Float32Array)[splatIndex] = scaleY > 0 ? Math.log(scaleY) : -10;
            (columns[5].data as Float32Array)[splatIndex] = scaleZ > 0 ? Math.log(scaleZ) : -10;

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

            // Store quaternion
            (columns[10].data as Float32Array)[splatIndex] = rot0;
            (columns[11].data as Float32Array)[splatIndex] = rot1;
            (columns[12].data as Float32Array)[splatIndex] = rot2;
            (columns[13].data as Float32Array)[splatIndex] = rot3;

            // Store spherical harmonics
            for (let i = 0; i < harmonicsComponentCount; i++) {
                let channel;
                let coeff;

                // band 0 is packed together, then band 1, then band 2.
                if (i < 9) {
                    channel = Math.floor(i / 3);
                    coeff = i % 3;
                } else if (i < 24) {
                    channel = Math.floor((i - 9) / 5);
                    coeff = ((i - 9) % 5) + 3;
                } else {
                    // don't think 3 bands are supported, but here just in case
                    channel = Math.floor((i - 24) / 7);
                    coeff = ((i - 24) % 7) + 8;
                }

                const col = channel * (harmonicsComponentCount / 3) + coeff;

                (columns[14 + col].data as Float32Array)[splatIndex] = decodeHarmonics(
                    sectionData,
                    splatByteOffset,
                    i
                );
            }

            splatIndex++;
        }

        currentSectionDataOffset += sectionDataSize + totalBucketStorageSize;
    }

    if (splatIndex !== numSplats) {
        throw new Error(`Splat count mismatch: expected ${numSplats}, processed ${splatIndex}`);
    }

    const resultTable = new DataTable(columns);

    return {
        comments: [],
        elements: [
            {
                name: 'vertex',
                dataTable: resultTable,
            },
        ],
    };
};

/**
 * Read KSPLAT data from a File object
 * @param file - The File object containing KSPLAT data
 * @returns Promise that resolves to KsplatFileData
 */
export const readKsplatFromFile = async (file: File): Promise<KsplatFileData> => {
    const buffer = await file.arrayBuffer();
    return readKsplatFromBuffer(buffer);
};

// Legacy function for backward compatibility
export const readKsplat = async (fileHandle: any): Promise<KsplatFileData> => {
    if (fileHandle instanceof File) {
        return readKsplatFromFile(fileHandle);
    }
    throw new Error('Unsupported file handle type');
};
