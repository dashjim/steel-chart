/**
 * 抓取每种钢材的 description（从 zknives.com 详情页）
 *
 * 用法: node scripts/fetch-descriptions.mjs
 *
 * 输出: src/static/data/descriptions.json
 *       { "1021": "High-speed tool steel...", "502": "..." }
 *
 * 注意: 1451 个请求，每次间隔 500ms，约需 12 分钟
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCE = join(ROOT, 'doc/source-data/steelchart.php')
const OUT_FILE = join(ROOT, 'src/static/data/descriptions.json')
const PROGRESS_FILE = join(ROOT, 'src/static/data/descriptions-progress.json')

const BASE_URL = 'https://www.zknives.com/knives/steels/'
const DELAY_MS = 500
const CONCURRENCY = 3

// 从 steelchart.php 提取每个唯一 ID 对应的详情页 URL
function extractSteelUrls() {
  const source = readFileSync(SOURCE, 'utf-8')
  const urlMap = new Map() // id → shtml path

  // 匹配每行的 checkbox (id) 和第一个链接 (detail page)
  const trPattern = /<tr>(.*?)<\/tr>/gs
  let match
  while ((match = trPattern.exec(source)) !== null) {
    const row = match[1]
    const cbMatch = row.match(/value='([^,]+),(\d+)'/)
    if (!cbMatch) continue
    const id = cbMatch[2]
    if (urlMap.has(id)) continue

    // 第一个主名称链接
    const linkMatch = row.match(/<p class='hasTip[^']*'><span class="stlNmLnk"><a href="([^"]+)"/)
    if (linkMatch) {
      urlMap.set(id, linkMatch[1])
    }
  }
  return urlMap
}

// 从 HTML 提取 description
function extractDescription(html) {
  // 找 <div id='stlInfoDiv'> 后的 <em>...</em> - 描述文本
  const infoMatch = html.match(/id\s*=\s*['"]stlInfoDiv['"][^>]*>(.*?)(?:<p>|<div class)/s)
  if (!infoMatch) return null

  const block = infoMatch[1]
  // 格式: <em>Name(Maker)</em> - Description text...
  const descMatch = block.match(/<\/em>\s*-\s*(.*)/s)
  if (!descMatch) return null

  // 清理 HTML 标签，保留纯文本
  let desc = descMatch[1]
    .replace(/<a[^>]*>(.*?)<\/a>/g, '$1')  // 保留链接文字
    .replace(/<[^>]*>/g, '')                // 去掉其他标签
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  return desc || null
}

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url)
      if (resp.ok) return await resp.text()
      if (resp.status === 404) return null
      throw new Error(`HTTP ${resp.status}`)
    } catch (e) {
      if (i === retries) throw e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

async function main() {
  const urlMap = extractSteelUrls()
  console.log(`找到 ${urlMap.size} 种钢材的详情页 URL`)

  // 加载已有进度
  let descriptions = {}
  if (existsSync(PROGRESS_FILE)) {
    descriptions = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    console.log(`已有进度: ${Object.keys(descriptions).length} 条`)
  }

  const entries = [...urlMap.entries()].filter(([id]) => !(id in descriptions))
  console.log(`待抓取: ${entries.length} 条\n`)

  let done = 0
  let found = 0

  // 分批并发
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async ([id, path]) => {
        const url = BASE_URL + path
        const html = await fetchWithRetry(url)
        if (!html) return { id, desc: null }
        const desc = extractDescription(html)
        return { id, desc }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { id, desc } = result.value
        if (desc) {
          descriptions[id] = desc
          found++
        } else {
          descriptions[id] = ''
        }
      }
      done++
    }

    // 每 50 条保存进度
    if (done % 50 < CONCURRENCY) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(descriptions, null, 2), 'utf-8')
    }

    if (done % 30 < CONCURRENCY) {
      const total = entries.length
      const pct = ((done / total) * 100).toFixed(1)
      console.log(`  进度: ${done}/${total} (${pct}%) | 有描述: ${found}`)
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  // 最终保存
  writeFileSync(PROGRESS_FILE, JSON.stringify(descriptions, null, 2), 'utf-8')
  writeFileSync(OUT_FILE, JSON.stringify(descriptions), 'utf-8')

  const withDesc = Object.values(descriptions).filter(d => d).length
  console.log(`\n完成! 共 ${Object.keys(descriptions).length} 条，其中 ${withDesc} 条有描述`)
  console.log(`输出: ${OUT_FILE}`)
}

main().catch(e => {
  console.error('错误:', e.message)
  process.exit(1)
})
