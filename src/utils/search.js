import { getAllSteels } from './data'

export function search(keyword) {
  if (!keyword || !keyword.trim()) return []

  const kw = keyword.trim().toLowerCase()
  const allSteels = getAllSteels()
  const results = []

  for (const steel of allSteels) {
    const name = steel.name.toLowerCase()
    if (name.includes(kw)) {
      let score = 0
      if (name === kw) score = 3
      else if (name.startsWith(kw)) score = 2
      else score = 1
      results.push({ steel, score, len: steel.name.length })
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.len - b.len
  })

  return results.map(r => r.steel)
}
