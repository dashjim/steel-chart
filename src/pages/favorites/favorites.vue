<template>
  <view class="page">
    <view v-if="list.length === 0" class="empty">暂无收藏</view>
    <view v-else class="list">
      <view class="item" v-for="item in list" :key="item" @tap="goDetail(item)">
        <text class="item-name">{{ item }}</text>
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
  onShow() {
    this.list = getFavorites()
  },
  methods: {
    goDetail(id) {
      uni.navigateTo({ url: `/pages/sub/detail/detail?id=${encodeURIComponent(id)}` })
    },
    removeFavorite(id) {
      toggleFavorite(id)
      this.list = getFavorites()
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

.item-name {
  color: #ffffff;
  font-size: 30rpx;
}

.star {
  color: #ffcc00;
  font-size: 36rpx;
}
</style>
