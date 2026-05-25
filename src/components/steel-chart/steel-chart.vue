<template>
  <canvas
    type="2d"
    :id="canvasId"
    :canvas-id="canvasId"
    class="steel-chart-canvas"
    :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
  ></canvas>
</template>

<script>
import { getMinMax, toAtoms, toMolar } from '../../utils/composition.js'

const COLORS = ['#4A90D9', '#E67E22', '#27AE60', '#E74C3C']
const COLORS_LIGHT = ['#7AB3E8', '#F0A860', '#5DC888', '#F08070']

export default {
  name: 'SteelChart',
  props: {
    steels: { type: Array, required: true },
    mode: { type: String, default: 'mass' },
    elements: {
      type: Array,
      default: () => ['C', 'Cr', 'Mo', 'V', 'W', 'Co', 'Ni', 'Mn', 'Si', 'S', 'P', 'Cu', 'Nb', 'N']
    },
    yMax: { type: Number, default: 0 }
  },
  data() {
    return {
      canvasId: 'steelChart_' + Date.now(),
      canvasWidth: 350,
      canvasHeight: 400,
      ctx: null,
      dpr: 1
    }
  },
  watch: {
    steels: { handler() { this.draw() }, deep: true },
    mode() { this.draw() },
    elements: { handler() { this.draw() }, deep: true },
    yMax() { this.draw() }
  },
  mounted() {
    this.$nextTick(() => {
      this.initCanvas()
    })
  },
  methods: {
    initCanvas() {
      const sysInfo = uni.getSystemInfoSync()
      this.dpr = sysInfo.pixelRatio || 2
      this.canvasWidth = sysInfo.windowWidth
      this.canvasHeight = Math.floor(sysInfo.windowHeight * 0.65)

      // #ifdef MP-WEIXIN
      const query = uni.createSelectorQuery().in(this)
      query.select('#' + this.canvasId)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            const canvas = res[0].node
            this.ctx = canvas.getContext('2d')
            canvas.width = this.canvasWidth * this.dpr
            canvas.height = this.canvasHeight * this.dpr
            this.ctx.scale(this.dpr, this.dpr)
            this.draw()
          }
        })
      // #endif

      // #ifndef MP-WEIXIN
      this.ctx = uni.createCanvasContext(this.canvasId, this)
      this.draw()
      // #endif
    },

    getComposition(steel) {
      if (!steel || !steel.composition) return {}
      if (this.mode === 'mass') return steel.composition
      if (this.mode === 'atoms') return toAtoms(steel.composition)
      if (this.mode === 'molar') return toMolar(steel.composition)
      return steel.composition
    },

    computeYMax() {
      if (this.yMax > 0) return this.yMax
      let max = 0
      for (const steel of this.steels) {
        const comp = this.getComposition(steel)
        for (const el of this.elements) {
          const mm = getMinMax(comp[el])
          if (mm && mm.max > max) max = mm.max
        }
      }
      // Round up nicely
      if (max <= 0) return 1
      if (max <= 1) return Math.ceil(max * 10) / 10
      if (max <= 5) return Math.ceil(max)
      return Math.ceil(max / 5) * 5
    },

    draw() {
      const ctx = this.ctx
      if (!ctx) return

      const w = this.canvasWidth
      const h = this.canvasHeight
      const padding = { top: 40, right: 20, bottom: 40, left: 45 }
      const chartW = w - padding.left - padding.right
      const chartH = h - padding.top - padding.bottom
      const yMax = this.computeYMax()
      const elements = this.elements
      const steels = this.steels
      const isMulti = steels.length > 1

      // Clear
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)

      // Grid lines
      const gridCount = 5
      ctx.strokeStyle = '#333333'
      ctx.lineWidth = 0.5
      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      for (let i = 0; i <= gridCount; i++) {
        const y = padding.top + chartH - (i / gridCount) * chartH
        const val = (i / gridCount) * yMax
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(w - padding.right, y)
        ctx.stroke()
        ctx.fillText(val.toFixed(val >= 10 ? 0 : (val >= 1 ? 1 : 2)), padding.left - 5, y)
      }

      // Bars
      const groupWidth = chartW / elements.length
      const barGap = 2
      const barsPerGroup = isMulti ? steels.length : 1
      const barWidth = Math.max(4, (groupWidth - barGap * 2) / barsPerGroup - 2)

      for (let ei = 0; ei < elements.length; ei++) {
        const el = elements[ei]
        const groupX = padding.left + ei * groupWidth

        // X-axis label
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(el, groupX + groupWidth / 2, padding.top + chartH + 5)

        for (let si = 0; si < steels.length; si++) {
          const comp = this.getComposition(steels[si])
          const mm = getMinMax(comp[el])
          if (!mm) continue

          const colorIdx = isMulti ? si : 0
          const darkColor = COLORS[colorIdx % COLORS.length]
          const lightColor = COLORS_LIGHT[colorIdx % COLORS_LIGHT.length]

          const barX = groupX + barGap + si * (barWidth + 2)
          const minH = (mm.min / yMax) * chartH
          const maxH = (mm.max / yMax) * chartH

          // Dark bar (0 to min)
          if (minH > 0) {
            ctx.fillStyle = darkColor
            ctx.fillRect(barX, padding.top + chartH - minH, barWidth, minH)
          }

          // Light bar (min to max)
          if (mm.max > mm.min) {
            ctx.fillStyle = lightColor
            ctx.fillRect(barX, padding.top + chartH - maxH, barWidth, maxH - minH)
          } else if (minH > 0) {
            // Single value - already drawn as dark bar
          }
        }
      }

      // Legend (top-right)
      const legendX = w - padding.right - 10
      const legendY = padding.top + 5
      const lineH = 14
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.font = '10px sans-serif'

      for (let si = 0; si < steels.length; si++) {
        const steel = steels[si]
        const y = legendY + si * lineH
        const colorIdx = isMulti ? si : 0
        ctx.fillStyle = COLORS[colorIdx % COLORS.length]
        ctx.fillRect(legendX - 60, y + 2, 8, 8)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(steel.name || '', legendX, y)
      }

      // #ifndef MP-WEIXIN
      ctx.draw && ctx.draw()
      // #endif
    }
  }
}
</script>

<style scoped>
.steel-chart-canvas {
  display: block;
}
</style>
