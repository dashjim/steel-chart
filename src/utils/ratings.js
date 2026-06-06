import larrinRatings from '@/data/larrin-ratings.json'
import ratingModel from '@/data/rating-model-v2.json'

const larrinMap = {}
for (const r of larrinRatings) {
  larrinMap[r.name.toLowerCase()] = r
  if (r.name.includes('/')) {
    for (const part of r.name.split('/')) {
      const key = part.trim().toLowerCase()
      if (!larrinMap[key]) larrinMap[key] = r
    }
  }
}

function computeFeatures(comp) {
  const C = comp.C || 0
  const Cr = comp.Cr || 0
  const Mo = comp.Mo || 0
  const V = comp.V || 0
  const W = comp.W || 0
  const Co = comp.Co || 0
  const Nb = comp.Nb || 0
  const N = comp.N || 0
  const isPM = comp.isPM || 0

  return {
    C, Cr, Mo, V, W, Co, Nb, N, isPM,
    V_x_C: V * C,
    W_x_C: W * C,
    Cr_x_C: Cr * C,
    Cr_minus_C_x_4: Cr - C * 4,
    Cr_minus_carbide_C: Cr - Math.max(0, C - V * 0.2 - Nb * 0.13) * 4.3,
    total_carbide_vol: C * 2.5 + V * 0.5 + W * 0.2,
    C_squared: C * C,
    V_squared: V * V,
    Cr_x_Mo: Cr * Mo,
    V_x_isPM: V * isPM,
    C_x_isPM: C * isPM,
    Cr_x_N: Cr * N,
    Mo_x_N: Mo * N
  }
}

function predict(features, property) {
  const coef = ratingModel.models[property].coefficients
  let score = coef.intercept || 0
  for (const feat of ratingModel.features) {
    if (feat === 'intercept') continue
    score += (features[feat] || 0) * (coef[feat] || 0)
  }
  return Math.max(0, Math.min(10, Math.round(score * 2) / 2))
}

export function getRatings(steel) {
  // 先查 Larrin 实测数据
  let larrin = null
  const name = steel.name.toLowerCase()
  if (larrinMap[name]) {
    larrin = larrinMap[name]
  } else if (steel.aliases) {
    for (const alias of steel.aliases) {
      const key = alias.toLowerCase()
      if (larrinMap[key]) { larrin = larrinMap[key]; break }
    }
  }

  // 计算模型估算
  const comp = {}
  if (steel.composition) {
    for (const [el, vals] of Object.entries(steel.composition)) {
      comp[el] = vals.length === 2 ? (vals[0] + vals[1]) / 2 : vals[0]
    }
  }
  const tech = (steel.tech || '').toUpperCase()
  const nameUpper = (steel.name || '').toUpperCase()
  comp.isPM = (tech === 'PM' || tech === 'CPM' || tech === 'MM' || nameUpper.includes('CPM') || nameUpper.includes('MICRO-MELT')) ? 1 : 0

  const features = computeFeatures(comp)
  const estimated = {
    toughness: predict(features, 'toughness'),
    edgeRetention: predict(features, 'edgeRetention'),
    corrosion: predict(features, 'corrosion')
  }

  return {
    larrin: larrin ? {
      toughness: larrin.toughness,
      edgeRetention: larrin.edgeRetention,
      corrosion: larrin.corrosion
    } : null,
    estimated
  }
}
