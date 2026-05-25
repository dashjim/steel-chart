<template>
  <view class="page">
    <view class="search-bar" :class="{ focused: searchFocused }">
      <text class="search-icon">&#x1F50D;</text>
      <input
        class="search-input"
        type="text"
        placeholder="搜索钢材..."
        placeholder-style="color: #666"
        :value="keyword"
        @input="onInput"
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
    </view>
    <scroll-view class="steel-list" scroll-y>
      <view
        v-for="item in displayList"
        :key="item.id"
        class="steel-item"
        @click="goDetail(item)"
      >
        <text class="steel-name">{{ item.matchName || item.name }}<text v-if="item.matchName && item.matchName !== item.name" class="steel-sub"> ({{ item.name }})</text></text>
        <text
          class="star-icon"
          :class="{ favorited: favSet[item.id] }"
          @click.stop="onToggleFavorite(item.id)"
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
import { search } from '@/utils/search'
import { getFavorites, toggleFavorite } from '@/utils/favorites'

export default {
  data() {
    return {
      keyword: '',
      allSteels: [],
      searchResults: [],
      searchFocused: false,
      favSet: {}
    }
  },
  computed: {
    displayList() {
      return this.keyword ? this.searchResults : this.allSteels
    }
  },
  onShow() {
    this.refreshFavorites()
  },
  onLoad() {
    this.allSteels = getAllSteels()
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
    goDetail(item) {
      uni.navigateTo({ url: '/pages/sub/detail/detail?id=' + item.id })
    },
    onToggleFavorite(id) {
      toggleFavorite(id)
      this.refreshFavorites()
    },
    refreshFavorites() {
      const favs = getFavorites()
      const set = {}
      for (const id of favs) {
        set[id] = true
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

.steel-sub {
  color: #888;
  font-size: 24rpx;
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
</style>
