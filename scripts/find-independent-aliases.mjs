/**
 * 找出"真正独立"的别名（描述和主名的英文描述明显不同）
 *
 * 算法: Jaccard 相似度(词集合) < 0.6 视为独立
 *
 * 输入:
 *   - src/data/steels.json (含英文 desc 吗? - 不,主名 desc 已翻成中文)
 *   - src/data/alias-metadata.json (有英文 desc)
 *
 * 问题: 主名 desc 是中文，别名 desc 是英文，无法直接比对
 * 解决: 在 alias-metadata.json 内部按"主名所属家族"分组比对
 *       即:一个家族里的别名,如果它们各自描述明显不同,就视为独立
 *
 * 输出: src/data/aliases-to-translate.json
 *   { "Assab88": "Uddeholm proprietary...", ... }
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const steels = JSON.parse(readFileSync(join(ROOT, 'src/data/steels.json'), 'utf-8'))
const aliasMeta = JSON.parse(readFileSync(join(ROOT, 'src/data/alias-metadata.json'), 'utf-8'))

// 建别名 → 所属主名钢材
const aliasToSteel = new Map()
for (const s of steels) {
  for (const a of (s.aliases || [])) {
    if (!aliasToSteel.has(a)) aliasToSteel.set(a, s)
  }
}

// 按主名分组别名
const familyAliases = new Map()  // steel.id → [aliasName...]
for (const [alias, steel] of aliasToSteel) {
  if (!aliasMeta[alias] || !aliasMeta[alias].desc) continue
  if (!familyAliases.has(steel.id)) familyAliases.set(steel.id, [])
  familyAliases.get(steel.id).push(alias)
}

// Jaccard 相似度(词集合)
function wordSet(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3)  // 忽略短词
  )
}
function jaccard(a, b) {
  const sa = wordSet(a), sb = wordSet(b)
  const inter = [...sa].filter(x => sb.has(x)).length
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 1 : inter / union
}

// 找每个家族里"和家族众数描述明显不同"的别名
const independents = {}
let totalChecked = 0
let independentCount = 0

for (const [steelId, aliases] of familyAliases) {
  if (aliases.length < 2) continue  // 单别名家族无对比

  // 找家族里描述的"众数"(出现最多的描述)
  const descCount = new Map()
  for (const a of aliases) {
    const d = aliasMeta[a].desc.trim()
    descCount.set(d, (descCount.get(d) || 0) + 1)
  }
  const sortedDescs = [...descCount.entries()].sort((a, b) => b[1] - a[1])
  const majorityDesc = sortedDescs[0][0]

  for (const a of aliases) {
    totalChecked++
    const d = aliasMeta[a].desc.trim()
    const sim = jaccard(d, majorityDesc)
    if (sim < 0.6) {
      independents[a] = d
      independentCount++
    }
  }
}

// 单别名家族里有 desc 的也算独立(无对比对象,但有内容)
for (const [alias, steel] of aliasToSteel) {
  if (!aliasMeta[alias] || !aliasMeta[alias].desc) continue
  const fam = familyAliases.get(steel.id) || []
  if (fam.length === 1) {
    independents[alias] = aliasMeta[alias].desc
    independentCount++
  }
}

writeFileSync(
  join(ROOT, 'src/data/aliases-to-translate.json'),
  JSON.stringify(independents, null, 2),
  'utf-8'
)

console.log(`总检查: ${totalChecked}`)
console.log(`独立别名: ${independentCount}`)
console.log(`输出: src/data/aliases-to-translate.json`)
console.log()
console.log('前 10 个示例:')
for (const [name, desc] of Object.entries(independents).slice(0, 10)) {
  console.log(`  ${name}: ${desc.slice(0, 80)}...`)
}
