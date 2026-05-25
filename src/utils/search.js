import { getSearchIndex, getSteelById } from './data'

let indexEntries = null

function ensureIndex() {
  if (!indexEntries) {
    const raw = getSearchIndex()
    indexEntries = []
    for (const id in raw) {
      const names = raw[id]
      indexEntries.push({
        id: Number(id),
        names,
        namesLower: names.map(n => n.toLowerCase())
      })
    }
  }
}

export function search(keyword) {
  if (!keyword || !keyword.trim()) return []
  ensureIndex()

  const kw = keyword.trim().toLowerCase()
  const exact = []
  const prefix = []
  const contains = []
  const seen = new Set()

  for (const entry of indexEntries) {
    if (seen.has(entry.id)) continue

    let bestMatch = null
    let matchType = 0

    for (let i = 0; i < entry.namesLower.length; i++) {
      const name = entry.namesLower[i]
      if (name === kw) {
        bestMatch = entry.names[i]
        matchType = 3
        break
      } else if (name.startsWith(kw) && matchType < 2) {
        bestMatch = entry.names[i]
        matchType = 2
      } else if (name.includes(kw) && matchType < 1) {
        bestMatch = entry.names[i]
        matchType = 1
      }
    }

    if (bestMatch && !seen.has(entry.id)) {
      seen.add(entry.id)
      const steel = getSteelById(entry.id)
      if (steel) {
        const result = { ...steel, matchName: bestMatch }
        if (matchType === 3) exact.push(result)
        else if (matchType === 2) prefix.push(result)
        else contains.push(result)
      }
    }
  }

  return [...exact, ...prefix, ...contains]
}
