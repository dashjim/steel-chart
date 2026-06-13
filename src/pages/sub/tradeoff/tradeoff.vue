<template>
  <view class="page">
    <view class="intro">
      <text class="intro-title">综合性能散点图</text>
      <text class="intro-desc">数据来源: Larrin Thomas (knifesteelnerds.com)</text>
      <text class="intro-desc">图表整理: Reddit r/knifeclub (u/phreakinpher)</text>
    </view>

    <view class="axis-info">
      <view class="axis-row">
        <text class="axis-label">纵轴 Toughness</text>
        <text class="axis-desc">韧性 — 越高越抗崩刃/折断</text>
      </view>
      <view class="axis-row">
        <text class="axis-label">横轴 Edge Retention</text>
        <text class="axis-desc">保持性 — 越高越耐磨、刃口持久</text>
      </view>
      <view class="axis-row">
        <text class="axis-desc tradeoff-note">左上角 = 韧性优先，右下角 = 保持性优先。越靠右上方综合性能越强（如 MagnaCut、CPM-M4）。</text>
      </view>
    </view>

    <view class="image-container">
      <movable-area class="movable-area" scale-area>
        <movable-view
          class="movable-view"
          direction="all"
          :scale="true"
          scale-min="1"
          scale-max="4"
          :scale-value="1"
        >
          <image
            class="tradeoff-image"
            src="/static/tradeoff-chart.jpg"
            mode="widthFix"
          />
        </movable-view>
      </movable-area>
      <text class="tap-hint">双指缩放查看细节</text>
    </view>
  </view>
</template>

<script>
export default {
  onShareAppMessage() {
    return { title: '刀具钢材综合性能散点图', path: '/pages/sub/tradeoff/tradeoff' }
  },
  onShareTimeline() {
    return {}
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

.tradeoff-note {
  line-height: 1.6;
}

.image-container {
  position: relative;
}

.movable-area {
  width: 100%;
  height: 526rpx;
  overflow: hidden;
  background-color: #fff;
  border-radius: 8rpx;
}

.movable-view {
  width: 100%;
  height: 526rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tradeoff-image {
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
