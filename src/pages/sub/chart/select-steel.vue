<template>
  <view class="page">
    <view class="search-bar">
      <input
        class="search-input"
        type="text"
        placeholder="搜索钢材加入对比..."
        placeholder-style="color: #666"
        :value="keyword"
        @input="onInput"
        focus
      />
    </view>
    <scroll-view class="steel-list" scroll-y>
      <view
        v-for="(item, idx) in results"
        :key="idx"
        class="steel-item"
        @click="selectSteel(item)"
      >
        <text class="steel-name">{{ item.displayName || item.name }}</text>
      </view>
      <view v-if="keyword && results.length === 0" class="empty-tip">
        <text class="empty-text">未找到匹配的钢材</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { search } from '@/utils/search.js'

export default {
  data() {
    return {
      keyword: '',
      results: [],
      fromIds: [],
      fromNames: []
    }
  },
  onLoad(query) {
    if (query.ids) this.fromIds = query.ids.split(',').map(Number)
    if (query.names) this.fromNames = decodeURIComponent(query.names).split('|')
  },
  methods: {
    onInput(e) {
      this.keyword = e.detail.value
      if (this.keyword) {
        this.results = search(this.keyword).filter(r => !this.fromIds.includes(r.id))
      } else {
        this.results = []
      }
    },
    selectSteel(item) {
      const ids = [...this.fromIds, item.id]
      const names = [...this.fromNames, item.displayName || item.name]
      uni.redirectTo({
        url: '/pages/sub/chart/chart?ids=' + ids.join(',') + '&names=' + encodeURIComponent(names.join('|'))
      })
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
  border: 1px solid #ff8c00;
  border-radius: 36rpx;
  background-color: #111;
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
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #333;
}

.steel-name {
  font-size: 30rpx;
  color: #ffffff;
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
