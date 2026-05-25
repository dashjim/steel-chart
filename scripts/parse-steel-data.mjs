/**
 * 从 steelchart.php 解析钢材数据，输出 steels.json + searchIndex.json
 *
 * 用法: node scripts/parse-steel-data.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCE = join(ROOT, 'doc/source-data/steelchart.php')
const OUT_DIR = join(ROOT, 'src/static/data')

const ELEMENTS = ['C', 'Cr', 'Mo', 'V', 'W', 'Co', 'Ni', 'Mn', 'Si', 'S', 'P', 'Cu', 'Nb', 'N']

function parseComposition(value) {
  if (!value || value === '0.00' || value === '0' || value === '?' || value === '-') return null
  const match = value.match(/^([\d.]+)-([\d.]+)$/)
  if (match) return [parseFloat(match[1]), parseFloat(match[2])]
  const single = parseFloat(value)
  if (!isNaN(single) && single > 0) return [single]
  return null
}

function extractNames(html) {
  const names = []
  const linkPattern = /<a[^>]*>([^<]+)<\/a>/g
  let m
  while ((m = linkPattern.exec(html)) !== null) {
    const name = m[1].replace(/&nbsp;/g, ' ').trim()
    if (name) names.push(name)
  }
  return names
}

function extractId(checkboxHtml) {
  const m = checkboxHtml.match(/value='([^,]+),(\d+)'/)
  if (m) return { name: m[1], id: parseInt(m[2]) }
  return null
}

function parseTdContents(trHtml) {
  const tds = []
  const tdPattern = /<td>(.*?)<\/td>/gs
  let m
  while ((m = tdPattern.exec(trHtml)) !== null) {
    tds.push(m[1])
  }
  return tds
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

// 读取源文件
const source = readFileSync(SOURCE, 'utf-8')

// 提取表格行
const trPattern = /<tr>(.*?)<\/tr>/gs
const rows = []
let match
while ((match = trPattern.exec(source)) !== null) {
  rows.push(match[1])
}

console.log(`找到 ${rows.length} 行数据`)

// 解析每一行
const steelsMap = new Map() // id → steel object

for (const row of rows) {
  const tds = parseTdContents('<tr>' + row + '</tr>')
  if (tds.length < 20) continue

  const idInfo = extractId(tds[0])
  if (!idInfo) continue

  const { name, id } = idInfo

  // 如果这个 ID 已经存在（别名行），跳过
  if (steelsMap.has(id)) continue

  // 提取别名
  const allNames = extractNames(tds[1])
  const primaryName = allNames[0] || name
  const aliases = allNames.slice(1)

  // 提取成分
  const composition = {}
  for (let i = 0; i < ELEMENTS.length; i++) {
    const val = parseComposition(stripHtml(tds[i + 3]))
    if (val) composition[ELEMENTS[i]] = val
  }

  // 其他字段
  const tech = stripHtml(tds[17]) || undefined
  const maker = stripHtml(tds[18]) || undefined
  const country = stripHtml(tds[19]) || undefined
  const base = stripHtml(tds[2]) || 'Fe'

  steelsMap.set(id, {
    id,
    name: primaryName,
    aliases: aliases.length > 0 ? aliases : undefined,
    base,
    composition,
    tech,
    maker,
    country
  })
}

const steels = [...steelsMap.values()].sort((a, b) => a.name.localeCompare(b.name))
console.log(`解析出 ${steels.length} 种钢材`)

// 生成搜索索引
const searchIndex = []
for (const steel of steels) {
  searchIndex.push({ t: steel.name, id: steel.id })
  if (steel.aliases) {
    for (const alias of steel.aliases) {
      searchIndex.push({ t: alias, id: steel.id })
    }
  }
}

console.log(`搜索索引: ${searchIndex.length} 条`)

// 写出（紧凑 JSON，节省包体积）
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'steels.json'), JSON.stringify(steels), 'utf-8')
// 搜索索引：按 id 分组，格式为 {id: [name1, name2, ...]} 更紧凑
const indexGrouped = {}
for (const entry of searchIndex) {
  if (!indexGrouped[entry.id]) indexGrouped[entry.id] = []
  indexGrouped[entry.id].push(entry.t)
}
writeFileSync(join(OUT_DIR, 'searchIndex.json'), JSON.stringify(indexGrouped), 'utf-8')

const steelsSize = (Buffer.byteLength(JSON.stringify(steels)) / 1024).toFixed(1)
const indexSize = (Buffer.byteLength(JSON.stringify(indexGrouped)) / 1024).toFixed(1)
console.log(`\n输出文件:`)
console.log(`  steels.json:      ${steelsSize} KB`)
console.log(`  searchIndex.json: ${indexSize} KB`)
console.log(`  合计: ${(parseFloat(steelsSize) + parseFloat(indexSize)).toFixed(1)} KB`)
