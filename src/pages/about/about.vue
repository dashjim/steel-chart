
<template>
  <view class="page">
    <view class="app-name">钢材成分图表</view>
    <view class="version">版本 1.0.1</view>
    <view class="desc">刀具钢材化学成分数据库，收录 1451 种钢材、34899 个名称（含各国标准别名），帮助您了解各种钢材的元素组成及其对性能的影响。</view>
    <view class="stats">
      <view class="stat-item">钢材种类: 1451</view>
      <view class="stat-item">名称/别名: 34899</view>
      <view class="stat-item">覆盖标准: AISI, DIN, GB, JIS, GOST 等</view>
    </view>
    <view class="source">数据来源: zknives.com</view>
  </view>
</template>

<script>
export default {
  onShareAppMessage() {
    return { title: "钢材成分图表 - 1451种刀具钢材数据库", path: "/pages/index/index" }
  },
  onShareTimeline() {
    return {}
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #000000;
  padding: 60rpx 40rpx;
  box-sizing: border-box;
}

.app-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 20rpx;
}

.version {
  font-size: 28rpx;
  color: #888888;
  margin-bottom: 40rpx;
}

.desc {
  font-size: 28rpx;
  color: #cccccc;
  line-height: 1.6;
  margin-bottom: 40rpx;
}

.stats {
  margin-bottom: 40rpx;
}

.stat-item {
  font-size: 26rpx;
  color: #aaaaaa;
  line-height: 2;
}

.source {
  font-size: 26rpx;
  color: #888888;
}
</style>
