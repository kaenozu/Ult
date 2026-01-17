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
  const squaredDiffs = vector.map((val) => Math.pow(val - mean, 2));
  return Math.sqrt(
    squaredDiffs.reduce((sum, val) => sum + val, 0) / vector.length,
  );
}

export function standardize(vector: Vector): Vector {
  const mean = calculateMean(vector);
  const std = calculateStdDev(vector);
  return vector.map((val) => (val - mean) / (std || 1));
}

export function calculateCorrelation(v1: Vector, v2: Vector): number {
  const z1 = standardize(v1);
  const z2 = standardize(v2);
  const n = v1.length;
  const dotProduct = z1.reduce((sum, val, i) => sum + val * z2[i], 0);
  return dotProduct / (n - 1);
}

export function calculateCorrelationMatrix(
  stockData: StockPriceData[],
): Matrix {
  const n = stockData.length;
  const matrix: Matrix = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const correlation = calculateCorrelation(
        stockData[i].prices,
        stockData[j].prices,
      );
      matrix[i][j] = correlation;
      matrix[j][i] = correlation;
    }
  }

  return matrix;
}

export function transposeMatrix(matrix: Matrix): Matrix {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;

  const result: Matrix = Array(aRows)
    .fill(0)
    .map(() => Array(bCols).fill(0));

  for (let i = 0; i < aRows; i++) {
    for (let j = 0; j < bCols; j++) {
      for (let k = 0; k < aCols; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

export function multiplyMatrixVector(matrix: Matrix, vector: Vector): Vector {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: Vector = Array(rows).fill(0);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[i] += matrix[i][j] * vector[j];
    }
  }

  return result;
}

export function dotProduct(v1: Vector, v2: Vector): number {
  return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
}

export function vectorLength(v: Vector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

export function normalizeVector(v: Vector): Vector {
  const len = vectorLength(v);
  if (len === 0) return v;
  return v.map((val) => val / len);
}

export function subtractVectors(v1: Vector, v2: Vector): Vector {
  return v1.map((val, i) => val - v2[i]);
}

export function multiplyVectorScalar(v: Vector, scalar: number): Vector {
  return v.map((val) => val * scalar);
}

export function powerIteration(
  matrix: Matrix,
  numIterations: number = 100,
  tolerance: number = 1e-10,
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
  numComponents: number = 3,
): PCAResult {
  if (stockData.length < 2) {
    throw new Error("Need at least 2 stocks for PCA");
  }

  const n = stockData.length;

  const standardizedPrices = stockData.map((stock) =>
    standardize(stock.prices),
  );

  const transpose = transposeMatrix(standardizedPrices);
  const covarianceMatrix = multiplyMatrices(standardizedPrices, transpose);

  const eigenvalues: number[] = [];
  const eigenvectors: Vector[] = [];
  let remainingMatrix = covarianceMatrix.map((row) => [...row]);

  for (let i = 0; i < numComponents; i++) {
    const { eigenvalue, eigenvector } = powerIteration(remainingMatrix, 200);
    eigenvalues.push(eigenvalue);
    eigenvectors.push(eigenvector);

    const eigenVectorMatrix = eigenvector.map((val) => [val]);
    const transposeEV = transposeMatrix(eigenVectorMatrix);
    const outerProduct = multiplyMatrices(eigenVectorMatrix, transposeEV);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        remainingMatrix[r][c] -= outerProduct[r][c] * eigenvalue;
      }
    }
  }

  const totalVariance = eigenvalues.reduce((sum, val) => sum + val, 0);
  const explainedVariance = eigenvalues.map((val) => val / totalVariance);

  const positions: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const point: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < numComponents; j++) {
      point[j] = eigenvectors[j][i] * Math.sqrt(Math.abs(eigenvalues[j]));
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
  numDimensions: number = 3,
): [number, number, number][] {
  const n = correlationMatrix.length;

  const squaredMatrix = correlationMatrix.map((row) =>
    row.map((val) => val * val),
  );

  const rowMeans = squaredMatrix.map(
    (row) => row.reduce((a, b) => a + b, 0) / n,
  );
  const colMeans = squaredMatrix
    .map((_, col) => squaredMatrix.reduce((sum, row) => sum + row[col], 0) / n)
    .slice(0, n);
  const grandMean = rowMeans.reduce((a, b) => a + b, 0) / n;

  const bMatrix: Matrix = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      bMatrix[i][j] =
        -0.5 * (squaredMatrix[i][j] - rowMeans[i] - colMeans[j] + grandMean);
    }
  }

  const eigenvectors: Vector[] = [];
  const eigenvalues: number[] = [];
  let remainingMatrix = bMatrix.map((row) => [...row]);

  for (let i = 0; i < numDimensions; i++) {
    const { eigenvalue, eigenvector } = powerIteration(remainingMatrix, 300);
    eigenvalues.push(eigenvalue);
    eigenvectors.push(eigenvector);

    const eigenVectorMatrix = eigenvector.map((val) => [val]);
    const transposeEV = transposeMatrix(eigenVectorMatrix);
    const outerProduct = multiplyMatrices(eigenVectorMatrix, transposeEV);

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        remainingMatrix[r][c] -= outerProduct[r][c] * eigenvalue;
      }
    }
  }

  const positions: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const pos: [number, number, number] = [0, 0, 0];
    for (let d = 0; d < numDimensions; d++) {
      const eigenvalue = eigenvalues[d];
      if (eigenvalue > 0) {
        pos[d] = eigenvectors[d][i] * Math.sqrt(eigenvalue);
      }
    }
    positions.push(pos);
  }

  return positions;
}

export function generateMockStockPrices(
  numStocks: number,
  numDays: number = 100,
): StockPriceData[] {
  const sectors = [
    "Technology",
    "Healthcare",
    "Financial",
    "Energy",
    "Consumer",
    "Industrial",
    "Materials",
    "Utilities",
    "Real Estate",
    "Communication",
  ];

  const symbols: string[] = [];
  const basePrices: number[] = [];
  const volatilities: number[] = [];
  const sectorsAssigned: string[] = [];

  for (let i = 0; i < numStocks; i++) {
    const sectorIndex = i % sectors.length;
    const prefix = sectors[sectorIndex].substring(0, 3).toUpperCase();
    symbols.push(`${prefix}${i}`);
    basePrices.push(50 + Math.random() * 150);
    volatilities.push(0.01 + Math.random() * 0.03);
    sectorsAssigned.push(sectors[sectorIndex]);
  }

  const marketTrend = Array(numDays)
    .fill(0)
    .map(() => (Math.random() - 0.48) * 0.02);

  const sectorTrends = sectors.map(() =>
    Array(numDays)
      .fill(0)
      .map(() => (Math.random() - 0.5) * 0.015),
  );

  return symbols.map((symbol, i) => {
    const prices: number[] = [];
    let price = basePrices[i];

    for (let day = 0; day < numDays; day++) {
      const sectorIndex = sectorsAssigned[i]
        ? sectors.indexOf(sectorsAssigned[i])
        : 0;
      const sectorTrend = sectorTrends[sectorIndex]?.[day] || 0;

      const change =
        marketTrend[day] * 0.7 +
        sectorTrend * 0.2 +
        (Math.random() - 0.5) * volatilities[i];

      price = price * (1 + change);
      prices.push(price);
    }

    return {
      symbol,
      sector: sectorsAssigned[i],
      prices,
    };
  });
}
