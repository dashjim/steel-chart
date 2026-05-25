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
    let matched = false
    let matchType = 3 // contains

    for (const name of entry.namesLower) {
      if (name === kw) {
        matchType = 1 // exact
        matched = true
        break
      } else if (name.startsWith(kw)) {
        if (matchType > 2) matchType = 2 // prefix
        matched = true
      } else if (name.includes(kw)) {
        matched = true
      }
    }

    if (matched && !seen.has(entry.id)) {
      seen.add(entry.id)
      const steel = getSteelById(entry.id)
      if (steel) {
        if (matchType === 1) exact.push(steel)
        else if (matchType === 2) prefix.push(steel)
        else contains.push(steel)
      }
    }
  }

  return [...exact, ...prefix, ...contains]
}
