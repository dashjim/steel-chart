export function getFavorites() {
  return uni.getStorageSync('favorites') || []
}

export function toggleFavorite(id, displayName) {
  const favs = getFavorites()
  const idx = favs.findIndex(f => f.id === id)
  if (idx >= 0) {
    favs.splice(idx, 1)
  } else {
    favs.push({ id, displayName: displayName || '' })
  }
  uni.setStorageSync('favorites', favs)
  return favs
}

export function isFavorite(id) {
  return getFavorites().some(f => f.id === id)
}
