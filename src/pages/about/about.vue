
<template>
  <view class="page">
    <view class="app-name">钢材狂魔</view>
    <view class="version">版本 1.2.0</view>
    <view class="desc">「钢材狂魔」由「细节狂魔」创建，欢迎大家找他反馈问题。这个小程序会越来越丰富，从钢材化学成分逐步拓展到更多钢材相关的内容。</view>
    <view class="desc">小程序中的数据由「细节狂魔」从公开数据收集整理。目前收录 1451 种钢材、34899 个名称（含各国标准别名），帮助您了解各种钢材的元素组成及其对性能的影响。</view>
    <view class="stats">
      <view class="stat-item">钢材种类: 1451</view>
      <view class="stat-item">名称/别名: 34899</view>
      <view class="stat-item">覆盖标准: AISI, DIN, GB, JIS, GOST 等</view>
      <view class="stat-item">实测评分: 61 种（Larrin Thomas）</view>
    </view>
    <view class="section-title">性能预测模型</view>
    <view class="model-desc">基于冶金学家 Larrin Thomas (knifesteelnerds.com) 对 61 种刀具钢的实测数据（CATRA 切割测试、Charpy 冲击测试、盐雾腐蚀测试），训练线性回归模型，用于估算未测试钢材的韧性、保持性和防锈评分（满分10分）。</view>
    <view class="stats">
      <view class="stat-item">保持性预测 R²: 0.98（平均误差 ±0.3分）</view>
      <view class="stat-item">防锈预测 R²: 0.99（平均误差 ±0.3分）</view>
      <view class="stat-item">韧性预测 R²: 0.76（平均误差 ±1分，粉末钢已校正）</view>
    </view>
    <view class="model-note">注: 韧性受热处理和微观组织影响大，仅凭成分预测精度有限。有实测数据的钢材优先显示实测评分。</view>
    <view class="section-title">数据来源</view>
    <view class="stats">
      <view class="stat-item">成分数据: zknives.com</view>
      <view class="stat-item">性能评分: knifesteelnerds.com (Larrin Thomas)</view>
    </view>

    <view class="section-title">更新日志</view>
    <view class="release" v-for="(rel, idx) in releases" :key="idx">
      <view class="release-head">
        <text class="release-ver">v{{ rel.version }}</text>
        <text class="release-date">{{ rel.date }}</text>
      </view>
      <text class="release-item" v-for="(line, li) in rel.items" :key="li">· {{ line }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      releases: [
        {
          version: '1.2.0',
          date: '2026-06-13',
          items: [
            '小程序更名「钢材狂魔」，全新首页',
            '新增综合性能散点图（韧性 vs 保持性）',
            '韧性预测标注低置信度（≈），评分重新排序',
            '图片支持系统原生缩放查看',
            '收藏页区分对比图表与成分收藏'
          ]
        },
        {
          version: '1.1.0',
          date: '2026-06-08',
          items: [
            '新增性能评分（韧性/保持性/防锈）与预测模型',
            '成分对比图表大升级，最多 5 种钢材同屏对比',
            '新增 CATRA 保持性天梯图',
            '首页改为搜索式，优先展示知名钢材'
          ]
        },
        {
          version: '1.0.0',
          date: '2026-05-25',
          items: [
            '刀具钢材成分数据库上线，收录 1451 种钢材',
            '支持成分查询、中文描述、元素说明',
            '34899 个名称/别名搜索，支持模糊匹配',
            '收藏、分享功能'
          ]
        }
      ]
    }
  },
  onShareAppMessage() {
    return { title: "钢材狂魔 - 1451种刀具钢材数据库", path: "/pages/index/index" }
  },
  onShareTimeline() {
    return {}
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #000000;
  padding: 60rpx 40rpx;
  box-sizing: border-box;
}

.app-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 20rpx;
}

.version {
  font-size: 28rpx;
  color: #888888;
  margin-bottom: 40rpx;
}

.desc {
  font-size: 28rpx;
  color: #cccccc;
  line-height: 1.6;
  margin-bottom: 40rpx;
}

.stats {
  margin-bottom: 40rpx;
}

.stat-item {
  font-size: 26rpx;
  color: #aaaaaa;
  line-height: 2;
}

.source {
  font-size: 26rpx;
  color: #888888;
}

.section-title {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.model-desc {
  font-size: 26rpx;
  color: #cccccc;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.model-note {
  font-size: 24rpx;
  color: #888;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.release {
  margin-bottom: 28rpx;
}

.release-head {
  display: flex;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.release-ver {
  font-size: 28rpx;
  color: #FFD700;
  font-weight: bold;
  margin-right: 16rpx;
}

.release-date {
  font-size: 22rpx;
  color: #888;
}

.release-item {
  display: block;
  font-size: 25rpx;
  color: #bbbbbb;
  line-height: 1.7;
}
</style>
