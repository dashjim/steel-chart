<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ steel ? steel.name : '' }}</text>
    </view>

    <view class="section" v-if="steel && steel.composition">
      <text class="composition-text">{{ compositionText }}</text>
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

export default {
  data() {
    return {
      id: null,
      steel: null,
      description: ''
    }
  },
  computed: {
    compositionText() {
      if (!this.steel || !this.steel.composition) return ''
      const parts = []
      for (const [element, values] of Object.entries(this.steel.composition)) {
        if (Array.isArray(values) && values.length === 2) {
          parts.push(`${element}: ${values[0]}-${values[1]}`)
        } else if (Array.isArray(values) && values.length === 1) {
          parts.push(`${element}: ${values[0]}`)
        }
      }
      return parts.join('; ')
    }
  },
  onLoad(options) {
    this.id = options.id
    this.steel = getSteelById(this.id)
    this.description = getDescription(this.id)
  },
  methods: {
    onAliasClick(alias) {
      const { search } = require('@/utils/search.js')
      const results = search(alias)
      const target = results.find(r => r.matchName === alias && r.id !== parseInt(this.id))
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

.composition-text {
  color: #ffffff;
  font-size: 28rpx;
  line-height: 1.6;
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
