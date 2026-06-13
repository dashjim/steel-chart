<template>
  <view class="page">
    <view class="search-bar" :class="{ focused: searchFocused, sorting: sorting }">
      <text class="search-icon">&#x1F50D;</text>
      <input
        class="search-input"
        type="text"
        placeholder="搜索钢材..."
        placeholder-style="color: #666"
        :value="keyword"
        :focus="true"
        :disabled="sorting"
        @input="onInput"
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
      <text
        v-if="keyword"
        class="sort-btn"
        :class="{ disabled: sorting }"
        @click="onSort"
      >{{ sorting ? '搜索中...' : '模糊' }}</text>
    </view>
    <scroll-view class="steel-list" scroll-y>
      <view v-if="!keyword" class="hint-tip">
        <text class="hint-text">常见刀具钢材（含 Larrin 实测评分）</text>
      </view>
      <view
        v-for="(item, idx) in displayList"
        :key="idx"
        class="steel-item"
        @click="goDetail(item)"
      >
        <text class="steel-name">{{ item.displayName || item.name }}</text>
        <text
          class="star-icon"
          :class="{ favorited: favSet[item.id] }"
          @click.stop="onToggleFavorite(item)"
        >&#x2605;</text>
      </view>
      <view v-if="keyword && displayList.length === 0" class="empty-tip">
        <text class="empty-text">未找到匹配的钢材</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getAllSteels } from '@/utils/data'
import larrinRatings from '@/data/larrin-ratings.json'
import { search, fuzzySearch } from '@/utils/search'
import { getFavorites, toggleFavorite } from '@/utils/favorites'

export default {
  data() {
    return {
      keyword: '',
      defaultList: [],
      searchResults: [],
      searchFocused: true,
      sorting: false,
      favSet: {}
    }
  },
  computed: {
    displayList() {
      return this.keyword ? this.searchResults : this.defaultList
    }
  },
  onShow() {
    this.refreshFavorites()
  },
  onLoad() {
    const larrinNames = larrinRatings.map(r => r.name.toLowerCase())
    const all = getAllSteels()
    const larrin = []
    for (const s of all) {
      const nameLower = s.name.toLowerCase()
      const isLarrin = larrinNames.some(ln => ln === nameLower || ln.includes(nameLower) || (s.aliases && s.aliases.some(a => ln.includes(a.toLowerCase()))))
      if (isLarrin) larrin.push({ id: s.id, name: s.name, displayName: s.name })
    }
    this.defaultList = larrin
    this.refreshFavorites()
  },
  methods: {
    onInput(e) {
      const val = e.detail.value
      this.keyword = val
      if (val) {
        this.searchResults = search(val)
      } else {
        this.searchResults = []
      }
    },
    onSort() {
      if (this.sorting || !this.keyword) return
      this.sorting = true
      setTimeout(() => {
        this.searchResults = fuzzySearch(this.keyword)
        this.sorting = false
      }, 50)
    },
    goDetail(item) {
      const name = encodeURIComponent(item.displayName || item.name)
      uni.navigateTo({ url: '/pages/sub/detail/detail?id=' + item.id + '&name=' + name })
    },
    onToggleFavorite(item) {
      toggleFavorite(item.id, item.displayName || item.name)
      this.refreshFavorites()
    },
    refreshFavorites() {
      const favs = getFavorites()
      const set = {}
      for (const f of favs) {
        set[f.id] = true
      }
      this.favSet = set
    }
  }
}
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #000000;
}

.search-bar {
  display: flex;
  align-items: center;
  margin: 20rpx 24rpx;
  padding: 0 20rpx;
  height: 72rpx;
  border: 1px solid #333;
  border-radius: 36rpx;
  background-color: #111;
}

.search-bar.focused {
  border-color: #ff8c00;
}

.search-bar.sorting {
  border-color: #4A90D9;
}

.sort-btn {
  font-size: 22rpx;
  color: #4A90D9;
  padding: 8rpx 16rpx;
  border: 1rpx solid #4A90D9;
  border-radius: 16rpx;
  margin-left: 12rpx;
  white-space: nowrap;
}

.sort-btn.disabled {
  color: #666;
  border-color: #666;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #ffffff;
  background-color: transparent;
}

.steel-list {
  flex: 1;
  overflow: hidden;
}

.steel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #333;
}

.steel-name {
  font-size: 30rpx;
  color: #ffffff;
}

.star-icon {
  font-size: 36rpx;
  color: #555;
  padding: 10rpx;
}

.star-icon.favorited {
  color: #FFD700;
}

.empty-tip {
  display: flex;
  justify-content: center;
  padding: 60rpx 0;
}

.empty-text {
  color: #666;
  font-size: 28rpx;
}

.hint-tip {
  padding: 20rpx 32rpx 12rpx;
}

.hint-text {
  color: #666;
  font-size: 24rpx;
}
</style>
