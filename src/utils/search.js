import { getAllSteels } from './data'

let allNames = null
let steelPrimaryName = null

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
