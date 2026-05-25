import steelsData from '@/data/steels.json'
import searchIndexData from '@/data/searchIndex.json'

let steelsCache = null
let steelsMapCache = null

function ensureLoaded() {
  if (!steelsCache) {
    steelsCache = steelsData
    steelsMapCache = {}
    for (const steel of steelsCache) {
      steelsMapCache[steel.id] = steel
    }
  }
}

export function getAllSteels() {
  ensureLoaded()
  return steelsCache
}

export function getSteelById(id) {
  ensureLoaded()
  return steelsMapCache[parseInt(id)] || null
}

export function getDescription(id) {
  const steel = getSteelById(id)
  return steel?.desc || ''
}

export function getSearchIndex() {
  return searchIndexData
}
