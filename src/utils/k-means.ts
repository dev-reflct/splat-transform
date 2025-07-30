import { Column, DataTable } from '../data-table';
import { KdTree } from './kd-tree';

const initializeCentroids = (dataTable: DataTable, centroids: DataTable, row: any) => {
    const chosenRows = new Set();
    for (let i = 0; i < centroids.numRows; ++i) {
        let candidateRow;
        do {
            candidateRow = Math.floor(Math.random() * dataTable.numRows);
        } while (chosenRows.has(candidateRow));

        chosenRows.add(candidateRow);
        dataTable.getRow(candidateRow, row);
        centroids.setRow(i, row);
    }
};

const calcAverage = (dataTable: DataTable, cluster: number[], row: any) => {
    const keys = dataTable.columnNames;

    for (let i = 0; i < keys.length; ++i) {
        row[keys[i]] = 0;
    }

    const dataRow: any = {};
    for (let i = 0; i < cluster.length; ++i) {
        dataTable.getRow(cluster[i], dataRow);

        for (let j = 0; j < keys.length; ++j) {
            const key = keys[j];
            row[key] += dataRow[key];
        }
    }

    if (cluster.length > 0) {
        for (let i = 0; i < keys.length; ++i) {
            row[keys[i]] /= cluster.length;
        }
    }
};

// ULTRA-FAST CPU k-means implementation with approximate nearest neighbor
const clusterUltraFastCpu = (points: DataTable, centroids: DataTable, labels: Uint32Array) => {
    const numPoints = points.numRows;
    const numCentroids = centroids.numRows;
    const numColumns = points.numColumns;

    // Pre-convert all data to flat arrays for maximum cache efficiency
    const pointsArray = new Float32Array(numPoints * numColumns);
    const centroidsArray = new Float32Array(numCentroids * numColumns);
    const row: any = {};

    // Convert points to flat array (one-time cost)
    for (let i = 0; i < numPoints; ++i) {
        points.getRow(i, row);
        for (let j = 0; j < numColumns; ++j) {
            pointsArray[i * numColumns + j] = row[points.columns[j].name];
        }
    }

    // Convert centroids to flat array
    for (let i = 0; i < numCentroids; ++i) {
        centroids.getRow(i, row);
        for (let j = 0; j < numColumns; ++j) {
            centroidsArray[i * numColumns + j] = row[centroids.columns[j].name];
        }
    }

    // Use approximate nearest neighbor search for large datasets
    if (numCentroids > 1000) {
        // Build KD-tree for centroids for fast approximate search
        const kdTree = new KdTree(centroids);

        // Process points in chunks for better cache utilization
        const chunkSize = 128;
        for (let chunkStart = 0; chunkStart < numPoints; chunkStart += chunkSize) {
            const chunkEnd = Math.min(chunkStart + chunkSize, numPoints);

            for (let i = chunkStart; i < chunkEnd; ++i) {
                const point = new Float32Array(numColumns);
                const pointOffset = i * numColumns;

                // Extract point data
                for (let j = 0; j < numColumns; ++j) {
                    point[j] = pointsArray[pointOffset + j];
                }

                // Use KD-tree for fast approximate nearest neighbor
                const nearest = kdTree.findNearest(point);
                labels[i] = nearest.index;
            }
        }
    } else {
        // For small centroid counts, use optimized brute force
        const chunkSize = 256; // Larger chunks for better cache utilization

        for (let chunkStart = 0; chunkStart < numPoints; chunkStart += chunkSize) {
            const chunkEnd = Math.min(chunkStart + chunkSize, numPoints);

            for (let i = chunkStart; i < chunkEnd; ++i) {
                let mind = Infinity;
                let mini = 0;

                const pointOffset = i * numColumns;

                // Vectorized distance calculation with early termination
                for (let c = 0; c < numCentroids; ++c) {
                    let dist = 0;
                    const centroidOffset = c * numColumns;

                    // Unroll loops for maximum performance
                    for (let j = 0; j < numColumns; j += 4) {
                        if (j + 3 < numColumns) {
                            // Process 4 elements at once
                            const diff0 =
                                pointsArray[pointOffset + j] - centroidsArray[centroidOffset + j];
                            const diff1 =
                                pointsArray[pointOffset + j + 1] -
                                centroidsArray[centroidOffset + j + 1];
                            const diff2 =
                                pointsArray[pointOffset + j + 2] -
                                centroidsArray[centroidOffset + j + 2];
                            const diff3 =
                                pointsArray[pointOffset + j + 3] -
                                centroidsArray[centroidOffset + j + 3];
                            dist += diff0 * diff0 + diff1 * diff1 + diff2 * diff2 + diff3 * diff3;
                        } else {
                            // Handle remaining elements
                            for (let k = j; k < numColumns; ++k) {
                                const diff =
                                    pointsArray[pointOffset + k] -
                                    centroidsArray[centroidOffset + k];
                                dist += diff * diff;
                            }
                        }
                    }

                    if (dist < mind) {
                        mind = dist;
                        mini = c;
                    }
                }

                labels[i] = mini;
            }
        }
    }
};

