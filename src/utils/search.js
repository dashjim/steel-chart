import { getAllSteels } from './data'

let allNames = null

function ensureNames() {
  if (allNames) return
  const steels = getAllSteels()
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

export function search(keyword) {
  if (!keyword || !keyword.trim()) return []
  ensureNames()

  const kw = keyword.trim().toLowerCase()
  const steels = getAllSteels()
  const nameMap = new Map()

  for (const entry of allNames) {
    if (!entry.nameLower.includes(kw)) continue

    const key = entry.nameLower
    const existing = nameMap.get(key)

    if (!existing) {
      nameMap.set(key, entry)
    } else {
      // 优先选：1) 主名称就是这个名称的 2) 主名称包含搜索词的
      const newSteel = steels.find(s => s.id === entry.id)
      const oldSteel = steels.find(s => s.id === existing.id)
      const newPrimaryMatch = newSteel && newSteel.name.toLowerCase() === key
      const oldPrimaryMatch = oldSteel && oldSteel.name.toLowerCase() === key
      if (newPrimaryMatch && !oldPrimaryMatch) {
        nameMap.set(key, entry)
      } else if (!oldPrimaryMatch && !newPrimaryMatch) {
        const newPrimaryContains = newSteel && newSteel.name.toLowerCase().includes(kw)
        const oldPrimaryContains = oldSteel && oldSteel.name.toLowerCase().includes(kw)
        if (newPrimaryContains && !oldPrimaryContains) {
          nameMap.set(key, entry)
        }
      }
    }
  }

  const results = [...nameMap.values()].map(entry => ({
    displayName: entry.name,
    id: entry.id,
    dist: editDistance(kw, entry.nameLower)
  }))

  results.sort((a, b) => a.dist - b.dist)

  return results.map(r => ({
    id: r.id,
    name: r.displayName,
    displayName: r.displayName
  }))
}
