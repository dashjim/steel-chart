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

    <view class="image-container" @click="previewImage">
      <image
        class="tradeoff-image"
        src="/static/tradeoff-chart.png"
        mode="widthFix"
      />
      <text class="tap-hint">点击放大查看（可双指缩放）</text>
    </view>
  </view>
</template>

<script>
const IMG = '/static/tradeoff-chart.png'

export default {
  onShareAppMessage() {
    return { title: '刀具钢材综合性能散点图', path: '/pages/sub/tradeoff/tradeoff' }
  },
  onShareTimeline() {
    return {}
  },
  methods: {
    previewImage() {
      // 包内图片 previewImage 不直接支持，先转本地临时路径再预览（系统原生缩放/拖动）
      uni.getImageInfo({
        src: IMG,
        success: (res) => {
          uni.previewImage({ urls: [res.path], current: res.path })
        },
        fail: () => {
          uni.previewImage({ urls: [IMG] })
        }
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

.tradeoff-note {
  line-height: 1.6;
}

.image-container {
  position: relative;
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
