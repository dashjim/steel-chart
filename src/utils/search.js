import { getAllSteels } from './data'

let allNames = null

function ensureNames() {
  if (allNames) return
  const steels = getAllSteels()
  allNames = []
  for (const steel of steels) {
    allNames.push({ name: steel.name, nameLower: steel.name.toLowerCase(), steel })
    if (steel.aliases) {
      for (const alias of steel.aliases) {
        allNames.push({ name: alias, nameLower: alias.toLowerCase(), steel })
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
  const seen = new Set()
  const results = []

  for (const entry of allNames) {
    if (!entry.nameLower.includes(kw)) continue
    if (seen.has(entry.nameLower)) continue
    seen.add(entry.nameLower)

    const dist = editDistance(kw, entry.nameLower)
    results.push({ name: entry.name, steel: entry.steel, dist })
  }

  results.sort((a, b) => a.dist - b.dist)

  return results.map(r => ({ ...r.steel, displayName: r.name }))
}
