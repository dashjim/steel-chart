<template>
  <view class="page">
    <view class="header">{{ fullName }}</view>
    <view class="description">{{ description }}</view>
  </view>
</template>

<script>
const elementData = {
  C: { name: 'Carbon', desc: '存在于所有刀具钢中，是最重要的硬化元素。提高抗拉强度和保持性，改善耐磨性和耐腐蚀性，提高硬度。' },
  Cr: { name: 'Chromium', desc: '提高耐腐蚀性和耐磨性、硬度、抗拉强度。良好的碳化物形成元素。至少需要13%的铬才能成为不锈钢。高含量会降低韧性。' },
  Mo: { name: 'Molybdenum', desc: '提高可加工性、耐腐蚀性和抗脆性、高温强度。碳化物形成元素。' },
  V: { name: 'Vanadium', desc: '提高耐磨性、淬透性，细化晶粒，改善韧性和刃口稳定性。强碳化物形成元素。' },
  W: { name: 'Tungsten', desc: '提高耐磨性、硬度、工作温度。仅次于Nb和V的最强碳化物形成元素。' },
  Co: { name: 'Cobalt', desc: '提高高温强度和硬度，允许在更高温度下淬火，增强其他元素的个别效果。' },
  Ni: { name: 'Nickel', desc: '提高韧性。在大马士革钢中形成较亮的部分。' },
  Mn: { name: 'Manganese', desc: '改善晶粒组织、淬透性、强度和耐磨性。在制造过程中脱氧和脱气。大量时增加硬度和脆性。' },
  Si: { name: 'Silicon', desc: '提高强度。与锰类似，在制造过程中脱氧和脱气。' },
  S: { name: 'Sulfur', desc: '降低韧性。在刀具钢中不理想，但能提高可加工性。' },
  P: { name: 'Phosphorus', desc: '污染物，在大多数钢中以少量存在。极少量时提高强度、可加工性和硬度。' },
  Cu: { name: 'Copper', desc: '0.20%-1%之间有助于防止表面氧化。大量时对钢材性能有害。' },
  Nb: { name: 'Niobium', desc: '强碳化物形成元素，细化晶粒。改善强度、韧性和耐腐蚀性。' },
  N: { name: 'Nitrogen', desc: '可以替代碳作为奥氏体形成元素。提高耐腐蚀性（特别是在低碳钢中）。' },
}

export default {
  data() {
    return {
      fullName: '',
      description: '',
    }
  },
  onLoad(options) {
    const symbol = options.element || ''
    const info = elementData[symbol]
    if (info) {
      this.fullName = `${info.name}(${symbol})`
      this.description = info.desc
    } else {
      this.fullName = symbol
      this.description = '暂无描述'
    }
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #000000;
  padding: 40rpx;
  box-sizing: border-box;
}

.header {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 30rpx;
}

.description {
  font-size: 28rpx;
  color: #cccccc;
  font-style: italic;
  line-height: 1.6;
}
</style>
