<template>
  <view class="page">
    <view class="center">
      <text class="title">天梯图</text>
      <text class="subtitle">即将推出</text>
    </view>
  </view>
</template>

<script>
export default {}
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #000000;
}

.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  color: #ffffff;
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.subtitle {
  color: #888;
  font-size: 28rpx;
}
</style>
