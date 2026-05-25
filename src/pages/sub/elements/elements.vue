<template>
  <view class="elements-page">
    <!-- Header -->
    <view class="header">
      <view class="header-left" @click="onCancel">
        <text class="header-btn">Cancel</text>
      </view>
      <view class="header-center">
        <text class="header-title">Choose Elements</text>
      </view>
      <view class="header-right" @click="onRebuild">
        <text class="header-btn header-btn-primary">Rebuild</text>
      </view>
    </view>

    <!-- Element list -->
    <scroll-view scroll-y class="element-list">
      <view
        v-for="item in elementList"
        :key="item.symbol"
        class="element-item"
        @click="toggleElement(item.symbol)"
      >
        <view class="element-checkbox">
          <view
            class="checkbox-inner"
            :class="{ checked: selected.includes(item.symbol) }"
          >
            <text v-if="selected.includes(item.symbol)" class="check-mark">&#x2713;</text>
          </view>
        </view>
        <view class="element-info">
          <text class="element-name">{{ item.name }} ({{ item.symbol }})</text>
        </view>
        <view class="element-action" @click.stop="onInfo(item)">
          <text class="info-btn">i</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const ELEMENTS = [
  { symbol: 'C', name: 'Carbon' },
  { symbol: 'Cr', name: 'Chromium' },
  { symbol: 'Mo', name: 'Molybdenum' },
  { symbol: 'V', name: 'Vanadium' },
  { symbol: 'W', name: 'Tungsten' },
  { symbol: 'Co', name: 'Cobalt' },
  { symbol: 'Ni', name: 'Nickel' },
  { symbol: 'Mn', name: 'Manganese' },
  { symbol: 'Si', name: 'Silicon' },
  { symbol: 'S', name: 'Sulfur' },
  { symbol: 'P', name: 'Phosphorus' },
  { symbol: 'Cu', name: 'Copper' },
  { symbol: 'Nb', name: 'Niobium' },
  { symbol: 'N', name: 'Nitrogen' }
]

export default {
  data() {
    return {
      elementList: ELEMENTS,
      selected: ELEMENTS.map(e => e.symbol)
    }
  },
  onLoad(query) {
    if (query && query.selected) {
      this.selected = query.selected.split(',').filter(Boolean)
    }
  },
  methods: {
    toggleElement(symbol) {
      const idx = this.selected.indexOf(symbol)
      if (idx >= 0) {
        this.selected.splice(idx, 1)
      } else {
        this.selected.push(symbol)
      }
    },
    onCancel() {
      uni.navigateBack()
    },
    onRebuild() {
      const eventChannel = this.getOpenerEventChannel()
      if (eventChannel) {
        eventChannel.emit('updateElements', { elements: [...this.selected] })
      }
      uni.navigateBack()
    },
    onInfo(item) {
      uni.showToast({
        title: `${item.name} (${item.symbol})`,
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.elements-page {
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
  border-bottom: 1rpx solid #333333;
}

.header-left,
.header-right {
  width: 120rpx;
}

.header-center {
  flex: 1;
  text-align: center;
}

.header-title {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: bold;
}

.header-btn {
  color: #4A90D9;
  font-size: 28rpx;
}

.header-btn-primary {
  font-weight: bold;
}

.element-list {
  flex: 1;
}

.element-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #222222;
}

.element-checkbox {
  margin-right: 24rpx;
}

.checkbox-inner {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #555555;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-inner.checked {
  background-color: #4A90D9;
  border-color: #4A90D9;
}

.check-mark {
  color: #FFFFFF;
  font-size: 24rpx;
}

.element-info {
  flex: 1;
}

.element-name {
  color: #FFFFFF;
  font-size: 28rpx;
}

.element-action {
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-btn {
  color: #4A90D9;
  font-size: 28rpx;
  font-style: italic;
  font-weight: bold;
  border: 2rpx solid #4A90D9;
  border-radius: 50%;
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
}
</style>