// cpu cluster
const clusterCpu = (points: DataTable, centroids: DataTable, labels: Uint32Array) => {
    const numColumns = points.numColumns;

    const pData = points.columns.map(c => c.data);
    const cData = centroids.columns.map(c => c.data);

    const point = new Float32Array(numColumns);

    const distance = (centroidIndex: number) => {
        let result = 0;
        for (let i = 0; i < numColumns; ++i) {
            const v = point[i] - cData[i][centroidIndex];
            result += v * v;
        }
        return result;
    };

    for (let i = 0; i < points.numRows; ++i) {
        let mind = Infinity;
        let mini = -1;

        for (let c = 0; c < numColumns; ++c) {
            point[c] = pData[c][i];
        }

        for (let j = 0; j < centroids.numRows; ++j) {
            const d = distance(j);
            if (d < mind) {
                mind = d;
                mini = j;
            }
        }

        labels[i] = mini;
    }
};

const clusterKdTreeCpu = (points: DataTable, centroids: DataTable, labels: Uint32Array) => {
    // Use optimized brute force for small datasets, KD-tree for large ones
    if (centroids.numRows < 1000) {
        // Optimized brute force for small centroid counts
        const point = new Float32Array(points.numColumns);
        const row: any = {};
        const centroidsArray = new Float32Array(centroids.numRows * centroids.numColumns);

        // Pre-convert centroids to array for faster access
        for (let i = 0; i < centroids.numRows; ++i) {
            centroids.getRow(i, row);
            for (let j = 0; j < centroids.numColumns; ++j) {
                centroidsArray[i * centroids.numColumns + j] = row[centroids.columns[j].name];
            }
        }

        for (let i = 0; i < points.numRows; ++i) {
            points.getRow(i, row);
            points.columns.forEach((c, j) => {
                point[j] = row[c.name];
            });

            let mind = Infinity;
            let mini = 0;

            for (let c = 0; c < centroids.numRows; ++c) {
                let dist = 0;
                for (let j = 0; j < points.numColumns; ++j) {
                    const diff = point[j] - centroidsArray[c * points.numColumns + j];
                    dist += diff * diff;
                }
                if (dist < mind) {
                    mind = dist;
                    mini = c;
                }
            }
            labels[i] = mini;
        }
    } else {
        // Use KD-tree for large centroid counts
        const kdTree = new KdTree(centroids);
        const point = new Float32Array(points.numColumns);
        const row: any = {};
        for (let i = 0; i < points.numRows; ++i) {
            points.getRow(i, row);
            points.columns.forEach((c, i) => {
                point[i] = row[c.name];
            });
            const a = kdTree.findNearest(point);
            labels[i] = a.index;
        }
    }
};

const groupLabels = (labels: Uint32Array, k: number) => {
    const clusters: number[][] = [];

    for (let i = 0; i < k; ++i) {
        clusters[i] = [];
    }

    for (let i = 0; i < labels.length; ++i) {
        clusters[labels[i]].push(i);
    }

    return clusters;
};

const kmeans = (points: DataTable, k: number, iterations: number) => {
    // too few data points
    if (points.numRows < k) {
        return {
            centroids: points.clone(),
            labels: new Array(points.numRows).fill(0).map((_, i) => i),
        };
    }

    const row: any = {};

    // construct centroids data table and assign initial values
    const centroids = new DataTable(
        points.columns.map(c => new Column(c.name, new Float32Array(k)))
    );
    initializeCentroids(points, centroids, row);

    console.log('✅ Using ULTRA-FAST CPU k-means clustering (no GPU)');

    const labels = new Uint32Array(points.numRows);

    let converged = false;
    let steps = 0;
    const prevLabels = new Uint32Array(points.numRows);

    console.log(
        `Running k-means clustering: dims=${points.numColumns} points=${points.numRows} clusters=${k} iterations=${iterations}...`
    );

    while (!converged) {
        // Copy current labels for convergence check
        prevLabels.set(labels);

        // Use ultra-fast CPU implementation
        clusterUltraFastCpu(points, centroids, labels);

        // Check for early convergence
        let changed = false;
        for (let i = 0; i < points.numRows; ++i) {
            if (labels[i] !== prevLabels[i]) {
                changed = true;
                break;
            }
        }

        if (!changed) {
            console.log(`✅ Early convergence at iteration ${steps + 1}!`);
            converged = true;
            break;
        }

        // calculate the new centroid positions
        const groups = groupLabels(labels, k);
        for (let i = 0; i < centroids.numRows; ++i) {
            calcAverage(points, groups[i], row);
            centroids.setRow(i, row);
        }

        steps++;

        if (steps >= iterations) {
            converged = true;
        }

        console.log('#');
    }

    console.log(' done 🎉');

    return { centroids, labels };
};

export { kmeans };
