<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ steel ? steel.name : '' }}</text>
    </view>

    <!-- Chemical Composition -->
    <view class="section" v-if="steel && steel.composition">
      <text class="section-title">Chemical Composition</text>
      <text class="composition-text">{{ compositionText }}</text>
      <text class="note" v-if="hasApprox">* - Approx. composition from ref. group.</text>
    </view>

    <!-- Standard Info -->
    <view class="section" v-if="steel && (steel.standard || steel.country)">
      <text class="section-title">Standard</text>
      <text class="standard-text" v-if="steel.standard">{{ steel.standard }}</text>
      <text class="standard-text" v-if="steel.country">Country: {{ steel.country }}</text>
    </view>

    <!-- Description -->
    <view class="section" v-if="description">
      <text class="section-title">Description</text>
      <text class="description-text">{{ description }}</text>
    </view>

    <!-- Aliases -->
    <view class="section" v-if="steel && steel.aliases && steel.aliases.length">
      <text class="section-title">Aliases / Cross-References</text>
      <view class="aliases-list">
        <text
          class="alias-link"
          v-for="(alias, index) in steel.aliases"
          :key="index"
          @click="onAliasClick(alias)"
        >{{ alias }}</text>
      </view>
    </view>

    <!-- Bottom Toolbar -->
    <view class="toolbar">
      <view class="toolbar-item" @click="goSearch">
        <text class="toolbar-icon">🔍</text>
        <text class="toolbar-label">Search</text>
      </view>
      <view class="toolbar-item" @click="goChart">
        <text class="toolbar-icon">📊</text>
        <text class="toolbar-label">Chart</text>
      </view>
      <view class="toolbar-item" @click="goElements">
        <text class="toolbar-icon">⚛</text>
        <text class="toolbar-label">Elements</text>
      </view>
      <view class="toolbar-item" @click="goMore">
        <text class="toolbar-icon">⋯</text>
        <text class="toolbar-label">More</text>
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
        } else {
          parts.push(`${element}: ${values}`)
        }
      }
      return parts.join('; ')
    },
    hasApprox() {
      // Show note if steel has tech field indicating approximate data
      return this.steel && this.steel.tech && this.steel.tech.includes('approx')
    }
  },
  onLoad(options) {
    this.id = options.id
    this.steel = getSteelById(this.id)
    this.description = getDescription(this.id)
  },
  methods: {
    onAliasClick(alias) {
      uni.navigateTo({
        url: `/pages/index/index?search=${encodeURIComponent(alias)}`
      })
    },
    goSearch() {
      uni.navigateTo({
        url: '/pages/index/index'
      })
    },
    goChart() {
      const steelName = this.steel ? this.steel.name : ''
      uni.navigateTo({
        url: `/pages/sub/chart/chart?steel=${encodeURIComponent(steelName)}`
      })
    },
    goElements() {
      uni.navigateTo({
        url: '/pages/sub/elements/elements'
      })
    },
    goMore() {
      // Placeholder for more options
    }
  }
}
</script>

<style>
.page {
  background-color: #000000;
  min-height: 100vh;
  padding: 40rpx 30rpx;
  padding-bottom: 140rpx;
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

.section-title {
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

.note {
  color: #999999;
  font-size: 24rpx;
  font-style: italic;
  display: block;
  margin-top: 12rpx;
}

.standard-text {
  color: #ffffff;
  font-size: 28rpx;
  display: block;
  margin-bottom: 8rpx;
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

.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 120rpx;
  background-color: #1a1a1a;
  border-top: 1rpx solid #333333;
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.toolbar-icon {
  font-size: 36rpx;
}

.toolbar-label {
  color: #999999;
  font-size: 20rpx;
  margin-top: 4rpx;
}
</style>
