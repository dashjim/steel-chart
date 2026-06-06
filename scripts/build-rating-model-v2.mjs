/**
 * Build v2 linear regression models with metallurgical cross features.
 *
 * Key insights from Larrin Thomas:
 * 1. Edge retention = carbide HARDNESS × VOLUME (V×C >> Cr×C)
 * 2. Corrosion = FREE chromium (Cr minus Cr locked in carbides)
 * 3. Toughness = inverse of carbide volume + PM benefit
 *
 * Uses normal equations: β = (X^T X)^{-1} X^T y
 * No external dependencies — pure Node.js.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'src', 'data');

const ratings = JSON.parse(readFileSync(join(dataDir, 'larrin-ratings.json'), 'utf-8'));
const steels = JSON.parse(readFileSync(join(dataDir, 'steels.json'), 'utf-8'));

// --- Name mapping (reuse from v1) ---
const nameMap = {
  '8670': { matchName: '8670' },
  '5160': { matchName: '5160' },
  '52100': { matchName: '52100' },
  'CruForgeV': null,
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

function findSteel(spec) {
  if (!spec) return null;
  if (spec.matchName) return steels.find(s => s.name === spec.matchName) || null;
  if (spec.matchAlias) return steels.find(s => s.aliases && s.aliases.includes(spec.matchAlias)) || null;
  return null;
}

function getElement(comp, el) {
  if (!comp || !comp[el]) return 0;
  const arr = comp[el];
  return arr.length === 1 ? arr[0] : (arr[0] + arr[1]) / 2;
}

function isPM(steel) {
  const t = (steel.tech || '').toUpperCase();
  return (t === 'PM' || t === 'CPM' || t === 'MM') ? 1 : 0;
}

// ============================================================
// FEATURE ENGINEERING — metallurgical cross features
// ============================================================

/**
 * Feature definitions. Each feature is a function of raw composition.
 * These formulas are saved in the output so the mini-program can replicate them.
 */
const RAW_ELEMENTS = ['C', 'Cr', 'Mo', 'V', 'W', 'Co', 'Nb', 'N'];

function buildFeatures(rawComp, pmFlag) {
  const C = rawComp.C;
  const Cr = rawComp.Cr;
  const Mo = rawComp.Mo;
  const V = rawComp.V;
  const W = rawComp.W;
  const Co = rawComp.Co;
  const Nb = rawComp.Nb;
  const N = rawComp.N;
  const pm = pmFlag;

  return {
    // Base elements
    C, Cr, Mo, V, W, Co, Nb, N, isPM: pm,

    // Cross features — edge retention (carbide hardness × volume)
    V_x_C: V * C,                        // VC contribution (hardest carbide)
    W_x_C: W * C,                        // WC/M6C contribution
    Cr_x_C: Cr * C,                      // Cr7C3 contribution (softer carbide)

    // Cross features — corrosion (free chromium)
    Cr_minus_C_x_4: Cr - C * 4,         // Approx free Cr (4 Cr per C in Cr7C3)
    Cr_minus_carbide_C: Cr - Math.max(0, C - V * 0.24 - Nb * 0.13 - W * 0.06) * 4,
    // ^ More refined: V/Nb/W consume C first, remaining C grabs Cr

    // Cross features — toughness (total carbide volume)
    total_carbide_vol: C * 2.5 + V * 0.5 + W * 0.2 + Nb * 0.3,
    // ^ Approximate vol% carbide from composition

    // Non-linear
    C_squared: C * C,
    V_squared: V * V,

    // Synergies
    Cr_x_Mo: Cr * Mo,                   // Mo enhances passive film stability
    V_x_isPM: V * pm,                   // PM refines V-carbides → better toughness
    C_x_isPM: C * pm,                   // PM helps high-C steels
    Cr_x_N: Cr * N,                     // N stabilizes austenite + enhances passivity
    Mo_x_N: Mo * N,                     // Mo+N synergy for pitting resistance
  };
}

