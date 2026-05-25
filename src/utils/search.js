import { getAllSteels } from './data'

export function search(keyword) {
  if (!keyword || !keyword.trim()) return []

  const kw = keyword.trim().toLowerCase()
  const allSteels = getAllSteels()
  const exact = []
  const prefix = []

  for (const steel of allSteels) {
    const name = steel.name.toLowerCase()
    if (name === kw) {
      exact.push(steel)
    } else if (name.startsWith(kw)) {
      prefix.push(steel)
    }
  }

  return [...exact, ...prefix]
}
