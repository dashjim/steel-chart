<template>
  <view class="page">
    <view class="landing">
      <text class="app-title">钢材狂魔</text>
      <text class="app-subtitle">1451种钢材 · 34899个名称 · 性能评分</text>
      <view class="fake-search" @click="goSearch">
        <text class="search-icon">&#x1F50D;</text>
        <text class="search-placeholder">搜索钢材名称...</text>
      </view>
      <text class="ladder-link" @click="goLadder">CATRA 保持性天梯图 &#x203A;</text>
      <text class="ladder-link" @click="goTradeoff">综合性能散点图 &#x203A;</text>
    </view>
  </view>
</template>

<script>
export default {
  onShareAppMessage() {
    return { title: '钢材狂魔 - 刀具钢材数据库', path: '/pages/index/index' }
  },
  onShareTimeline() {
    return {}
  },
  methods: {
    goSearch() {
      uni.navigateTo({ url: '/pages/sub/search/search' })
    },
    goLadder() {
      uni.navigateTo({ url: '/pages/sub/ladder/ladder' })
    },
    goTradeoff() {
      uni.navigateTo({ url: '/pages/sub/tradeoff/tradeoff' })
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

.landing {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 60rpx;
}

.app-title {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.app-subtitle {
  color: #888888;
  font-size: 26rpx;
  margin-bottom: 60rpx;
}

.fake-search {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 28rpx;
  height: 80rpx;
  border: 1px solid #333;
  border-radius: 40rpx;
  background-color: #111;
  margin-bottom: 40rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 16rpx;
}

.search-placeholder {
  color: #666;
  font-size: 28rpx;
}

.ladder-link {
  color: #FFD700;
  font-size: 28rpx;
  margin-bottom: 28rpx;
}
</style>