// Feature names in order (for the design matrix)
const FEATURE_NAMES = [
  'C', 'Cr', 'Mo', 'V', 'W', 'Co', 'Nb', 'N', 'isPM',
  'V_x_C', 'W_x_C', 'Cr_x_C',
  'Cr_minus_C_x_4', 'Cr_minus_carbide_C',
  'total_carbide_vol', 'C_squared', 'V_squared',
  'Cr_x_Mo', 'V_x_isPM', 'C_x_isPM', 'Cr_x_N', 'Mo_x_N',
  'intercept'
];

// Feature formulas for JSON output (so the mini-program can replicate)
const FEATURE_FORMULAS = {
  C: 'C',
  Cr: 'Cr',
  Mo: 'Mo',
  V: 'V',
  W: 'W',
  Co: 'Co',
  Nb: 'Nb',
  N: 'N',
  isPM: 'isPM (1 if PM/CPM/MM, else 0)',
  V_x_C: 'V * C',
  W_x_C: 'W * C',
  Cr_x_C: 'Cr * C',
  Cr_minus_C_x_4: 'Cr - C * 4',
  Cr_minus_carbide_C: 'Cr - max(0, C - V*0.24 - Nb*0.13 - W*0.06) * 4',
  total_carbide_vol: 'C*2.5 + V*0.5 + W*0.2 + Nb*0.3',
  C_squared: 'C^2',
  V_squared: 'V^2',
  Cr_x_Mo: 'Cr * Mo',
  V_x_isPM: 'V * isPM',
  C_x_isPM: 'C * isPM',
  Cr_x_N: 'Cr * N',
  Mo_x_N: 'Mo * N',
  intercept: '1 (constant)'
};

// ============================================================
// Build matched dataset
// ============================================================

const matched = [];
const unmatched = [];

for (const r of ratings) {
  const spec = nameMap[r.name];
  const steel = findSteel(spec);
  if (steel && steel.composition) {
    const rawComp = {};
    for (const el of RAW_ELEMENTS) rawComp[el] = getElement(steel.composition, el);
    const pm = isPM(steel);
    const features = buildFeatures(rawComp, pm);
    matched.push({
      name: r.name,
      steelName: steel.name,
      tech: steel.tech,
      rawComp,
      pm,
      features,
      toughness: r.toughness,
      edgeRetention: r.edgeRetention,
      corrosion: r.corrosion,
    });
  } else {
    unmatched.push(r.name);
  }
}

console.log(`Matched: ${matched.length} steels`);
console.log(`Unmatched: ${unmatched.length} steels: ${unmatched.join(', ')}`);
console.log('');

// ============================================================
// Linear algebra helpers (same as v1)
// ============================================================

function transpose(A) {
  const rows = A.length, cols = A[0].length;
  const T = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      T[j][i] = A[i][j];
  return T;
}

