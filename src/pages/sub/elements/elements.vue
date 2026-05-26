<template>
  <view class="page">
    <view class="header">
      <text class="title">元素成分</text>
    </view>
    <view class="element-list">
      <view
        v-for="item in elementsList"
        :key="item.symbol"
        class="element-item"
        @click="goElementInfo(item.symbol)"
      >
        <view class="element-row">
          <text class="element-name">{{ item.name }}({{ item.symbol }})</text>
          <text class="element-value">{{ item.value }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getSteelById } from '@/utils/data.js'

const ELEMENT_NAMES = {
  C: '碳', Cr: '铬', Mo: '钼', V: '钒', W: '钨',
  Co: '钴', Ni: '镍', Mn: '锰', Si: '硅',
  S: '硫', P: '磷', Cu: '铜', Nb: '铌', N: '氮'
}

export default {
  data() {
    return {
      elementsList: []
    }
  },
  onShareAppMessage() {
    return { title: "元素成分", path: "/pages/index/index" }
  },
  onLoad(query) {
    if (query && query.id) {
      const steel = getSteelById(query.id)
      if (steel && steel.composition) {
        this.elementsList = Object.entries(steel.composition).map(([symbol, vals]) => ({
          symbol,
          name: ELEMENT_NAMES[symbol] || symbol,
          value: vals.length === 2 ? `${vals[0]}-${vals[1]}%` : `${vals[0]}%`
        }))
      }
    }
  },
  methods: {
    goElementInfo(symbol) {
      uni.navigateTo({
        url: '/pages/sub/element-info/element-info?element=' + symbol
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
}

.header {
  margin-bottom: 30rpx;
}

.title {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: bold;
}

.element-list {
  border-top: 1rpx solid #333;
}

.element-item {
  border-bottom: 1rpx solid #333;
  padding: 28rpx 16rpx;
}

.element-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.element-name {
  color: #ffffff;
  font-size: 30rpx;
}

.element-value {
  color: #cccccc;
  font-size: 28rpx;
}
</style>
