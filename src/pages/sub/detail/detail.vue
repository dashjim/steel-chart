<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ steelName }}</text>
    </view>

    <view class="section" v-if="compList.length">
      <view class="comp-list">
        <view
          class="comp-item"
          v-for="item in compList"
          :key="item.el"
          @click="goElementInfo(item.el)"
        >
          <text class="comp-el">{{ item.el }}({{ item.zhName }})</text>
          <text class="comp-val">{{ item.value }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="steelStandard || steelCountry">
      <text class="section-label">Standard:</text>
      <text class="standard-text">{{ steelStandard }} {{ steelCountry ? '(' + steelCountry + ')' : '' }}</text>
    </view>

    <view class="section" v-if="description">
      <text class="section-label">Notes:</text>
      <text class="description-text">{{ description }}</text>
    </view>

    <view class="section" v-if="aliasList.length">
      <text class="section-label">Cross-References:</text>
      <view class="aliases-list">
        <text
          class="alias-link"
          v-for="(alias, index) in aliasList"
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
import { getSteelById } from '@/utils/data.js'
import { search } from '@/utils/search.js'

const EL_NAMES = {
  C: '碳', Cr: '铬', Mo: '钼', V: '钒', W: '钨',
  Co: '钴', Ni: '镍', Mn: '锰', Si: '硅',
  S: '硫', P: '磷', Cu: '铜', Nb: '铌', N: '氮'
}

export default {
  data() {
    return {
      id: null,
      steelName: '',
      steelStandard: '',
      steelCountry: '',
      description: '',
      compList: [],
      aliasList: []
    }
  },
  onLoad(options) {
    this.id = options.id
    const steel = getSteelById(this.id)
    if (steel) {
      this.steelName = steel.name
      this.steelStandard = steel.standard || ''
      this.steelCountry = steel.country || ''
      this.description = steel.desc || ''
      if (steel.composition) {
        this.compList = Object.entries(steel.composition).map(([el, vals]) => ({
          el,
          zhName: EL_NAMES[el] || el,
          value: vals.length === 2 ? `${vals[0]}-${vals[1]}%` : `${vals[0]}%`
        }))
      }
      if (steel.aliases) {
        this.aliasList = steel.aliases.slice()
      }
    }
  },
  methods: {
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
