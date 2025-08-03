import { stdout } from '../browser-polyfills';
import { Column, DataTable } from '../data-table';
import { KdTree } from './kd-tree';
import { GpuCluster } from '../gpu/gpu-cluster';
import { GpuDevice } from '../gpu/gpu-device';

const initializeCentroids = (
    dataTable: DataTable,
    centroids: DataTable,
    row: Record<string, number>
) => {
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

const calcAverage = (dataTable: DataTable, cluster: number[], row: Record<string, number>) => {
    const keys = dataTable.columnNames;

    for (let i = 0; i < keys.length; ++i) {
        row[keys[i]] = 0;
    }

    const dataRow: Record<string, number> = {};
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
    const kdTree = new KdTree(centroids);

    // construct a kdtree over the centroids so we can find the nearest quickly
    const point = new Float32Array(points.numColumns);
    const row: Record<string, number> = {};

    // assign each point to the nearest centroid
    for (let i = 0; i < points.numRows; ++i) {
        points.getRow(i, row);
        points.columns.forEach((c, i) => {
            point[i] = row[c.name];
        });

        const a = kdTree.findNearest(point);

        labels[i] = a.index;
    }
};

const groupLabels = (labels: Uint32Array, k: number) => {
    const groups: number[][] = [];
    for (let i = 0; i < k; ++i) {
        groups.push([]);
    }

    for (let i = 0; i < labels.length; ++i) {
        groups[labels[i]].push(i);
    }

    return groups;
};

const kmeans = async (points: DataTable, k: number, iterations: number, device?: unknown) => {
    stdout.write(`kmeans: ${points.numRows} points, ${k} clusters, ${iterations} iterations\n`);

    // initialize centroids
    const centroids = new DataTable(
        points.columns.map(
            c =>
                new Column(
                    c.name,
                    new (c.data.constructor as new (
                        length: number
                    ) => Float32Array | Uint8Array | Uint32Array)(k)
                )
        )
    );
    const row: Record<string, number> = {};
    initializeCentroids(points, centroids, row);

    // initialize labels
    const labels = new Uint32Array(points.numRows);

    // iterate
    for (let i = 0; i < iterations; ++i) {
        stdout.write(`iteration ${i + 1}/${iterations}\n`);

        // assign points to centroids
        if (device) {
            // GPU clustering
            const gpuCluster = new GpuCluster(device as unknown as GpuDevice, points, k);
            await gpuCluster.execute(centroids, labels);
        } else {
            // CPU clustering with KD-tree optimization
            clusterKdTreeCpu(points, centroids, labels);
        }

        // update centroids
        const groups = groupLabels(labels, k);
        for (let j = 0; j < k; ++j) {
            calcAverage(points, groups[j], row);
            centroids.setRow(j, row);
        }
    }

    return { centroids, labels };
};

export { kmeans };
