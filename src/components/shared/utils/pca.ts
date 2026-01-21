export type Matrix = number[][];
export type Vector = number[];

export interface StockPriceData {
  symbol: string;
  prices: number[];
}

export interface PCAResult {
  positions: [number, number, number][];
  explainedVariance: number[];
  loadings: Matrix;
}

export function calculateMean(vector: Vector): number {
  return vector.reduce((sum, val) => sum + val, 0) / vector.length;
}

export function calculateStdDev(vector: Vector): number {
  const mean = calculateMean(vector);
  const squaredDiffs = vector.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(
    squaredDiffs.reduce((sum, val) => sum + val, 0) / vector.length
  );
}

export function standardize(vector: Vector): Vector {
  const mean = calculateMean(vector);
  const std = calculateStdDev(vector);
  return vector.map(val => (val - mean) / (std || 1));
}

export function calculateCorrelation(v1: Vector, v2: Vector): number {
  if (v1.length !== v2.length || v1.length === 0) {
    return 0;
  }

  const z1 = standardize(v1);
  const z2 = standardize(v2);
  const n = v1.length;
  const dotProduct = z1.reduce((sum, val, i) => sum + val * (z2[i] || 0), 0);
  return dotProduct / (n - 1);
}

export function calculateCorrelationMatrix(
  stockData: StockPriceData[]
): Matrix {
  const n = stockData.length;
  const matrix: Matrix = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    const dataI = stockData[i];
    const rowI = matrix[i];
    if (!dataI || !rowI) continue;

    for (let j = i; j < n; j++) {
      const dataJ = stockData[j];
      const rowJ = matrix[j];
      if (!dataJ || !rowJ) continue;

      const correlation = calculateCorrelation(dataI.prices, dataJ.prices);
      rowI[j] = correlation;
      rowJ[i] = correlation;
    }
  }

  return matrix;
}

export function transposeMatrix(matrix: Matrix): Matrix {
  if (matrix.length === 0 || !matrix[0]) return [];
  const firstRow = matrix[0];
  return firstRow.map((_, colIndex) =>
    matrix.map((row) => (row && row[colIndex] !== undefined ? row[colIndex]! : 0)),
  );
}

export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  const aRows = a.length;
  if (aRows === 0 || !a[0]) return [];
  const aCols = a[0]!.length;
  if (b.length === 0 || !b[0]) return [];
  const bCols = b[0]!.length;

  const result: Matrix = Array(aRows)
    .fill(0)
    .map(() => Array(bCols).fill(0));

  for (let i = 0; i < aRows; i++) {
    const rowA = a[i];
    const rowRes = result[i];
    if (!rowA || !rowRes) continue;

    for (let j = 0; j < bCols; j++) {
      let sum = 0;
      for (let k = 0; k < aCols; k++) {
        const rowB = b[k];
        if (!rowB) continue;
        sum += (rowA[k] || 0) * (rowB[j] || 0);
      }
      rowRes[j] = sum;
    }
  }

  return result;
}

export function multiplyMatrixVector(matrix: Matrix, vector: Vector): Vector {
  const rows = matrix.length;
  if (rows === 0 || !matrix[0]) return [];
  const cols = matrix[0]!.length;
  const result: Vector = Array(rows).fill(0);

  for (let i = 0; i < rows; i++) {
    const row = matrix[i];
    if (!row) continue;
    let sum = 0;
    for (let j = 0; j < cols; j++) {
      sum += (row[j] || 0) * (vector[j] || 0);
    }
    result[i] = sum;
  }

  return result;
}

export function dotProduct(v1: Vector, v2: Vector): number {
  return v1.reduce((sum, val, i) => sum + val * (v2[i] || 0), 0);
}

export function vectorLength(v: Vector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

export function normalizeVector(v: Vector): Vector {
  const len = vectorLength(v);
  if (len === 0) return v;
  return v.map(val => val / len);
}

export function subtractVectors(v1: Vector, v2: Vector): Vector {
  return v1.map((val, i) => val - (v2[i] || 0));
}

export function multiplyVectorScalar(v: Vector, scalar: number): Vector {
  return v.map(val => val * scalar);
}

export function powerIteration(
  matrix: Matrix,
  numIterations: number = 100,
  tolerance: number = 1e-10
): { eigenvalue: number; eigenvector: Vector } {
  const n = matrix.length;
  let b = Array(n)
    .fill(1)
    .map(() => Math.random());
  b = normalizeVector(b);

  for (let iter = 0; iter < numIterations; iter++) {
    const bNew = multiplyMatrixVector(matrix, b);
    const bNorm = normalizeVector(bNew);

    const delta = vectorLength(subtractVectors(bNorm, b));
    if (delta < tolerance) break;

    b = bNorm;
  }

  const Ab = multiplyMatrixVector(matrix, b);
  const eigenvalue = dotProduct(b, Ab);

  return { eigenvalue, eigenvector: b };
}

export function calculatePCA(
  stockData: StockPriceData[],
  numComponents: number = 3
): PCAResult {
  if (stockData.length < 2) {
    throw new Error('Need at least 2 stocks for PCA');
  }

  const n = stockData.length;

  const standardizedPrices = stockData.map(stock => standardize(stock.prices));

  const transpose = transposeMatrix(standardizedPrices);
  const covarianceMatrix = multiplyMatrices(standardizedPrices, transpose);

  const eigenvalues: number[] = [];
  const eigenvectors: Vector[] = [];
  let remainingMatrix = covarianceMatrix.map(row => [...row]);

  for (let i = 0; i < numComponents; i++) {
    const { eigenvalue, eigenvector } = powerIteration(remainingMatrix, 200);
    eigenvalues.push(eigenvalue);
    eigenvectors.push(eigenvector);

    const eigenVectorMatrix = eigenvector.map(val => [val]);
    const transposeEV = transposeMatrix(eigenVectorMatrix);
    const outerProduct = multiplyMatrices(eigenVectorMatrix, transposeEV);

    for (let r = 0; r < n; r++) {
      const rowRem = remainingMatrix[r];
      const rowOuter = outerProduct[r];
      if (!rowRem || !rowOuter) continue;
      for (let c = 0; c < n; c++) {
        rowRem[c] = (rowRem[c] || 0) - (rowOuter[c] || 0) * eigenvalue;
      }
    }
  }

  const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
  const explainedVariance = eigenvalues.map(val => val / totalVariance);

  const positions: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const point: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < numComponents; j++) {
      const ev = eigenvectors[j];
      const evalue = eigenvalues[j];
      if (ev && evalue !== undefined) {
        point[j as 0 | 1 | 2] = (ev[i] || 0) * Math.sqrt(Math.abs(evalue));
      }
    }
    positions.push(point);
  }

  return {
    positions,
    explainedVariance,
    loadings: eigenvectors,
  };
}

