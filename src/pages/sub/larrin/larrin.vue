<template>
  <view class="page">
    <view class="intro">
      <text class="intro-title">Larrin Thomas 评级</text>
      <text class="intro-desc">61 种刀具钢材的实测评分（CATRA 切割 / Charpy 冲击 / 盐雾腐蚀）</text>
      <text class="intro-desc">数据来源: knifesteelnerds.com</text>
    </view>

    <view class="filter-label">分类</view>
    <view class="sort-tabs">
      <text
        v-for="(opt, i) in catOpts"
        :key="'c'+i"
        :class="['sort-tab', cat === opt.key ? 'active' : '']"
        @click="setCat(opt.key)"
      >{{ opt.label }}<text class="tab-count" v-if="opt.count != null"> {{ opt.count }}</text></text>
    </view>

    <view class="filter-label">排序 <text class="filter-info" @click="showSortHelp">ⓘ</text></view>
    <view class="sort-tabs">
      <text
        v-for="(opt, i) in sortOpts"
        :key="'s'+i"
        :class="['sort-tab', isDimActive(opt.key) ? 'active' : '']"
        @click="setSort(opt.key)"
      >{{ opt.label }}</text>
    </view>

    <view class="header-row">
      <text class="col-name">钢材</text>
      <text class="col-score">保持性</text>
      <text class="col-score">防锈</text>
      <text class="col-score">韧性</text>
    </view>

    <view class="list">
      <view
        class="row"
        v-for="(item, idx) in sortedList"
        :key="item.name"
        @click="goDetail(idx)"
      >
        <text class="row-name">{{ (idMap[item.name] && idMap[item.name].primaryName) || item.name }}</text>
        <view class="score-cell">
          <text class="score-val">{{ item.edgeRetention }}</text>
          <view class="score-bar"><view class="score-fill er" :style="{width: (item.edgeRetention*10)+'%'}"></view></view>
        </view>
        <view class="score-cell">
          <text class="score-val">{{ item.corrosion }}</text>
          <view class="score-bar"><view class="score-fill co" :style="{width: (item.corrosion*10)+'%'}"></view></view>
        </view>
        <view class="score-cell">
          <text class="score-val">≈{{ item.toughness }}</text>
          <view class="score-bar"><view class="score-fill to" :style="{width: (item.toughness*10)+'%'}"></view></view>
        </view>
      </view>
    </view>

    <text class="footer-note">注: 韧性受热处理/工艺影响大，标 ≈ 表示低置信度。点击钢材跳转详情。</text>
  </view>
</template>

<script>
import larrinRatings from '@/data/larrin-ratings.json'
import { getAllSteels } from '@/utils/data.js'

