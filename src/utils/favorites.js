export function getFavorites() {
  return uni.getStorageSync('favorites') || []
}

export function toggleFavorite(id) {
  const favs = getFavorites()
  const idx = favs.indexOf(id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.push(id)
  uni.setStorageSync('favorites', favs)
  return favs
}

export function isFavorite(id) {
  return getFavorites().includes(id)
}