export function calculateMDS(
  correlationMatrix: Matrix,
  numDimensions: number = 3
): [number, number, number][] {
  const n = correlationMatrix.length;

  const squaredMatrix = correlationMatrix.map(row => row.map(val => val * val));

  const rowMeans = squaredMatrix.map(row => row.reduce((a, b) => a + b, 0) / n);
  const colMeans = squaredMatrix
    .map((_, col) => squaredMatrix.reduce((sum, row) => sum + (row[col] || 0), 0) / n)
    .slice(0, n);
  const grandMean = rowMeans.reduce((a, b) => a + b, 0) / n;

  const bMatrix: Matrix = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    const rowB = bMatrix[i];
    const rowSq = squaredMatrix[i];
    if (!rowB || !rowSq) continue;
    for (let j = 0; j < n; j++) {
      rowB[j] =
        -0.5 *
        ((rowSq[j] || 0) -
          (rowMeans[i] || 0) -
          (colMeans[j] || 0) +
          grandMean);
    }
  }

  const eigenvectors: Vector[] = [];
  const eigenvalues: number[] = [];
  let remainingMatrix = bMatrix.map(row => [...row]);

  for (let i = 0; i < numDimensions; i++) {
    const { eigenvalue, eigenvector } = powerIteration(remainingMatrix, 300);
    eigenvalues.push(eigenvalue);
    eigenvectors.push(eigenvector);

    const eigenVectorMatrix = eigenvector.map(val => [val]);
    const transposeEV = transposeMatrix(eigenVectorMatrix);
    const outerProduct = multiplyMatrices(eigenVectorMatrix, transposeEV);

    for (let r = 0; r < n; r++) {
      const rowRem = remainingMatrix[r];
      const rowOuter = outerProduct[r];
      if (!rowRem || !rowOuter) continue;
      for (let c = 0; c < n; c++) {
        rowRem[c] = (rowRem[c] || 0) - (rowOuter[c] || 0) * eigenvalue;
      }
    }
  }

  const positions: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const pos: [number, number, number] = [0, 0, 0];
    for (let d = 0; d < numDimensions; d++) {
      const eigenvalue = eigenvalues[d];
      const ev = eigenvectors[d];
      if (eigenvalue !== undefined && eigenvalue > 0 && ev) {
        pos[d] = (ev[i] || 0) * Math.sqrt(eigenvalue);
      }
    }
    positions.push(pos);
  }

  return positions;
}

export function generateMockStockPrices(
  numStocks: number,
  numDays: number = 100
): StockPriceData[] {
  const sectors = [
    'Technology',
    'Healthcare',
    'Financial',
    'Energy',
    'Consumer',
    'Industrial',
    'Materials',
    'Utilities',
    'Real Estate',
    'Communication',
  ];

  const symbols: string[] = [];
  const basePrices: number[] = [];
  const volatilities: number[] = [];
  const sectorsAssigned: string[] = [];

  for (let i = 0; i < numStocks; i++) {
    const sector = sectors[i % sectors.length] ?? "Other";
    const prefix = sector.substring(0, 3).toUpperCase();
    symbols.push(`${prefix}${i}`);
    basePrices.push(50 + Math.random() * 150);
    volatilities.push(0.01 + Math.random() * 0.03);
    sectorsAssigned.push(sector);
  }

  const marketTrend = Array(numDays)
    .fill(0)
    .map(() => (Math.random() - 0.48) * 0.02);

  const sectorTrends = sectors.map(() =>
    Array(numDays)
      .fill(0)
      .map(() => (Math.random() - 0.5) * 0.015)
  );

  return symbols.map((symbol, i) => {
    const prices: number[] = [];
    let price = basePrices[i] ?? 100;

    for (let day = 0; day < numDays; day++) {
      const sName = sectorsAssigned[i];
      const sectorIndex = sName ? sectors.indexOf(sName) : 0;
      const sectorTrend = sectorTrends[sectorIndex]?.[day] || 0;

      const change =
        (marketTrend[day] || 0) * 0.7 +
        sectorTrend * 0.2 +
        (Math.random() - 0.5) * (volatilities[i] || 0.02);

      price = price * (1 + change);
      prices.push(price);
    }

    return {
      symbol,
      sector: sectorsAssigned[i] ?? "Other",
      prices,
    };
  });
}