export default {
  data() {
    return {
      // 当前选中的维度集合，例如 ['edgeRetention'] 或 ['edgeRetention','toughness']
      // 空集合 = 默认排序
      selectedDims: [],
      cat: 'all',
      DIMS: ['edgeRetention', 'corrosion', 'toughness'],
      sortOpts: [
        { key: 'default', label: '默认' },
        { key: 'edgeRetention', label: '保持性' },
        { key: 'corrosion', label: '防锈' },
        { key: 'toughness', label: '韧性' },
        { key: 'combined', label: '综合' }
      ],
      idMap: {}
    }
  },
  computed: {
    catOpts() {
      const counts = { all: larrinRatings.length, 'low-alloy': 0, 'high-alloy': 0, stainless: 0 }
      for (const r of larrinRatings) if (counts[r.category] != null) counts[r.category]++
      return [
        { key: 'all', label: '全部', count: counts.all },
        { key: 'low-alloy', label: '碳钢/低合金', count: counts['low-alloy'] },
        { key: 'high-alloy', label: '高合金', count: counts['high-alloy'] },
        { key: 'stainless', label: '不锈钢', count: counts.stainless }
      ]
    },
    isAllThree() {
      return this.selectedDims.length === 3
    },
    isDefault() {
      return this.selectedDims.length === 0
    },
    sortedList() {
      let list = larrinRatings.map(r => ({
        ...r,
        combined: (r.edgeRetention || 0) + (r.corrosion || 0) + (r.toughness || 0)
      }))
      if (this.cat !== 'all') list = list.filter(r => r.category === this.cat)
      if (this.isDefault) return list
      // 按选中维度之和排序
      const dims = this.selectedDims
      return list.slice().sort((a, b) => {
        const sa = dims.reduce((s, d) => s + (a[d] || 0), 0)
        const sb = dims.reduce((s, d) => s + (b[d] || 0), 0)
        return sb - sa
      })
    }
  },
  onShareAppMessage() {
    return { title: '61 种刀具钢材的 Larrin Thomas 评级', path: '/pages/sub/larrin/larrin' }
  },
  onShareTimeline() {
    return {}
  },
  onLoad() {
    // larrin-ratings.json 的 name 已对齐数据库主名，直接精确匹配即可
    const steels = getAllSteels()
    const primaryToId = {}
    for (const s of steels) primaryToId[s.name] = s.id

    const map = {}
    for (const r of larrinRatings) {
      if (primaryToId[r.name] != null) {
        map[r.name] = { id: primaryToId[r.name], primaryName: r.name }
      }
    }
    this.idMap = map
  },
  methods: {
    setSort(key) {
      if (key === 'default') {
        this.selectedDims = []
        return
      }
      if (key === 'combined') {
        // 综合按钮: 切换"全选三维"和"清空"
        this.selectedDims = this.isAllThree ? [] : this.DIMS.slice()
        return
      }
      // 三个维度: 切换该维度的选中状态
      const idx = this.selectedDims.indexOf(key)
      if (idx >= 0) this.selectedDims = this.selectedDims.filter(d => d !== key)
      else this.selectedDims = [...this.selectedDims, key]
    },
    // 判断按钮是否高亮
    isDimActive(key) {
      if (key === 'default') return this.isDefault
      if (key === 'combined') return this.isAllThree
      return this.selectedDims.includes(key)
    },
    setCat(key) {
      this.cat = key
    },
    showSortHelp() {
      uni.showModal({
        title: '排序规则说明',
        content: '默认: Larrin 文章原始顺序\n\n三个维度（保持性/防锈/韧性）可多选:\n· 选 1 项: 按单项分数从高到低\n· 选 2 项: 按两项之和排序\n· 选 3 项: "综合"自动亮起（= 三项之和，简单求和未加权）\n\n点"综合"等同于全选三维度，再点一下清空。\n\n注: 综合分仅供参考，实际选钢应结合用途权衡（切硬物看保持性，户外看防锈，斧/砍刀看韧性）。',
        showCancel: false,
        confirmText: '知道了'
      })
    },
    goDetail(idx) {
      const item = this.sortedList[idx]
      const target = this.idMap[item.name]
      if (!target) {
        uni.showToast({ title: '未找到该钢材', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: '/pages/sub/detail/detail?id=' + target.id + '&name=' + encodeURIComponent(target.primaryName)
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #000000;
  padding: 30rpx 24rpx;
  box-sizing: border-box;
}

.intro {
  margin-bottom: 24rpx;
}

.intro-title {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.intro-desc {
  color: #888;
  font-size: 24rpx;
  display: block;
  line-height: 1.6;
}

.filter-label {
  color: #666;
  font-size: 22rpx;
  margin-bottom: 8rpx;
  margin-top: 4rpx;
}

.filter-info {
  color: #888;
  font-size: 22rpx;
  margin-left: 6rpx;
}

.sort-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.tab-count {
  color: inherit;
  opacity: 0.6;
}

.sort-tab {
  color: #888;
  font-size: 24rpx;
  padding: 8rpx 22rpx;
  background-color: #1a1a1a;
  border-radius: 24rpx;
  border: 1rpx solid #333;
}

.sort-tab.active {
  color: #000;
  background-color: #FFD700;
  border-color: #FFD700;
  font-weight: bold;
}

.header-row {
  display: flex;
  align-items: center;
  padding: 12rpx 8rpx;
  border-bottom: 1rpx solid #333;
}

.col-name {
  flex: 1.6;
  color: #999;
  font-size: 22rpx;
}

.col-score {
  flex: 1;
  color: #999;
  font-size: 22rpx;
  text-align: center;
}

.list {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  padding: 18rpx 8rpx;
  border-bottom: 1rpx solid #1f1f1f;
}

.row-name {
  flex: 1.6;
  color: #FFD700;
  font-size: 26rpx;
  font-weight: bold;
}

.score-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-val {
  color: #ffffff;
  font-size: 24rpx;
  margin-bottom: 6rpx;
}

.score-bar {
  width: 90%;
  height: 6rpx;
  background-color: #1a1a1a;
  border-radius: 3rpx;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3rpx;
}

.score-fill.er { background-color: #4A90D9; }
.score-fill.co { background-color: #27AE60; }
.score-fill.to { background-color: #E67E22; }

.footer-note {
  display: block;
  color: #666;
  font-size: 22rpx;
  line-height: 1.6;
  margin-top: 24rpx;
  padding-bottom: 30rpx;
}
</style>
