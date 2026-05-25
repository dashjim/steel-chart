<template>
  <view class="page">
    <view class="app-name">钢材成分图表</view>
    <view class="version">版本 1.0.0</view>
    <view class="desc">刀具钢材化学成分数据库，帮助您了解各种钢材的元素组成及其对性能的影响。</view>
    <view class="source">数据来源: zknives.com</view>
  </view>
</template>

<script>
export default {}
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

.source {
  font-size: 26rpx;
  color: #888888;
}
</style>
