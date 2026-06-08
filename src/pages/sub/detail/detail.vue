<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ steelName }}</text>
    </view>

    <view class="section" v-if="compList.length">
      <view class="comp-list">
        <view
          class="comp-item"
          v-for="(item, index) in compList"
          :key="index"
          @click="goElementInfo(index)"
        >
          <text class="comp-el">{{ item.el }}({{ item.zhName }})</text>
          <text class="comp-val">{{ item.value }}</text>
        </view>
      </view>
    </view>

    <view class="section ratings-section" v-if="ratings">
      <view class="rating-header">
        <text class="section-label">性能评分 (0-10)</text>
        <view class="rating-header-right">
          <text class="compare-btn" @click="goChart">对比</text>
          <text class="info-icon" @click="goAbout">ⓘ</text>
        </view>
      </view>
      <view class="rating-group" v-if="ratings.larrin">
        <text class="rating-source">实测数据 (Larrin Thomas)</text>
        <view class="rating-row">
          <view class="rating-item">
            <text class="rating-label">韧性</text>
            <text class="rating-value">{{ ratings.larrin.toughness }}</text>
          </view>
          <view class="rating-item">
            <text class="rating-label">保持性</text>
            <text class="rating-value">{{ ratings.larrin.edgeRetention }}</text>
          </view>
          <view class="rating-item">
            <text class="rating-label">防锈</text>
            <text class="rating-value">{{ ratings.larrin.corrosion }}</text>
          </view>
        </view>
      </view>
      <view class="rating-group">
        <text class="rating-source">{{ ratings.larrin ? '性能估算' : '性能估算 (无实测数据)' }}</text>
        <view class="rating-row">
          <view class="rating-item">
            <text class="rating-label">韧性</text>
            <text class="rating-value est">{{ ratings.estimated.toughness }}</text>
          </view>
          <view class="rating-item">
            <text class="rating-label">保持性</text>
            <text class="rating-value est">{{ ratings.estimated.edgeRetention }}</text>
          </view>
          <view class="rating-item">
            <text class="rating-label">防锈</text>
            <text class="rating-value est">{{ ratings.estimated.corrosion }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="steelMaker || steelTech">
      <view class="info-row" v-if="steelMaker"><text class="info-text" user-select>制造商: {{ steelMaker }}</text></view>
      <view class="info-row" v-if="steelTech"><text class="info-text" user-select>工艺: {{ steelTech }}</text></view>
    </view>

    <view class="section" v-if="steelStandard || steelCountry">
      <view class="info-row" v-if="steelStandard"><text class="info-text" user-select>标准: {{ steelStandard }}</text></view>
      <view class="info-row" v-if="steelCountry"><text class="info-text" user-select>国家: {{ steelCountry }}</text></view>
    </view>

    <view class="section" v-if="descParts.length">
      <text class="section-label">描述:</text>
      <text class="description-text" user-select>
        <text
          v-for="(part, idx) in descParts"
          :key="idx"
          :class="part.type === 'link' ? 'desc-link' : ''"
          @click="part.type === 'link' && goSteelByName(part.id, part.value)"
        >{{ part.value }}</text>
      </text>
    </view>

    <view class="section" v-if="aliasList.length">
      <text class="section-label">交叉引用:</text>
      <view class="aliases-list">
        <text
          class="alias-link"
          v-for="(alias, index) in aliasList"
          :key="index"
          @click="onAliasClick(index)"
        >{{ alias }}</text>
      </view>
    </view>

  </view>
</template>

<script>
import { getSteelById, getAllSteels } from '@/utils/data.js'
import { search } from '@/utils/search.js'
import { getRatings } from '@/utils/ratings.js'

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
      steelMaker: '',
      steelTech: '',
      steelStandard: '',
      steelCountry: '',
      ratings: null,
      descParts: [],
      compList: [],
      aliasList: []
    }
  },
  onShareAppMessage() {
    return { title: this.steelName + ' - 钢材成分', path: '/pages/sub/detail/detail?id=' + this.id + '&name=' + encodeURIComponent(this.steelName) }
  },
  onShareTimeline() {
    return {}
  },
  onLoad(options) {
    this.id = options.id
    const steel = getSteelById(this.id)
    if (steel) {
      this.steelName = options.name ? decodeURIComponent(options.name) : steel.name
      this.steelMaker = steel.maker || ''
      const TECH_NAMES = { PM: '粉末冶金(PM)', CPM: '坩埚粉末冶金(CPM)', MM: 'Micro-Melt', ESR: '电渣重熔(ESR)', SF: '喷射成形(SF)', VIM: '真空感应熔炼(VIM)' }
      this.steelTech = steel.tech ? (TECH_NAMES[steel.tech] || steel.tech) : ''
      this.steelStandard = steel.standard || ''
      this.steelCountry = steel.country || ''
      this.ratings = getRatings(steel)
      this.descParts = this.parseDescription(steel.desc || '')
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
    parseDescription(desc) {
      if (!desc) return []
      const allSteels = getAllSteels()
      // 收集所有名称，同名称优先选主名称匹配的钢材
      const nameMap = new Map()
      for (const s of allSteels) {
        if (s.id === parseInt(this.id)) continue
        if (s.name.length >= 3) {
          const key = s.name.toLowerCase()
          if (!nameMap.has(key)) nameMap.set(key, { name: s.name, id: s.id, isPrimary: true })
        }
        if (s.aliases) {
          for (const a of s.aliases) {
            if (a.length < 3) continue
            const key = a.toLowerCase()
            const existing = nameMap.get(key)
            if (!existing) {
              nameMap.set(key, { name: a, id: s.id, isPrimary: false })
            } else if (!existing.isPrimary && s.name.toLowerCase().includes(key)) {
              nameMap.set(key, { name: a, id: s.id, isPrimary: false })
            }
          }
        }
      }
      const names = [...nameMap.values()]
      names.sort((a, b) => b.name.length - a.name.length)

      // 标记描述中所有匹配位置
      const marks = []
      const usedRanges = []
      for (const entry of names) {
        let pos = 0
        while (true) {
          const idx = desc.indexOf(entry.name, pos)
          if (idx === -1) break
          const end = idx + entry.name.length
          // 检查不重叠
          const overlap = usedRanges.some(r => idx < r[1] && end > r[0])
          if (!overlap) {
            marks.push({ start: idx, end, name: entry.name, id: entry.id })
            usedRanges.push([idx, end])
          }
          pos = idx + 1
        }
      }
      marks.sort((a, b) => a.start - b.start)

      // 分段
      const parts = []
      let cursor = 0
      for (const m of marks) {
        if (m.start > cursor) {
          parts.push({ type: 'text', value: desc.substring(cursor, m.start) })
        }
        parts.push({ type: 'link', value: m.name, id: m.id })
        cursor = m.end
      }
      if (cursor < desc.length) {
        parts.push({ type: 'text', value: desc.substring(cursor) })
      }
      return parts.length ? parts : [{ type: 'text', value: desc }]
    },
    goSteelByName(id, name) {
      uni.navigateTo({ url: '/pages/sub/detail/detail?id=' + id + '&name=' + encodeURIComponent(name) })
    },
    goAbout() {
      uni.switchTab({ url: '/pages/about/about' })
    },
    goElementInfo(index) {
      const el = this.compList[index] && this.compList[index].el
      if (el) uni.navigateTo({ url: '/pages/sub/element-info/element-info?element=' + el })
    },
    onAliasClick(index) {
      const alias = this.aliasList[index]
      if (!alias) return
      const results = search(alias)
      const target = results.find(r => r.displayName === alias)
      if (target) {
        uni.navigateTo({ url: '/pages/sub/detail/detail?id=' + target.id + '&name=' + encodeURIComponent(alias) })
      }
    },
    goChart() {
      uni.navigateTo({
        url: '/pages/sub/chart/chart?ids=' + this.id + '&name=' + encodeURIComponent(this.steelName)
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
  display: block;
  margin-bottom: 16rpx;
}

.ratings-section {
  background-color: #0a0a0a;
  border-radius: 12rpx;
  padding: 24rpx;
}

.rating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rating-header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.compare-btn {
  color: #ffffff;
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  background-color: #333;
  border-radius: 20rpx;
  border: 1rpx solid #555;
}

.info-icon {
  color: #666;
  font-size: 32rpx;
}

.rating-group {
  margin-bottom: 20rpx;
}

.rating-source {
  color: #888;
  font-size: 24rpx;
  display: block;
  margin-bottom: 12rpx;
}

.rating-row {
  display: flex;
  justify-content: space-around;
}

.rating-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rating-label {
  color: #999;
  font-size: 22rpx;
  margin-bottom: 6rpx;
}

.rating-value {
  color: #FFD700;
  font-size: 36rpx;
  font-weight: bold;
}

.rating-value.est {
  color: #4A90D9;
  font-size: 32rpx;
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

.info-row {
  margin-bottom: 8rpx;
}

.info-text {
  color: #ffffff;
  font-size: 28rpx;
}

.standard-text {
  color: #ffffff;
  font-size: 28rpx;
}

.description-text {
  color: #cccccc;
  font-size: 30rpx;
  line-height: 1.6;
}

.desc-link {
  color: #FFA500;
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

</style>
