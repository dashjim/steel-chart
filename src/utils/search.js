import { getAllSteels } from './data'
import larrinRatings from '@/data/larrin-ratings.json'

let allNames = null
let steelPrimaryName = null
let defaultListCache = null

export function normName(s) {
  return s.toLowerCase().replace(/[\s\-_.]/g, '')
}

// 按 Larrin 实测列表顺序返回知名钢材，作为搜索页空输入时的默认展示
export function getDefaultList() {
  if (defaultListCache) return defaultListCache
  const steels = getAllSteels()
  // 归一化名称 -> 钢材列表
  const map = new Map()
  for (const s of steels) {
    for (const n of [s.name, ...(s.aliases || [])]) {
      const k = normName(n)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(s)
    }
  }
  const pick = (arr, key) =>
    arr.find(s => normName(s.name) === key) ||
    arr.find(s => normName(s.name).includes(key)) ||
    arr[0]

  const isPM = (s) => {
    const tech = (s.tech || '').toUpperCase()
    const nameUpper = (s.name || '').toUpperCase()
    return tech === 'PM' || tech === 'CPM' || tech === 'MM' ||
      nameUpper.includes('CPM') || nameUpper.includes('MICRO-MELT')
  }

  const seen = new Set()
  // 先收集 Larrin 实测的知名钢材（按 Larrin 列表顺序）
  const larrinPM = []
  const larrinRest = []
  for (const r of larrinRatings) {
    const keys = [r.name, ...(r.name.includes('/') ? r.name.split('/') : [])].map(normName)
    let steel = null
    for (const k of keys) {
      if (map.has(k)) { steel = pick(map.get(k), k); break }
    }
    if (steel && !seen.has(steel.id)) {
      seen.add(steel.id)
      const item = { id: steel.id, name: steel.name, displayName: steel.name }
      ;(isPM(steel) ? larrinPM : larrinRest).push(item)
    }
  }
  // Larrin 粉末钢排最前，再其余 Larrin 钢材，最后所有其余钢材
  const out = [...larrinPM, ...larrinRest]
  for (const s of steels) {
    if (!seen.has(s.id)) {
      seen.add(s.id)
      out.push({ id: s.id, name: s.name, displayName: s.name })
    }
  }
  defaultListCache = out
  return out
}

function ensureNames() {
  if (allNames) return
  const steels = getAllSteels()
  steelPrimaryName = {}
  for (const steel of steels) {
    steelPrimaryName[steel.id] = steel.name.toLowerCase()
  }
  allNames = []
  for (const steel of steels) {
    allNames.push({ name: steel.name, nameLower: steel.name.toLowerCase(), id: steel.id, isPrimary: true })
    if (steel.aliases) {
      for (const alias of steel.aliases) {
        allNames.push({ name: alias, nameLower: alias.toLowerCase(), id: steel.id, isPrimary: false })
      }
    }
  }
}

function editDistance(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1]
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function fuzzySearch(keyword) {
  ensureNames()
  const kw = keyword.trim().toLowerCase()
  const nameMap = new Map()

  for (const entry of allNames) {
    const key = entry.nameLower
    if (nameMap.has(key)) continue
    const dist = editDistance(kw, key)
    nameMap.set(key, { name: entry.name, id: entry.id, dist })
  }

  const results = [...nameMap.values()]
  results.sort((a, b) => a.dist - b.dist)

  return results.slice(0, 50).map(r => ({
    id: r.id,
    name: r.name,
    displayName: r.name
  }))
}

export function search(keyword) {
  if (!keyword || !keyword.trim()) return []
  ensureNames()

  const kw = keyword.trim().toLowerCase()
  const nameMap = new Map()

  for (const entry of allNames) {
    if (!entry.nameLower.includes(kw)) continue

    const key = entry.nameLower
    const existing = nameMap.get(key)

    if (!existing) {
      nameMap.set(key, entry)
    } else {
      // 优先选主名称就是这个名称的钢材
      const newIsPrimaryName = steelPrimaryName[entry.id] === key
      const oldIsPrimaryName = steelPrimaryName[existing.id] === key
      if (newIsPrimaryName && !oldIsPrimaryName) {
        nameMap.set(key, entry)
      } else if (!oldIsPrimaryName && !newIsPrimaryName) {
        // 其次选主名称包含搜索词的
        const newContains = steelPrimaryName[entry.id].includes(kw)
        const oldContains = steelPrimaryName[existing.id].includes(kw)
        if (newContains && !oldContains) {
          nameMap.set(key, entry)
        }
      }
    }
  }

  const results = [...nameMap.values()]

  // 排序：精确匹配 > 前缀 > 包含，同级按名称长度
  results.sort((a, b) => {
    const aExact = a.nameLower === kw ? 0 : a.nameLower.startsWith(kw) ? 1 : 2
    const bExact = b.nameLower === kw ? 0 : b.nameLower.startsWith(kw) ? 1 : 2
    if (aExact !== bExact) return aExact - bExact
    return a.name.length - b.name.length
  })

  return results.map(r => ({
    id: r.id,
    name: r.name,
    displayName: r.name
  }))
}
