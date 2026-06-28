/**
 * 批量修复 zknives 主表里 HSS 钢材 V/W 列错位的数据。
 *
 * 判定规则: 别名含 HS{W}-{Mo}-{V} 命名, 且我们的 V(max) 与 HS{W} 接近、
 *           我们的 W(max) 与 HS{V} 接近(±1) → V 和 W 互换。
 */
import fs from 'fs'

const data = JSON.parse(fs.readFileSync('src/data/steels.json', 'utf-8'))

const SWAPS = []
for (const s of data) {
  if (!s.composition) continue
  const v = s.composition.V
  const w = s.composition.W
  if (!v || !w) continue
  const vMax = Math.max(...v)
  const wMax = Math.max(...w)
  if (vMax <= wMax) continue

  const hsMatch = [s.name, ...(s.aliases || [])]
    .map(n => {
      const m = String(n).match(/^HS(\d+)-(\d+)-(\d+)(?:-(\d+))?(?:C)?$/i)
      return m ? { w: +m[1], mo: +m[2], v: +m[3] } : null
    })
    .filter(Boolean)[0]
  if (!hsMatch) continue

  const vCloseToHsW = Math.abs(vMax - hsMatch.w) <= 1
  const wCloseToHsV = Math.abs(wMax - hsMatch.v) <= 1
  if (vCloseToHsW && wCloseToHsV) {
    SWAPS.push({ id: s.id, name: s.name, before: { V: v, W: w } })
    ;[s.composition.V, s.composition.W] = [s.composition.W, s.composition.V]
  }
}

fs.writeFileSync('src/data/steels.json', JSON.stringify(data))

console.log(`修正 ${SWAPS.length} 条:`)
for (const s of SWAPS) {
  console.log(`  ${s.name.padEnd(20)} V↔W: V was ${JSON.stringify(s.before.V)}, now ${JSON.stringify(s.before.W)}`)
}
