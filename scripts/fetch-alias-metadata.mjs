/**
 * 抓取每个"独立别名"的 country / maker / desc（从 zknives.com 详情页）
 *
 * 背景: steels.json 中别名继承主名 country/maker，但 zknives 给每个别名
 * 都有独立页面，国别/制造商可能不同（如 Assab88 主名 Cr8Mo1VSi 是 CN，
 * 但 Assab88 自己页面是 SE / Bohler-Uddeholm）。
 *
 * 用法: node scripts/fetch-alias-metadata.mjs
 * 输出:
 *   - src/data/alias-metadata.json        最终结果
 *   - src/data/alias-metadata-progress.json 进度（断点续抓）
 *   - src/data/alias-metadata-failures.json 失败记录
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const STEELS_FILE = join(ROOT, 'src/data/steels.json')
const OUT_FILE = join(ROOT, 'src/data/alias-metadata.json')
const PROGRESS_FILE = join(ROOT, 'src/data/alias-metadata-progress.json')
const FAILURES_FILE = join(ROOT, 'src/data/alias-metadata-failures.json')

const BASE_URL = 'https://www.zknives.com/knives/steels/'
const DELAY_MS = 300
const CONCURRENCY = 3
const SAVE_EVERY = 60 // 每完成多少个就保存一次进度

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

// 收集"独立别名": 不是任何钢材主名的别名（去重）
function collectAliases() {
  const steels = JSON.parse(readFileSync(STEELS_FILE, 'utf-8'))
  const primaryNames = new Set(steels.map(s => s.name))

  // alias -> { primaryName, primaryCountry, primaryMaker, primaryDesc }
  // 同一别名可能出现在多个钢材的 aliases 里，取第一个
  const aliasMap = new Map()
  for (const s of steels) {
    if (!Array.isArray(s.aliases)) continue
    for (const a of s.aliases) {
      if (!a || typeof a !== 'string') continue
      if (primaryNames.has(a)) continue // 不是独立别名
      if (aliasMap.has(a)) continue
      aliasMap.set(a, {
        primaryName: s.name,
        primaryCountry: s.country || null,
        primaryMaker: s.maker || null,
        primaryDesc: s.desc || null,
      })
    }
  }
  return aliasMap
}

// 清理 HTML 实体 + 标签
function cleanText(s) {
  if (!s) return null
  return s
    .replace(/<a[^>]*>(.*?)<\/a>/gs, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 从 HTML 提取 country / maker / desc
function extractMetadata(html, aliasName) {
  if (!html) return null

  // 定位 stlInfoDiv
  const infoIdx = html.indexOf("id ='stlInfoDiv'")
  const infoIdx2 = infoIdx === -1 ? html.indexOf("id='stlInfoDiv'") : infoIdx
  if (infoIdx2 === -1) return null

  // 截取 stlInfoDiv 之后到下一个 </div> 区块（足够长）
  const block = html.slice(infoIdx2, infoIdx2 + 20000)

  const result = { country: null, maker: null, desc: null }

  // 1) 主行: <em>Name(Maker)</em> - description...
  // alias 名字 slug 化后可能与 HTML 中的实际 Name 大小写不同，
  // 所以匹配任意 <em>XXX(YYY)</em> - ZZZ，取第一个并核对 slug
  const firstEm = block.match(/<em>([^<(]+)\(([^)]*)\)<\/em>\s*-\s*([^<]{0,2000}(?:<[^>]+>[^<]*){0,40})/)
  if (firstEm) {
    const emName = firstEm[1].trim()
    if (slugify(emName) === slugify(aliasName)) {
      const maker = firstEm[2].trim()
      result.maker = maker && maker !== '?' ? maker : null
      // 描述截到下一个 <p> 或 <div 之前
      let descRaw = firstEm[3]
      const stopIdx = descRaw.search(/<p[\s>]|<div[\s>]/i)
      if (stopIdx !== -1) descRaw = descRaw.slice(0, stopIdx)
      const desc = cleanText(descRaw)
      if (desc && desc.length >= 10) result.desc = desc
    }
  }

  // 2) Country: <em>Country</em> - SomeName(CC)
  const countryMatch = block.match(/<em>Country<\/em>\s*-\s*[^<(]*?\(([A-Z]{2})\)/)
  if (countryMatch) {
    result.country = countryMatch[1]
  }

  return result
}

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SteelChartBot/1.0; +https://github.com/dashjim/steel-chart)',
        },
      })
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
  const aliasMap = collectAliases()
  console.log(`收集到 ${aliasMap.size} 个独立别名`)

  // 加载进度
  let results = {}
  if (existsSync(PROGRESS_FILE)) {
    results = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    console.log(`已有进度: ${Object.keys(results).length} 条`)
  }
  let failures = {}
  if (existsSync(FAILURES_FILE)) {
    failures = JSON.parse(readFileSync(FAILURES_FILE, 'utf-8'))
  }

  const todo = [...aliasMap.keys()].filter(a => !(a in results))
  console.log(`待抓取: ${todo.length} 条`)
  console.log(`预计耗时: ${Math.ceil(todo.length * DELAY_MS / CONCURRENCY / 1000 / 60)} 分钟\n`)

  let done = 0
  const startTime = Date.now()

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map(async alias => {
        const slug = slugify(alias)
        if (!slug) return { alias, skipped: 'empty-slug' }
        const url = BASE_URL + slug + '.shtml'
        try {
          const html = await fetchWithRetry(url)
          if (!html) return { alias, notFound: true, url }
          const meta = extractMetadata(html, alias)
          if (!meta || (!meta.country && !meta.maker && !meta.desc)) {
            return { alias, empty: true, url }
          }
          return { alias, meta }
        } catch (e) {
          return { alias, error: e.message, url }
        }
      })
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        const v = r.value
        if (v.meta) {
          results[v.alias] = v.meta
        } else if (v.skipped) {
          results[v.alias] = { skipped: v.skipped }
        } else if (v.notFound) {
          results[v.alias] = { notFound: true }
        } else if (v.empty) {
          results[v.alias] = { empty: true }
        } else if (v.error) {
          failures[v.alias] = { error: v.error, url: v.url }
        }
      } else {
        // shouldn't happen since we catch inside; just in case
        failures['__batch_' + Date.now()] = { error: r.reason?.message || 'unknown' }
      }
      done++
    }

    if (done % SAVE_EVERY < CONCURRENCY) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2), 'utf-8')
      writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2), 'utf-8')
    }

    if (done % 30 < CONCURRENCY) {
      const elapsed = (Date.now() - startTime) / 1000
      const pct = ((done / todo.length) * 100).toFixed(1)
      const rate = done / elapsed
      const eta = ((todo.length - done) / rate / 60).toFixed(1)
      const okCount = Object.values(results).filter(v => v && v.country).length
      console.log(`  进度: ${done}/${todo.length} (${pct}%) | 有 country: ${okCount} | ETA: ${eta} 分钟`)
    }

    if (i + CONCURRENCY < todo.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  // 最终保存
  writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2), 'utf-8')
  writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2), 'utf-8')

  // 产出干净的 alias-metadata.json：只保留有数据的条目
  const clean = {}
  for (const [alias, v] of Object.entries(results)) {
    if (v && (v.country || v.maker || v.desc)) {
      clean[alias] = {
        country: v.country || null,
        maker: v.maker || null,
        desc: v.desc || null,
      }
    }
  }
  writeFileSync(OUT_FILE, JSON.stringify(clean, null, 2), 'utf-8')

  console.log('\n=== 完成 ===')
  console.log(`总别名: ${aliasMap.size}`)
  console.log(`已处理: ${Object.keys(results).length}`)
  console.log(`有数据: ${Object.keys(clean).length}`)
  console.log(`失败: ${Object.keys(failures).length}`)
  console.log(`输出: ${OUT_FILE}`)
}

main().catch(e => {
  console.error('致命错误:', e)
  process.exit(1)
})
