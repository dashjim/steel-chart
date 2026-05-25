<template>
  <view class="chart-page">
    <view class="header">
      <view class="mode-tabs">
        <text :class="['mode-tab', mode === 'mass' ? 'active' : '']" @click="mode='mass'">Mass %</text>
        <text :class="['mode-tab', mode === 'atoms' ? 'active' : '']" @click="mode='atoms'">Atoms</text>
        <text :class="['mode-tab', mode === 'molar' ? 'active' : '']" @click="mode='molar'">Molar %</text>
      </view>
    </view>

    <view
      class="chart-area"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
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

    <view class="legend" v-if="selectedSteels.length > 0">
      <view v-for="steel in selectedSteels" :key="steel.id" class="legend-item">
        <text class="legend-name">{{ steel.name }}</text>
        <text class="legend-comp">{{ formatLegend(steel) }}</text>
      </view>
    </view>

    <view class="toolbar">
      <view class="toolbar-btn" @click="zoomIn">
        <text class="toolbar-icon">+</text>
      </view>
      <view class="toolbar-btn" @click="zoomOut">
        <text class="toolbar-icon">-</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getSteelById } from '@/utils/data.js'
import { getMinMax } from '@/utils/composition.js'

const MODES = ['mass', 'atoms', 'molar']
const MODE_LABELS = { mass: 'Mass %', atoms: 'Atoms', molar: 'Molar %' }

export default {
  data() {
    return {
      selectedSteels: [],
      mode: 'mass',
      yMax: 0,
      touchStartX: 0
    }
  },
  computed: {
    modeLabel() {
      return MODE_LABELS[this.mode] || 'Mass %'
    },
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
  onLoad(query) {
    if (query && query.ids) {
      const ids = query.ids.split(',').map(Number)
      const names = query.name ? [decodeURIComponent(query.name)] : []
      this.selectedSteels = ids.map((id, i) => {
        const steel = getSteelById(id)
        if (steel && names[i]) steel.name = names[i]
        return steel
      }).filter(Boolean)
    }
  },
  methods: {
    zoomIn() {
      if (this.yMax <= 0) {
        this.yMax = this.computeAutoMax() * 0.7
      } else {
        this.yMax = Math.max(0.05, this.yMax * 0.7)
      }
    },
    zoomOut() {
      if (this.yMax <= 0) {
        this.yMax = this.computeAutoMax() * 1.5
      } else {
        this.yMax = this.yMax * 1.5
      }
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
    },
    onTouchStart(e) {
      if (e.touches && e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX
      }
    },
    onTouchEnd(e) {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - this.touchStartX
        if (Math.abs(dx) > 50) {
          const idx = MODES.indexOf(this.mode)
          if (dx < 0) {
            this.mode = MODES[(idx + 1) % MODES.length]
          } else {
            this.mode = MODES[(idx - 1 + MODES.length) % MODES.length]
          }
        }
      }
    },
    formatLegend(steel) {
      if (!steel.composition) return ''
      const parts = []
      for (const [el, vals] of Object.entries(steel.composition)) {
        if (vals.length === 2) parts.push(`${el}:${vals[0]}-${vals[1]}`)
        else parts.push(`${el}:${vals[0]}`)
      }
      return parts.join(' ')
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
  padding: 16rpx 30rpx;
  background-color: #111111;
  border-top: 1rpx solid #333333;
}

.legend-item {
  margin-bottom: 8rpx;
}

.legend-name {
  color: #4A90D9;
  font-size: 26rpx;
  font-weight: bold;
  margin-right: 16rpx;
}

.legend-comp {
  color: #999;
  font-size: 22rpx;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 80rpx;
  padding: 20rpx 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #111111;
  border-top: 1rpx solid #333333;
}

.toolbar-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #555;
  border-radius: 50%;
}

.toolbar-icon {
  color: #FFFFFF;
  font-size: 40rpx;
}
</style>
