<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ steel ? steel.name : '' }}</text>
    </view>

    <view class="section" v-if="steel && steel.composition">
      <view class="comp-list">
        <view
          class="comp-item"
          v-for="(vals, el) in steel.composition"
          :key="el"
          @click="goElementInfo(el)"
        >
          <text class="comp-el">{{ el }}</text>
          <text class="comp-val">{{ formatComp(vals) }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="steel && (steel.standard || steel.country)">
      <text class="section-label">Standard:</text>
      <text class="standard-text">{{ steel.standard || '' }} {{ steel.country ? '(' + steel.country + ')' : '' }}</text>
    </view>

    <view class="section" v-if="description">
      <text class="section-label">Notes:</text>
      <text class="description-text">{{ description }}</text>
    </view>

    <view class="section" v-if="steel && steel.aliases && steel.aliases.length">
      <text class="section-label">Cross-References:</text>
      <view class="aliases-list">
        <text
          class="alias-link"
          v-for="(alias, index) in steel.aliases"
          :key="index"
          @click="onAliasClick(alias)"
        >{{ alias }}</text>
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn" @click="goChart">
        <text class="action-icon">📊</text>
        <text class="action-label">查看图表</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getSteelById, getDescription } from '@/utils/data.js'
import { search } from '@/utils/search.js'

export default {
  data() {
    return {
      id: null,
      steel: null,
      description: ''
    }
  },
  onLoad(options) {
    this.id = options.id
    this.steel = getSteelById(this.id)
    this.description = getDescription(this.id)
  },
  methods: {
    formatComp(vals) {
      if (vals.length === 2) return `${vals[0]}-${vals[1]}%`
      return `${vals[0]}%`
    },
    goElementInfo(el) {
      uni.navigateTo({ url: '/pages/sub/element-info/element-info?element=' + el })
    },
    onAliasClick(alias) {
      const results = search(alias)
      const target = results.find(r => r.displayName === alias && r.id !== parseInt(this.id))
      if (target) {
        uni.navigateTo({ url: '/pages/sub/detail/detail?id=' + target.id })
      } else {
        uni.showToast({ title: alias, icon: 'none' })
      }
    },
    goChart() {
      uni.navigateTo({
        url: '/pages/sub/chart/chart?ids=' + this.id
      })
    }
  }
}
</script>

<style>
.page {
  background-color: #000000;
  min-height: 100vh;
  padding: 40rpx 30rpx;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  color: #ffffff;
  font-size: 40rpx;
  font-weight: bold;
}

.section {
  margin-bottom: 40rpx;
}

.section-label {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: bold;
  font-style: italic;
  display: block;
  margin-bottom: 16rpx;
}

.comp-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.comp-item {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background-color: #1a1a1a;
  border-radius: 8rpx;
}

.comp-el {
  color: #FFA500;
  font-size: 28rpx;
  font-weight: bold;
}

.comp-val {
  color: #cccccc;
  font-size: 24rpx;
}

.standard-text {
  color: #ffffff;
  font-size: 28rpx;
}

.description-text {
  color: #cccccc;
  font-size: 26rpx;
  font-style: italic;
  line-height: 1.6;
}

.aliases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.alias-link {
  color: #FFA500;
  font-size: 28rpx;
  text-decoration: underline;
}

.action-bar {
  margin-top: 60rpx;
  display: flex;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  padding: 20rpx 40rpx;
  background-color: #1a1a1a;
  border-radius: 40rpx;
  border: 1rpx solid #333;
}

.action-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.action-label {
  color: #ffffff;
  font-size: 28rpx;
}
</style>
