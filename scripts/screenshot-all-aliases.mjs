/**
 * Phase A: 对所有 492 个别名做 zknives 详情页全页截图。
 *
 * 设计:
 *  - 一个 browser session 串行 navigate（zknives 简单静态页，1 session 即可）
 *  - 每 50 个别名为一批，批之间关 session 防止超时/泄漏
 *  - 截图已存在则跳过，支持断点续抓
 *  - 失败的 URL（404/超时）记入 /tmp/zknives-failures.json
 *
 * 输出:
 *   /tmp/zknives-shots/<slug>.png       — 全页 PNG（成功的）
 *   /tmp/zknives-failures.json          — { slug: alias }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DESC_FILE = join(ROOT, 'src/data/alias-desc-zh.json')
const SHOTS_DIR = '/tmp/zknives-shots'
const FAILURES_FILE = '/tmp/zknives-failures.json'
const BROWSER_SCRIPT = '/home/ubuntu/.claude/skills/agentcore-browser/scripts/browser.py'
const REGION = 'us-west-2'
const BATCH_SIZE = 50
const SESSION_TIMEOUT = 3600 // 每 batch 1 小时足够

if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true })

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

const aliasDesc = JSON.parse(readFileSync(DESC_FILE, 'utf-8'))
const allAliases = Object.keys(aliasDesc).sort()
console.log(`总别名: ${allAliases.length}`)

// 已有截图: 文件大小 > 5KB 才算成功（zknives 错误页通常很小）
function hasGoodShot(slug) {
  const p = join(SHOTS_DIR, `${slug}.png`)
  if (!existsSync(p)) return false
  try {
    return statSync(p).size > 5000
  } catch {
    return false
  }
}

const failures = existsSync(FAILURES_FILE)
  ? JSON.parse(readFileSync(FAILURES_FILE, 'utf-8'))
  : {}

function saveFailures() {
  writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
}

// 拆出还没抓的
const todo = allAliases.filter((a) => {
  const slug = slugify(a)
  if (hasGoodShot(slug)) return false
  if (failures[slug]) return false // 已知失败，不再重试
  return true
})

console.log(`已抓: ${allAliases.length - todo.length - Object.keys(failures).length}`)
console.log(`已知失败: ${Object.keys(failures).length}`)
console.log(`待抓: ${todo.length}`)

if (todo.length === 0) {
  console.log('没有待抓的别名，退出')
  process.exit(0)
}

// 分批跑
const batches = []
for (let i = 0; i < todo.length; i += BATCH_SIZE) {
  batches.push(todo.slice(i, i + BATCH_SIZE))
}
console.log(`分 ${batches.length} 批，每批 ${BATCH_SIZE} 个`)

function runBatch(batch, batchIdx) {
  console.log(`\n=== 批 ${batchIdx + 1}/${batches.length} (${batch.length} 个) ===`)
  const cmds = []
  cmds.push(`create_session sB "Batch ${batchIdx + 1}" ${REGION} ${SESSION_TIMEOUT}`)
  for (const alias of batch) {
    const slug = slugify(alias)
    const url = `https://www.zknives.com/knives/steels/${slug}.shtml`
    const outPath = join(SHOTS_DIR, `${slug}.png`)
    cmds.push(`navigate sB ${url} networkidle`)
    cmds.push(`wait 1.5`)
    cmds.push(`screenshot sB ${outPath} true`)
  }
  cmds.push(`close_session sB`)

  const stdin = cmds.join('\n') + '\n'
  const result = spawnSync('python3', [BROWSER_SCRIPT], {
    input: stdin,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60 * 60 * 1000,
    maxBuffer: 50 * 1024 * 1024,
  })

  // 即使部分 navigate 失败，截图也可能成功，逐个核对
  if (result.stderr) {
    process.stderr.write(result.stderr.slice(-2000))
  }

  // 核对每个别名是否抓到了
  let ok = 0, fail = 0
  for (const alias of batch) {
    const slug = slugify(alias)
    if (hasGoodShot(slug)) {
      ok++
    } else {
      fail++
      failures[slug] = alias
    }
  }
  console.log(`  本批: ${ok} 成功, ${fail} 失败`)
  saveFailures()

  if (result.status !== 0) {
    console.warn(`  warning: browser.py exited ${result.status}, but ${ok} shots captured`)
  }
}

for (let i = 0; i < batches.length; i++) {
  runBatch(batches[i], i)
}

const finalOk = allAliases.filter((a) => hasGoodShot(slugify(a))).length
const finalFail = Object.keys(failures).length
console.log(`\n=== 最终 ===`)
console.log(`成功: ${finalOk} / ${allAliases.length}`)
console.log(`失败: ${finalFail}`)
console.log(`失败列表: ${FAILURES_FILE}`)
