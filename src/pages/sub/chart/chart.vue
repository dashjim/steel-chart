<template>
  <view class="chart-page">
    <view class="header">
      <view class="mode-tabs">
        <text :class="['mode-tab', mode === 'mass' ? 'active' : '']" @click="mode='mass'">质量%</text>
        <text :class="['mode-tab', mode === 'atoms' ? 'active' : '']" @click="mode='atoms'">原子数</text>
        <text :class="['mode-tab', mode === 'molar' ? 'active' : '']" @click="mode='molar'">摩尔%</text>
      </view>
    </view>

    <view class="chart-area">
      <steel-chart
        v-if="selectedSteels.length > 0"
        :steels="selectedSteels"
        :mode="mode"
        :elements="steelElements"
        :yMax="yMax"
      />
      <view v-else class="empty-hint">
        <text class="empty-text">无数据</text>
      </view>
    </view>

    <scroll-view class="legend" scroll-y v-if="selectedSteels.length > 0">
      <view v-for="(steel, idx) in selectedSteels" :key="idx" class="legend-item" @click="goDetail(idx)">
        <view class="legend-left">
          <text class="legend-name">{{ steel.name }}</text>
          <text class="legend-comp">{{ formatComp(steel) }}</text>
        </view>
        <text v-if="selectedSteels.length > 1" class="legend-remove" @click.stop="removeSteel(idx)">✕</text>
      </view>
    </scroll-view>

    <view class="toolbar">
      <view v-if="selectedSteels.length < 5" class="toolbar-btn" @click="addCompare">
        <text class="toolbar-icon">+</text>
        <text class="toolbar-label">对比</text>
      </view>
      <view class="toolbar-btn" @click="saveCompare">
        <text class="toolbar-icon">★</text>
        <text class="toolbar-label">收藏</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getSteelById } from '@/utils/data.js'
import { getMinMax } from '@/utils/composition.js'
import { toggleFavorite } from '@/utils/favorites.js'

const MODES = ['mass', 'atoms', 'molar']

export default {
  data() {
    return {
      selectedSteels: [],
      steelIds: [],
      steelNames: [],
      mode: 'mass',
      yMax: 0
    }
  },
  computed: {
    steelElements() {
      const elSet = new Set()
      for (const steel of this.selectedSteels) {
        if (steel.composition) {
          for (const el of Object.keys(steel.composition)) {
            elSet.add(el)
          }
        }
      }
      return [...elSet]
    }
  },
  onShareAppMessage() {
    const names = this.steelNames.join(' / ')
    return { title: names + ' - 成分对比', path: '/pages/sub/chart/chart?ids=' + this.steelIds.join(',') + '&names=' + encodeURIComponent(this.steelNames.join('|')) }
  },
  onShareTimeline() {
    return {}
  },
  onLoad(query) {
    if (query && query.ids) {
      this.steelIds = query.ids.split(',').map(Number)
      if (query.names) {
        this.steelNames = decodeURIComponent(query.names).split('|')
      } else if (query.name) {
        this.steelNames = [decodeURIComponent(query.name)]
      }
      this.loadSteels()
    }
  },
  onShow() {
    // 从搜索页返回时检查是否有新增钢材
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    if (currentPage && currentPage.addedSteelId) {
      const id = currentPage.addedSteelId
      const name = currentPage.addedSteelName || ''
      delete currentPage.addedSteelId
      delete currentPage.addedSteelName
      if (!this.steelIds.includes(id)) {
        this.steelIds.push(id)
        this.steelNames.push(name)
        this.loadSteels()
      }
    }
  },
  methods: {
    loadSteels() {
      this.selectedSteels = this.steelIds.map((id, i) => {
        const steel = getSteelById(id)
        if (steel && this.steelNames[i]) steel.name = this.steelNames[i]
        return steel
      }).filter(Boolean)
      this.yMax = 0
    },
    removeSteel(idx) {
      this.steelIds.splice(idx, 1)
      this.steelNames.splice(idx, 1)
      this.loadSteels()
    },
    addCompare() {
      if (this.selectedSteels.length >= 5) {
        uni.showToast({ title: '最多对比5种', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: '/pages/sub/chart/select-steel?from=chart&ids=' + this.steelIds.join(',') + '&names=' + encodeURIComponent(this.steelNames.join('|'))
      })
    },
    saveCompare() {
      if (this.selectedSteels.length === 0) return
      const displayName = this.steelNames.join(' / ')
      const compareData = {
        type: 'compare',
        ids: this.steelIds.slice(),
        names: this.steelNames.slice()
      }
      toggleFavorite('compare_' + this.steelIds.join('_'), displayName, compareData)
      uni.showToast({ title: '已收藏对比', icon: 'success' })
    },
    goDetail(idx) {
      const id = this.steelIds[idx]
      const name = this.steelNames[idx] || ''
      uni.navigateTo({ url: '/pages/sub/detail/detail?id=' + id + '&name=' + encodeURIComponent(name) })
    },
    formatComp(steel) {
      if (!steel.composition) return ''
      const parts = []
      for (const [el, vals] of Object.entries(steel.composition)) {
        const v = vals.length === 2 ? vals[1] : vals[0]
        parts.push(el + ':' + v)
      }
      return parts.join(' ')
    },
    computeAutoMax() {
      let max = 0
      for (const steel of this.selectedSteels) {
        if (!steel.composition) continue
        for (const el of this.steelElements) {
          const mm = getMinMax(steel.composition[el])
          if (mm && mm.max > max) max = mm.max
        }
      }
      return max || 1
    }
  }
}
</script>

<style scoped>
.chart-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #000000;
}

.header {
  text-align: center;
  padding: 20rpx;
}

.mode-tabs {
  display: flex;
  justify-content: center;
  gap: 24rpx;
}

.mode-tab {
  color: #666;
  font-size: 28rpx;
  padding: 10rpx 24rpx;
  border-radius: 20rpx;
}

.mode-tab.active {
  color: #fff;
  background-color: #333;
  font-weight: bold;
}

.chart-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  color: #666666;
  font-size: 28rpx;
}

.legend {
  max-height: 400rpx;
  padding: 16rpx 30rpx;
  background-color: #111111;
  border-top: 1rpx solid #333333;
}

.legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #222;
}

.legend-left {
  flex: 1;
}

.legend-name {
  color: #4A90D9;
  font-size: 28rpx;
  font-weight: bold;
  display: block;
}

.legend-comp {
  color: #666;
  font-size: 22rpx;
  display: block;
  margin-top: 4rpx;
}

.legend-remove {
  color: #ff4444;
  font-size: 28rpx;
  padding: 8rpx 16rpx;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
  padding: 20rpx 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #111111;
  border-top: 1rpx solid #333333;
}

.toolbar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10rpx 30rpx;
}

.toolbar-icon {
  color: #FFFFFF;
  font-size: 36rpx;
}

.toolbar-label {
  color: #999;
  font-size: 22rpx;
  margin-top: 4rpx;
}
</style>
