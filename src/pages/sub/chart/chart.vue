<template>
  <view class="chart-page">
    <!-- Header -->
    <view class="header">
      <view class="header-left" @click="goBack">
        <text class="icon-btn">&#x2190;</text>
      </view>
      <view class="header-center">
        <text class="mode-label">{{ modeLabel }}</text>
      </view>
      <view class="header-right" @click="toggleLegend">
        <text class="icon-btn">&#x2261;</text>
      </view>
    </view>

    <!-- Chart area with swipe -->
    <view
      class="chart-area"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <steel-chart
        v-if="selectedSteels.length > 0"
        :steels="selectedSteels"
        :mode="mode"
        :elements="selectedElements"
        :yMax="yMax"
      />
      <view v-else class="empty-hint">
        <text class="empty-text">No steels selected</text>
      </view>
    </view>

    <!-- Data table (toggle) -->
    <view v-if="showTable" class="data-table">
      <scroll-view scroll-x class="table-scroll">
        <view class="table-row table-header-row">
          <text class="table-cell table-cell-name">Steel</text>
          <text
            v-for="el in selectedElements"
            :key="el"
            class="table-cell"
          >{{ el }}</text>
        </view>
        <view
          v-for="steel in selectedSteels"
          :key="steel.id"
          class="table-row"
        >
          <text class="table-cell table-cell-name">{{ steel.name }}</text>
          <text
            v-for="el in selectedElements"
            :key="el"
            class="table-cell"
          >{{ formatValue(steel, el) }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- Bottom toolbar -->
    <view class="toolbar">
      <view class="toolbar-btn" @click="toggleTable">
        <text class="toolbar-icon">&#x2637;</text>
      </view>
      <view class="toolbar-btn" @click="zoomIn">
        <text class="toolbar-icon">+</text>
      </view>
      <view class="toolbar-btn" @click="zoomOut">
        <text class="toolbar-icon">-</text>
      </view>
      <view class="toolbar-btn" @click="goElements">
        <text class="toolbar-icon">&#x2699;</text>
      </view>
      <view class="toolbar-btn" @click="toggleSettings">
        <text class="toolbar-icon">&#x2630;</text>
      </view>
      <view class="toolbar-btn" @click="showMore">
        <text class="toolbar-icon">&#x22EF;</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getAllSteels } from '@/utils/data.js'
import { getMinMax } from '@/utils/composition.js'

const ALL_ELEMENTS = ['C', 'Cr', 'Mo', 'V', 'W', 'Co', 'Ni', 'Mn', 'Si', 'S', 'P', 'Cu', 'Nb', 'N']
const MODES = ['mass', 'atoms', 'molar']
const MODE_LABELS = { mass: 'Mass %', atoms: 'Atoms', molar: 'Molar %' }

export default {
  data() {
    return {
      ids: [],
      selectedSteels: [],
      mode: 'mass',
      selectedElements: [...ALL_ELEMENTS],
      yMax: 0,
      showTable: false,
      showLegend: true,
      touchStartX: 0
    }
  },
  computed: {
    modeLabel() {
      return MODE_LABELS[this.mode] || 'Mass %'
    }
  },
  onLoad(query) {
    if (query && query.ids) {
      this.ids = query.ids.split(',').map(Number)
      this.selectedSteels = getAllSteels().filter(s => this.ids.includes(s.id))
    }
    // Restore elements from event channel if available
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (eventChannel) {
      eventChannel.on('updateElements', (data) => {
        if (data && data.elements) {
          this.selectedElements = data.elements
        }
      })
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    toggleLegend() {
      this.showLegend = !this.showLegend
    },
    toggleTable() {
      this.showTable = !this.showTable
    },
    zoomIn() {
      if (this.yMax <= 0) {
        // Auto mode - compute current max and reduce
        this.yMax = this.computeAutoMax() * 0.7
      } else {
        this.yMax = Math.max(0.1, this.yMax * 0.7)
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
        for (const el of this.selectedElements) {
          const mm = getMinMax(steel.composition[el])
          if (mm && mm.max > max) max = mm.max
        }
      }
      return max || 1
    },
    goElements() {
      const elemStr = this.selectedElements.join(',')
      uni.navigateTo({
        url: '/pages/sub/elements/elements?selected=' + elemStr,
        events: {
          updateElements: (data) => {
            if (data && data.elements) {
              this.selectedElements = data.elements
            }
          }
        }
      })
    },
    toggleSettings() {
      // Placeholder for settings panel
    },
    showMore() {
      // Placeholder for more options
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
            // Swipe left -> next mode
            this.mode = MODES[(idx + 1) % MODES.length]
          } else {
            // Swipe right -> prev mode
            this.mode = MODES[(idx - 1 + MODES.length) % MODES.length]
          }
        }
      }
    },
    formatValue(steel, el) {
      const comp = steel.composition
      if (!comp || !comp[el]) return '-'
      const vals = comp[el]
      if (vals.length === 1) return vals[0].toFixed(2)
      return vals[0].toFixed(2) + '-' + vals[1].toFixed(2)
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
}

.header-left,
.header-right {
  width: 60rpx;
}

.header-center {
  flex: 1;
  text-align: center;
}

.mode-label {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.icon-btn {
  color: #FFFFFF;
  font-size: 40rpx;
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

.data-table {
  background-color: #111111;
  max-height: 300rpx;
  border-top: 1rpx solid #333333;
}

.table-scroll {
  white-space: nowrap;
}

.table-row {
  display: flex;
  flex-direction: row;
  border-bottom: 1rpx solid #222222;
}

.table-header-row {
  background-color: #1a1a1a;
}

.table-cell {
  color: #FFFFFF;
  font-size: 20rpx;
  padding: 10rpx 12rpx;
  min-width: 80rpx;
  text-align: center;
}

.table-cell-name {
  min-width: 120rpx;
  text-align: left;
  color: #4A90D9;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20rpx 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #111111;
  border-top: 1rpx solid #333333;
}

.toolbar-btn {
  padding: 10rpx 20rpx;
}

.toolbar-icon {
  color: #FFFFFF;
  font-size: 36rpx;
}
</style>