function matmul(A, B) {
  const m = A.length, n = B[0].length, p = B.length;
  const C = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

function matvec(A, v) {
  return A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
}

function invert(M) {
  const n = M.length;
  const A = M.map((row, i) => {
    const aug = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) aug[j] = row[j];
    aug[n + i] = 1;
    return aug;
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) {
      A[col][col] += 1e-6; // regularization for near-singular
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

// OLS with ridge regularization: β = (X^T X + λI)^{-1} X^T y
function ols(X, y, lambda = 0.01) {
  const Xt = transpose(X);
  const XtX = matmul(Xt, X);
  // Add ridge regularization (don't regularize intercept — last column)
  const p = XtX.length;
  for (let i = 0; i < p - 1; i++) {
    XtX[i][i] += lambda;
  }
  const XtX_inv = invert(XtX);
  const Xty = matvec(Xt, y);
  const beta = matvec(XtX_inv, Xty);
  return { beta, XtX_inv };
}

function rSquared(y, yPred) {
  const mean = y.reduce((a, b) => a + b, 0) / y.length;
  const ssTotal = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
  return 1 - ssRes / ssTotal;
}

function rmse(y, yPred) {
  const n = y.length;
  const ss = y.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0);
  return Math.sqrt(ss / n);
}

// ============================================================
// Build design matrix
// ============================================================

const X = matched.map(m => {
  const row = FEATURE_NAMES.slice(0, -1).map(f => m.features[f]);
  row.push(1); // intercept
  return row;
});

const n = X.length;
const p = X[0].length;

console.log(`Design matrix: ${n} samples × ${p} features`);
console.log('');

// ============================================================
// Train models
// ============================================================

const targets = ['toughness', 'edgeRetention', 'corrosion'];
const models = {};
const allPredictions = {};

// Load v1 model for comparison
const v1Model = JSON.parse(readFileSync(join(dataDir, 'rating-model.json'), 'utf-8'));

for (const target of targets) {
  const y = matched.map(m => m[target]);
  const { beta, XtX_inv } = ols(X, y, 0.01);
  const yPred = X.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const r2 = rSquared(y, yPred);
  const rmseVal = rmse(y, yPred);

  // Standard error of regression
  const residuals = y.map((v, i) => v - yPred[i]);
  const dfResidual = n - p;
  const sigmaSquared = residuals.reduce((s, r) => s + r * r, 0) / dfResidual;
  const sigma = Math.sqrt(sigmaSquared);

  // Standard errors of predictions: se_i = sigma * sqrt(x_i^T (X^T X)^{-1} x_i)
  const predSE = X.map(xi => {
    const tmp = matvec(XtX_inv, xi);
    const hat_ii = xi.reduce((s, v, j) => s + v * tmp[j], 0);
    return sigma * Math.sqrt(1 + hat_ii); // prediction interval (not confidence of mean)
  });

  // 95% confidence interval (t ≈ 2.0 for df > 30)
  const tCrit = 2.04; // approx for df ~35
  const ci95 = predSE.map(se => se * tCrit);

  models[target] = {
    coefficients: Object.fromEntries(FEATURE_NAMES.map((f, i) => [f, Math.round(beta[i] * 10000) / 10000])),
    r2: Math.round(r2 * 10000) / 10000,
    rmse: Math.round(rmseVal * 10000) / 10000,
    stdError: Math.round(sigma * 10000) / 10000,
  };

  allPredictions[target] = { yPred, ci95 };
}

// ============================================================
// Assemble predictions array
// ============================================================

const predictions = matched.map((m, idx) => ({
  name: m.name,
  actual: {
    toughness: m.toughness,
    edgeRetention: m.edgeRetention,
    corrosion: m.corrosion,
  },
  predicted: {
    toughness: Math.round(allPredictions.toughness.yPred[idx] * 100) / 100,
    edgeRetention: Math.round(allPredictions.edgeRetention.yPred[idx] * 100) / 100,
    corrosion: Math.round(allPredictions.corrosion.yPred[idx] * 100) / 100,
  },
  confidence95: {
    toughness: Math.round(allPredictions.toughness.ci95[idx] * 100) / 100,
    edgeRetention: Math.round(allPredictions.edgeRetention.ci95[idx] * 100) / 100,
    corrosion: Math.round(allPredictions.corrosion.ci95[idx] * 100) / 100,
  },
}));

// ============================================================
// Save model
// ============================================================

const output = {
  version: 2,
  description: 'Enhanced linear regression with metallurgical cross features and confidence intervals',
  features: FEATURE_NAMES,
  featureFormulas: FEATURE_FORMULAS,
  models,
  predictions,
};

writeFileSync(join(dataDir, 'rating-model-v2.json'), JSON.stringify(output, null, 2));
console.log('Model saved to src/data/rating-model-v2.json');
console.log('');

// ============================================================
// Comparison: v1 vs v2
// ============================================================

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║               MODEL COMPARISON: v1 vs v2                            ║');
console.log('╠══════════════════════════════════════════════════════════════════════╣');
console.log('║ Property        │ v1 R²    │ v2 R²    │ v1 RMSE  │ v2 RMSE  │ Δ R² ║');
console.log('╠══════════════════════════════════════════════════════════════════════╣');

for (const target of targets) {
  const v1r2 = v1Model.models[target].r2;
  const v2r2 = models[target].r2;

  // Compute v1 RMSE from training data
  const v1Features = v1Model.features;
  const v1Coefs = v1Model.models[target].coefficients;
  let v1SsRes = 0;
  let v1Count = 0;
  for (const td of v1Model.trainingData) {
    const pred = v1Features.reduce((s, f) => s + (td.features[f] || 0) * (v1Coefs[f] || 0), 0);
    const actual = td.actual[target];
    v1SsRes += (actual - pred) ** 2;
    v1Count++;
  }
  const v1Rmse = Math.sqrt(v1SsRes / v1Count);

  const v2Rmse = models[target].rmse;
  const deltaR2 = v2r2 - v1r2;

  const line = `║ ${target.padEnd(15)} │ ${v1r2.toFixed(4).padEnd(8)} │ ${v2r2.toFixed(4).padEnd(8)} │ ${v1Rmse.toFixed(4).padEnd(8)} │ ${v2Rmse.toFixed(4).padEnd(8)} │ ${(deltaR2 >= 0 ? '+' : '') + deltaR2.toFixed(4).padEnd(5)} ║`;
  console.log(line);
}

console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('');

// ============================================================
// Worst predictions (largest errors)
// ============================================================

console.log('═══════════════════════════════════════════════════════════════════');
console.log('WORST PREDICTIONS (top 5 errors per property)');
console.log('═══════════════════════════════════════════════════════════════════');

for (const target of targets) {
  console.log(`\n--- ${target.toUpperCase()} ---`);
  console.log('  Steel'.padEnd(22) + 'Actual  Predicted  Error   95% CI   Explanation');

  const errors = matched.map((m, idx) => ({
    name: m.name,
    actual: m[target],
    predicted: allPredictions[target].yPred[idx],
    ci: allPredictions[target].ci95[idx],
    error: Math.abs(allPredictions[target].yPred[idx] - m[target]),
  }));

  errors.sort((a, b) => b.error - a.error);

  for (let i = 0; i < 5; i++) {
    const e = errors[i];
    const sign = e.predicted > e.actual ? '+' : '-';
    let explanation = '';

    // Provide metallurgical explanation for outliers
    if (target === 'toughness') {
      if (e.predicted < e.actual) explanation = 'Actual tougher than predicted (heat treatment / grain size effect)';
      else explanation = 'Predicted tougher (unmeasured carbide clustering?)';
    } else if (target === 'edgeRetention') {
      if (e.predicted < e.actual) explanation = 'Extra hardness from Co/heat treat not captured';
      else explanation = 'Carbide distribution worse than composition implies';
    } else {
      if (e.predicted < e.actual) explanation = 'N/Mo passivation synergy underestimated';
      else explanation = 'Large carbides deplete Cr from matrix';
    }

    console.log(`  ${e.name.padEnd(20)} ${e.actual.toString().padEnd(8)} ${e.predicted.toFixed(2).padEnd(10)} ${sign}${e.error.toFixed(2).padEnd(7)} ±${e.ci.toFixed(2).padEnd(7)} ${explanation}`);
  }
}

console.log('');

// ============================================================
// Print coefficient summary
// ============================================================

console.log('═══════════════════════════════════════════════════════════════════');
console.log('V2 MODEL COEFFICIENTS');
console.log('═══════════════════════════════════════════════════════════════════');

for (const target of targets) {
  console.log(`\n--- ${target.toUpperCase()} (R²=${models[target].r2}, RMSE=${models[target].rmse}) ---`);
  const coefs = models[target].coefficients;
  const sorted = Object.entries(coefs)
    .filter(([, v]) => Math.abs(v) > 0.001)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  for (const [name, val] of sorted) {
    const bar = '█'.repeat(Math.min(30, Math.round(Math.abs(val) * 3)));
    console.log(`  ${name.padEnd(22)} ${val >= 0 ? '+' : ''}${val.toFixed(4).padEnd(8)} ${val >= 0 ? '▓' : '░'}${bar}`);
  }
}

console.log('\n');
console.log(`Training samples: ${matched.length}`);
console.log(`Features: ${FEATURE_NAMES.length} (${RAW_ELEMENTS.length} raw + ${FEATURE_NAMES.length - RAW_ELEMENTS.length - 2} cross + intercept)`);
console.log('Done.');
