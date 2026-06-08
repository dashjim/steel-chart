<template>
  <view class="page">
    <view class="intro">
      <text class="intro-title">CATRA 保持性天梯图</text>
      <text class="intro-desc">数据来源: Larrin Thomas (knifesteelnerds.com)</text>
      <text class="intro-desc">测试条件: 15°刃角, 400目CBN研磨, 切割硅砂卡纸</text>
    </view>

    <view class="axis-info">
      <view class="axis-row">
        <text class="axis-label">纵轴 TCC (mm)</text>
        <text class="axis-desc">Total Cards Cut — 切割总毫米数，越高保持性越好</text>
      </view>
      <view class="axis-row">
        <text class="axis-label">横轴 Hardness (Rc)</text>
        <text class="axis-desc">洛氏硬度 — 测试时钢材的实际硬度</text>
      </view>
    </view>

    <view class="image-container" @click="previewImage">
      <image
        class="ladder-image"
        src="/static/catra-ladder.jpg"
        mode="widthFix"
      />
      <text class="tap-hint">点击放大查看</text>
    </view>
  </view>
</template>

<script>
export default {
  onShareAppMessage() {
    return { title: 'CATRA 保持性天梯图', path: '/pages/sub/ladder/ladder' }
  },
  onShareTimeline() {
    return {}
  },
  methods: {
    previewImage() {
      uni.previewImage({
        urls: ['/static/catra-ladder.jpg']
      })
    }
  }
}
</script>

<style>
.page {
  background-color: #000000;
  min-height: 100vh;
  padding: 30rpx;
  box-sizing: border-box;
}

.intro {
  margin-bottom: 30rpx;
}

.intro-title {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.intro-desc {
  color: #888;
  font-size: 24rpx;
  display: block;
  line-height: 1.6;
}

.axis-info {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background-color: #111;
  border-radius: 12rpx;
}

.axis-row {
  margin-bottom: 16rpx;
}

.axis-row:last-child {
  margin-bottom: 0;
}

.axis-label {
  color: #FFD700;
  font-size: 26rpx;
  font-weight: bold;
  display: block;
}

.axis-desc {
  color: #ccc;
  font-size: 24rpx;
  display: block;
  margin-top: 4rpx;
}

.image-container {
  position: relative;
}

.ladder-image {
  width: 100%;
  border-radius: 8rpx;
}

.tap-hint {
  color: #666;
  font-size: 22rpx;
  display: block;
  text-align: center;
  margin-top: 12rpx;
}
</style>
