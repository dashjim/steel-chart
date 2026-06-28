/**
 * Phase B: 对 492 个 zknives 截图做 Bedrock Vision 双跑验证 + 合理性校验。
 *
 * 前置条件: 先运行 scripts/screenshot-all-aliases.mjs，截图保存于 /tmp/zknives-shots/
 *
 * 流程（每个别名）:
 *   1. 裁剪 PNG 的右上角成分文字区: box=(900, 360, 1120, 700)
 *   2. 调 Bedrock Vision 两次:
 *        run1: temperature 0.0
 *        run2: temperature 0.2
 *   3. 比对两次结果:
 *        - 元素 key 集合完全一致 + 每个值差异 < 5% → verified=true
 *        - 否则 verified=false (flagged)
 *   4. 对 verified 的样本做合理性校验，违反者 flagged=true
 *
 * 输出:
 *   src/data/alias-composition-verified.json   verified=true & flagged=false 的，可直接用
 *   src/data/alias-composition-flagged.json    需要复查的
 *   src/data/alias-composition-progress.json   断点续抓状态 + 调用耗时统计
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DESC_FILE = join(ROOT, 'src/data/alias-desc-zh.json')
const STEELS_FILE = join(ROOT, 'src/data/steels.json')
const SHOTS_DIR = '/tmp/zknives-shots'
const CROPS_DIR = '/tmp/zknives-crops'
const FAILURES_FILE = '/tmp/zknives-failures.json'

const VERIFIED_FILE = join(ROOT, 'src/data/alias-composition-verified.json')
const FLAGGED_FILE = join(ROOT, 'src/data/alias-composition-flagged.json')
const PROGRESS_FILE = join(ROOT, 'src/data/alias-composition-progress.json')

const REGION = 'us-west-2'
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const CONCURRENCY = 3
const SAVE_EVERY = 30
const VALUE_TOL_REL = 0.05 // 双跑相对差异容忍 5%
const VALUE_TOL_ABS = 0.01 // 绝对差异下限: 两次都 <0.01 时不计较，避免 S/P 误差

if (!existsSync(CROPS_DIR)) mkdirSync(CROPS_DIR, { recursive: true })

// ----------------------- 合理性校验阈值 -----------------------
const MAX_BOUND = {
  C: 3.5, Cr: 30, Mo: 12, W: 20, V: 14, Co: 20,
  Ni: 10, Mn: 3, Si: 3, S: 0.1, P: 0.1, Cu: 1, Nb: 4, N: 2,
}
const C_MIN = 0.05 // 刀具钢 C 不应低于此值

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function hasGoodShot(slug) {
  const p = join(SHOTS_DIR, `${slug}.png`)
  if (!existsSync(p)) return false
  try { return statSync(p).size > 5000 } catch { return false }
}

function cropChartArea(srcPath, dstPath) {
  const script = `from PIL import Image; im = Image.open('${srcPath}'); im.crop((900, 360, 1120, 700)).save('${dstPath}')`
  const r = spawnSync('python3', ['-c', script], { encoding: 'utf-8' })
  if (r.status !== 0) throw new Error(`crop failed: ${r.stderr}`)
}

// ----------------------- Bedrock Vision -----------------------

const PROMPT_TEXT = [
  '这是 zknives.com 钢材成分图表右上角的局部裁剪截图（黑底白字，等宽字体）。',
  '内容是一段成分清单，每行格式: <元素符号> <含量>，例如:',
  '  C  0.38',
  '  Cr 13.60',
  '  V  0.30',
  '  Si 0.90',
  '请逐字读取图中所有可见的元素行（即使你不熟悉这种钢），不要凭印象推测/补全。',
  '返回严格 JSON 对象，元素符号为 key，含量为数组形式的 value:',
  '  - 单值: {"C": [0.38]}',
  '  - 范围（如 0.98-1.10）: {"C": [0.98, 1.10]}',
  '只返回 JSON 对象本体，不要 markdown 代码块、不要解释文字。',
  '如果裁剪图里没有任何可读成分行（纯黑、空白），返回 {"error": "no_chart"}。',
].join('\n')

const bedrock = new BedrockRuntimeClient({ region: REGION })

async function callVision(imgB64, temperature, retries = 1) {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    temperature,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imgB64 } },
        { type: 'text', text: PROMPT_TEXT },
      ],
    }],
  })
  let lastErr = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await bedrock.send(new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body,
      }))
      const result = JSON.parse(new TextDecoder().decode(resp.body))
      const text = (result.content?.[0]?.text || '').trim()
      const usage = result.usage || {}
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error(`no JSON in response: ${text.slice(0, 200)}`)
      const parsed = JSON.parse(match[0])
      return { ok: true, comp: parsed, raw: text, usage }
    } catch (err) {
      lastErr = err
      // 节流错误，等一下再试
      if (String(err).match(/Throttl|TooManyRequests|429/i)) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
      }
    }
  }
  return { ok: false, error: String(lastErr?.message || lastErr) }
}

// ----------------------- 双跑比对 -----------------------

function normValue(v) {
  if (!Array.isArray(v) || v.length === 0) return null
  if (v.length === 1) return Number(v[0])
  return (Number(v[0]) + Number(v[1])) / 2
}

function compareRuns(c1, c2) {
  // 排除 error / Fe 这些不参与比对
  const filterKeys = (c) => Object.keys(c || {}).filter((k) => k !== 'error' && k !== 'Fe')
  const k1 = new Set(filterKeys(c1))
  const k2 = new Set(filterKeys(c2))

  // 元素集是否相同
  if (k1.size !== k2.size) return { same: false, reason: `element set differs: run1=${[...k1].join(',')} run2=${[...k2].join(',')}` }
  for (const k of k1) {
    if (!k2.has(k)) return { same: false, reason: `element set differs: run1 has ${k} but run2 doesn't` }
  }

  // 每个元素值差异
  for (const k of k1) {
    const v1 = normValue(c1[k])
    const v2 = normValue(c2[k])
    if (v1 == null || v2 == null) {
      return { same: false, reason: `${k} value missing in one run` }
    }
    // 数组长度也要一致（避免 [0.9] vs [0.8,1.0] 被中位平均掩盖）
    if (c1[k].length !== c2[k].length) {
      return { same: false, reason: `${k} array shape differs: ${JSON.stringify(c1[k])} vs ${JSON.stringify(c2[k])}` }
    }
    const denom = Math.max(Math.abs(v1), Math.abs(v2), 0.01)
    const relDiff = Math.abs(v1 - v2) / denom
    const absDiff = Math.abs(v1 - v2)
    if (relDiff > VALUE_TOL_REL && absDiff > VALUE_TOL_ABS) {
      return { same: false, reason: `${k} disagrees: ${v1} vs ${v2} (Δ${(relDiff * 100).toFixed(0)}%)` }
    }
  }
  return { same: true }
}

// ----------------------- 合理性校验 -----------------------

function sanityCheck(comp) {
  const reasons = []
  for (const [el, val] of Object.entries(comp)) {
    if (el === 'error' || el === 'Fe') continue
    if (!Array.isArray(val)) {
      reasons.push(`${el} not array`)
      continue
    }
    for (const v of val) {
      const n = Number(v)
      if (!Number.isFinite(n)) {
        reasons.push(`${el} non-numeric: ${v}`)
        continue
      }
      if (n < 0) reasons.push(`${el} negative: ${n}`)
      const bound = MAX_BOUND[el]
      if (bound != null && n > bound) reasons.push(`${el} > max (${n} > ${bound})`)
    }
  }
  // C 太低
  if (comp.C && Array.isArray(comp.C)) {
    const cMid = normValue(comp.C)
    if (cMid != null && cMid < C_MIN) reasons.push(`C too low (${cMid} < ${C_MIN})`)
  }
  return reasons
}

// ----------------------- 数据 -----------------------

const aliasDesc = JSON.parse(readFileSync(DESC_FILE, 'utf-8'))
const steels = JSON.parse(readFileSync(STEELS_FILE, 'utf-8'))

const aliasToPrimary = new Map()
for (const s of steels) {
  if (!Array.isArray(s.aliases)) continue
  for (const a of s.aliases) {
    if (!a || aliasToPrimary.has(a)) continue
    aliasToPrimary.set(a, { primary: s.name, composition: s.composition || {} })
  }
}

const failures = existsSync(FAILURES_FILE)
  ? JSON.parse(readFileSync(FAILURES_FILE, 'utf-8'))
  : {}

const allAliases = Object.keys(aliasDesc).sort()

// 进度恢复
const progress = existsSync(PROGRESS_FILE)
  ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
  : { processed: {}, totalInputTokens: 0, totalOutputTokens: 0, startTime: Date.now() }

const todo = allAliases.filter((a) => {
  if (progress.processed[a]) return false // 已处理
  const slug = slugify(a)
  if (failures[slug]) return false // 截图失败的，直接跳过
  return true
})

console.log(`总别名: ${allAliases.length}`)
console.log(`截图失败 (跳过): ${Object.keys(failures).length}`)
console.log(`已处理 (跳过): ${Object.keys(progress.processed).length}`)
console.log(`待处理: ${todo.length}`)

// ----------------------- 主流程 -----------------------

async function processOne(alias) {
  const slug = slugify(alias)
  const shotPath = join(SHOTS_DIR, `${slug}.png`)
  const cropPath = join(CROPS_DIR, `${slug}.png`)

  if (!hasGoodShot(slug)) {
    return { alias, slug, status: 'no_screenshot' }
  }

  // 裁剪（已存在则复用）
  if (!existsSync(cropPath)) {
    try {
      cropChartArea(shotPath, cropPath)
    } catch (e) {
      return { alias, slug, status: 'crop_failed', error: String(e) }
    }
  }

  const imgB64 = readFileSync(cropPath).toString('base64')

  // 双跑
  const [r1, r2] = await Promise.all([
    callVision(imgB64, 0.0),
    callVision(imgB64, 0.2),
  ])

  if (r1.usage) {
    progress.totalInputTokens += r1.usage.input_tokens || 0
    progress.totalOutputTokens += r1.usage.output_tokens || 0
  }
  if (r2.usage) {
    progress.totalInputTokens += r2.usage.input_tokens || 0
    progress.totalOutputTokens += r2.usage.output_tokens || 0
  }

  const result = { alias, slug, run1: r1, run2: r2 }

  if (!r1.ok || !r2.ok) {
    result.status = 'vision_failed'
    result.verified = false
    result.flagged = true
    result.flagReason = `vision call failed: r1=${r1.ok ? 'ok' : r1.error}, r2=${r2.ok ? 'ok' : r2.error}`
    return result
  }

  if (r1.comp.error || r2.comp.error) {
    result.status = 'no_chart'
    result.verified = false
    result.flagged = true
    result.flagReason = `vision reports no_chart: r1.error=${r1.comp.error || '-'}, r2.error=${r2.comp.error || '-'}`
    return result
  }

  const cmp = compareRuns(r1.comp, r2.comp)
  if (!cmp.same) {
    result.status = 'two_runs_disagree'
    result.verified = false
    result.flagged = true
    result.flagReason = cmp.reason
    return result
  }

  // 双跑一致，做合理性校验（用 run1 即可，run2 应等价）
  const sanityIssues = sanityCheck(r1.comp)
  if (sanityIssues.length > 0) {
    result.status = 'sanity_failed'
    result.verified = true
    result.flagged = true
    result.flagReason = sanityIssues.join('; ')
    return result
  }

  result.status = 'verified'
  result.verified = true
  result.flagged = false
  return result
}

// 并发池
async function runPool(items, concurrency, worker, onProgress) {
  let idx = 0
  const results = new Array(items.length)
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const myIdx = idx++
      try {
        results[myIdx] = await worker(items[myIdx])
      } catch (e) {
        results[myIdx] = { alias: items[myIdx], status: 'worker_error', error: String(e) }
      }
      if (onProgress) onProgress(myIdx, results[myIdx])
    }
  })
  await Promise.all(workers)
  return results
}

function saveProgress() {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

let processedThisRun = 0
const t0 = Date.now()

const allProcessed = await runPool(todo, CONCURRENCY, processOne, (i, r) => {
  progress.processed[r.alias] = r
  processedThisRun++
  const tag = r.flagged ? `FLAG(${r.flagReason?.slice(0, 60)})` : 'ok'
  const pct = ((Object.keys(progress.processed).length / allAliases.length) * 100).toFixed(1)
  console.log(`  [${pct}%] ${r.alias.padEnd(20)} ${r.status.padEnd(18)} ${tag}`)

  if (processedThisRun % SAVE_EVERY === 0) {
    saveProgress()
    console.log(`  (已保存进度 ${Object.keys(progress.processed).length}/${allAliases.length})`)
  }
})

saveProgress()

// ----------------------- 汇总输出 -----------------------

const verifiedOut = {}
const flaggedOut = {}

for (const alias of allAliases) {
  const slug = slugify(alias)
  const r = progress.processed[alias]
  if (!r) {
    // 截图失败的
    if (failures[slug]) {
      flaggedOut[alias] = {
        verified: false,
        flagged: true,
        flagReason: 'screenshot_failed',
      }
    }
    continue
  }
  if (r.verified && !r.flagged) {
    verifiedOut[alias] = r.run1.comp
  } else {
    flaggedOut[alias] = {
      run1: r.run1?.comp || null,
      run2: r.run2?.comp || null,
      status: r.status,
      verified: !!r.verified,
      flagged: true,
      flagReason: r.flagReason || r.status,
    }
  }
}

writeFileSync(VERIFIED_FILE, JSON.stringify(verifiedOut, null, 2))
writeFileSync(FLAGGED_FILE, JSON.stringify(flaggedOut, null, 2))

const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
const totalElapsed = ((Date.now() - progress.startTime) / 1000 / 60).toFixed(1)

console.log(`\n=== 完成 ===`)
console.log(`本次跑时: ${elapsed}s`)
console.log(`累计跑时: ${totalElapsed} min`)
console.log(`verified: ${Object.keys(verifiedOut).length}`)
console.log(`flagged: ${Object.keys(flaggedOut).length}`)
console.log(`总 input tokens: ${progress.totalInputTokens}`)
console.log(`总 output tokens: ${progress.totalOutputTokens}`)
console.log(`写入: ${VERIFIED_FILE}`)
console.log(`写入: ${FLAGGED_FILE}`)
