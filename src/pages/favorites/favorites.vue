<template>
  <view class="page">
    <view v-if="list.length === 0" class="empty">暂无收藏</view>
    <view v-else class="list">
      <view class="item" v-for="item in list" :key="item.id" @tap="goDetail(item)">
        <text class="type-icon">{{ item.compareData ? '\u{1F4CA}' : '\u{1F9EA}' }}</text>
        <text class="item-name">{{ item.displayName || item.id }}</text>
        <text class="star" @tap.stop="removeFavorite(item)">★</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getFavorites, toggleFavorite } from '@/utils/favorites.js'

export default {
  data() {
    return {
      list: [],
    }
  },
  onShareAppMessage() {
    return { title: "我的钢材收藏", path: "/pages/index/index" }
  },
  onShareTimeline() {
    return {}
  },
  onShow() {
    this.list = getFavorites().slice().reverse()
  },
  methods: {
    goDetail(item) {
      if (item.compareData) {
        const ids = item.compareData.ids.join(',')
        const names = encodeURIComponent(item.compareData.names.join('|'))
        uni.navigateTo({ url: `/pages/sub/chart/chart?ids=${ids}&names=${names}` })
      } else {
        const name = encodeURIComponent(item.displayName || '')
        uni.navigateTo({ url: `/pages/sub/detail/detail?id=${item.id}&name=${name}` })
      }
    },
    removeFavorite(item) {
      toggleFavorite(item.id)
      this.list = getFavorites().slice().reverse()
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #000000;
  padding: 20rpx;
  box-sizing: border-box;
}

.empty {
  color: #888888;
  font-size: 32rpx;
  text-align: center;
  margin-top: 200rpx;
}

.list {
  display: flex;
  flex-direction: column;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  border-bottom: 1rpx solid #333333;
}

.type-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.item-name {
  color: #ffffff;
  font-size: 30rpx;
  flex: 1;
}

.star {
  color: #ffcc00;
  font-size: 36rpx;
}
</style>
