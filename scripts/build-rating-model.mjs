/**
 * Build linear regression models to predict Larrin Thomas's steel ratings
 * (toughness, edge retention, corrosion resistance) from composition.
 *
 * Uses normal equations: β = (X^T X)^{-1} X^T y
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');

const ratings = JSON.parse(readFileSync(join(dataDir, 'larrin-ratings.json'), 'utf-8'));
const steels = JSON.parse(readFileSync(join(dataDir, 'steels.json'), 'utf-8'));

// --- Name mapping: Larrin name -> steels.json lookup strategy ---
const nameMap = {
  '8670': { matchName: '8670' },
  '5160': { matchName: '5160' },
  '52100': { matchName: '52100' },
  'CruForgeV': null, // not in database
  '1084': { matchName: '1084' },
  '80CrV2': { matchName: '80CrV2' },
  'L6': { matchAlias: 'L6' },
  'ApexUltra': { matchName: 'ApexUltra' },
  '26C3': { matchAlias: '26C3' },
  'V-Toku2': { matchAlias: 'V-Toku2' },
  '1.2442': { matchName: '1.2442' },
  'O1': { matchAlias: 'O1' },
  '1.2519': { matchName: '1.2519' },
  'Blue Super': { matchAlias: 'Blue Super' },
  '1.2562': { matchAlias: '1.2562' },
  '1095': { matchAlias: '1095' },
  '10V': { matchName: 'CPM 10V' },
  '15V': { matchName: 'CPM 15V' },
  '3V': { matchName: 'CPM 3V' },
  'A2': { matchName: 'A2' },
  'CPM-CruWear': { matchName: 'Cru-Wear' },
  'CPM-M4': { matchName: 'CPM M4' },
  'D2': { matchName: 'D2' },
  'K390': { matchName: 'K390' },
  'M2': { matchName: 'M2' },
  'Maxamet': { matchName: 'Maxamet' },
  'Rex 121': { matchName: 'CPM Rex 121' },
  'Rex 45/HAP40': { matchName: 'HAP40' },
  'V4E/4V': { matchName: 'CPM 4V' },
  'Vanadis 8': { matchName: 'Vanadis 8' },
  'ZDP-189': { matchName: 'ZDP-189' },
  'Z-Max': { matchName: 'Z-Max' },
  'Z-Tuff': { matchName: 'Z-Tuff' },
  '1.4116': { matchName: '1.4116' },
  '14C28N': { matchName: '14C28N' },
  '154CM': { matchAlias: '154CM' },
  '420HC': { matchName: '420HC' },
  '440A': { matchAlias: '440A' },
  '440C': { matchAlias: '440C' },
  'AEB-L': { matchAlias: 'AEB-L' },
  'AUS-8/8Cr13MoV': { matchName: 'AUS8' },
  'BD1N': { matchName: 'CTS-BD1N' },
  'CPM-154': { matchName: 'CPM154' },
  'Elmax': { matchName: 'Elmax' },
  'LC200N': { matchName: 'LC200N' },
  'M390/20CV/204P': { matchAlias: 'M390' },
  'M398': { matchName: 'M398' },
  'MagnaCut': { matchAlias: 'MagnaCut' },
  'N690': { matchName: 'N690' },
  'Nitro-V': { matchName: 'Nitro-V' },
  'S110V': { matchName: 'CPM S110V' },
  'S125V': { matchName: 'CPM S125V' },
  'S30V': { matchName: 'CPM S30V' },
  'S35VN': { matchName: 'CPM S35VN' },
  'S45VN': { matchName: 'CPM S45VN' },
  'S60V': { matchName: 'CPM S60V' },
  'S90V': { matchName: 'CPM S90V' },
  'Super Gold 2': { matchName: 'R2' },
  'Vanax': { matchName: 'Vanax SuperClean' },
  'VG10': { matchAlias: 'VG10' },
  'XHP': { matchName: 'CTS-XHP' },
};

// Find steel in database
function findSteel(spec) {
  if (!spec) return null;
  if (spec.matchName) {
    return steels.find(s => s.name === spec.matchName) || null;
  }
  if (spec.matchAlias) {
    return steels.find(s => s.aliases && s.aliases.includes(spec.matchAlias)) || null;
  }
  return null;
}

// Extract composition value (average of range if [min, max])
function getElement(comp, el) {
  if (!comp || !comp[el]) return 0;
  const arr = comp[el];
  if (arr.length === 1) return arr[0];
  return (arr[0] + arr[1]) / 2;
}

// Features: C, Cr, Mo, V, W, Co, Nb, N, isPM
const FEATURES = ['C', 'Cr', 'Mo', 'V', 'W', 'Co', 'Nb', 'N'];

function isPM(steel) {
  const t = (steel.tech || '').toUpperCase();
  return (t === 'PM' || t === 'CPM' || t === 'MM') ? 1 : 0;
}

// Build matched dataset
const matched = [];
const unmatched = [];

for (const r of ratings) {
  const spec = nameMap[r.name];
  const steel = findSteel(spec);
  if (steel && steel.composition) {
    const features = FEATURES.map(el => getElement(steel.composition, el));
    features.push(isPM(steel));
    matched.push({
      name: r.name,
      steelName: steel.name,
      tech: steel.tech,
      toughness: r.toughness,
      edgeRetention: r.edgeRetention,
      corrosion: r.corrosion,
      features,
    });
  } else {
    unmatched.push(r.name);
  }
}

console.log(`Matched: ${matched.length} steels`);
console.log(`Unmatched: ${unmatched.length} steels: ${unmatched.join(', ')}`);
console.log('');

// --- Linear algebra helpers ---

// Transpose matrix
function transpose(A) {
  const rows = A.length, cols = A[0].length;
  const T = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      T[j][i] = A[i][j];
  return T;
}

// Matrix multiply
function matmul(A, B) {
  const m = A.length, n = B[0].length, p = B.length;
  const C = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

// Matrix-vector multiply
function matvec(A, v) {
  return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
}

// Invert matrix via Gauss-Jordan elimination
function invert(M) {
  const n = M.length;
  // Augment with identity
  const A = M.map((row, i) => {
    const aug = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) aug[j] = row[j];
    aug[n + i] = 1;
    return aug;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) {
      console.warn(`Near-singular matrix at col ${col}, pivot=${pivot}`);
      // Add small regularization
      A[col][col] += 1e-8;
    }
    const piv = A[col][col];
    for (let j = 0; j < 2 * n; j++) A[col][j] /= piv;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      for (let j = 0; j < 2 * n; j++) A[row][j] -= factor * A[col][j];
    }
  }

  return A.map(row => row.slice(n));
}

// OLS: β = (X^T X)^{-1} X^T y
function ols(X, y) {
  const Xt = transpose(X);
  const XtX = matmul(Xt, X);
  const XtX_inv = invert(XtX);
  const Xty = matvec(Xt, y);
  const beta = matvec(XtX_inv, Xty);
  return beta;
}

// Compute R²
function rSquared(y, yPred) {
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  const ssTotal = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
  return 1 - ssRes / ssTotal;
}

// Build design matrix (with intercept)
const featureNames = [...FEATURES, 'isPM', 'intercept'];
const X = matched.map(m => [...m.features, 1]); // add intercept

const targets = ['toughness', 'edgeRetention', 'corrosion'];
const models = {};

for (const target of targets) {
  const y = matched.map(m => m[target]);
  const beta = ols(X, y);
  const yPred = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const r2 = rSquared(y, yPred);

  models[target] = {
    coefficients: Object.fromEntries(featureNames.map((f, i) => [f, Math.round(beta[i] * 10000) / 10000])),
    r2: Math.round(r2 * 10000) / 10000,
  };

  console.log(`=== ${target.toUpperCase()} ===`);
  console.log(`R² = ${r2.toFixed(4)}`);
  console.log('Coefficients:');
  featureNames.forEach((f, i) => {
    console.log(`  ${f.padEnd(12)} ${beta[i].toFixed(4)}`);
  });
  console.log('');
  console.log('Predictions vs Actuals:');
  console.log('  Steel'.padEnd(22) + 'Actual  Predicted  Error');
  matched.forEach((m, idx) => {
    const pred = yPred[idx];
    const err = pred - m[target];
    console.log(`  ${m.name.padEnd(20)} ${m[target].toString().padEnd(8)} ${pred.toFixed(2).padEnd(10)} ${err >= 0 ? '+' : ''}${err.toFixed(2)}`);
  });
  console.log('');
}

// Save model
const modelOutput = {
  features: featureNames,
  description: 'Linear regression models for predicting Larrin Thomas steel ratings from composition',
  models,
  trainingData: matched.map(m => ({
    name: m.name,
    steelName: m.steelName,
    features: Object.fromEntries(featureNames.map((f, i) => [f, i < m.features.length ? m.features[i] : 1])),
    actual: { toughness: m.toughness, edgeRetention: m.edgeRetention, corrosion: m.corrosion },
  })),
};

writeFileSync(join(dataDir, 'rating-model.json'), JSON.stringify(modelOutput, null, 2));
console.log(`Model saved to src/data/rating-model.json`);
console.log(`Training samples: ${matched.length}`);
