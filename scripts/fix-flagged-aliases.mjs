/**
 * 三阶段修复 alias-composition-flagged.json 里的 90 个 flagged 条目。
 *
 *   阶段 1: N→W 系统性误识批量修复 (Haiku 把 W 读成 N)
 *   阶段 2: 用 run1 做合理性校验补救剩余的
 *   阶段 3: 用 Opus 4.8 第三跑裁决 (失败降级 Sonnet 4.6 → Haiku 4.5)
 *
 * 输出:
 *   - src/data/alias-composition-verified.json  (追加救回来的)
 *   - src/data/alias-composition-needs-human.json  (剩余无法自动修复的)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FLAGGED_FILE = join(ROOT, 'src/data/alias-composition-flagged.json')
const VERIFIED_FILE = join(ROOT, 'src/data/alias-composition-verified.json')
const NEEDS_HUMAN_FILE = join(ROOT, 'src/data/alias-composition-needs-human.json')
const CROPS_DIR = '/tmp/zknives-crops'

const REGION = 'us-west-2'
// 已通过 aws bedrock list-inference-profiles 实测可用 (ACTIVE)
const MODEL_OPUS = 'us.anthropic.claude-opus-4-8'
const MODEL_SONNET = 'us.anthropic.claude-sonnet-4-6'
const MODEL_HAIKU = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

// 元素合理性上限 (含量百分比)
const LIMITS = {
  C: 3.5, Cr: 30, Mo: 12, W: 20, V: 14, Co: 20, Ni: 10,
  Mn: 3, Si: 3, S: 0.1, P: 0.1, Cu: 1, Nb: 4, N: 2,
}

const bedrock = new BedrockRuntimeClient({ region: REGION })

// ---------- 工具 ----------

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function maxOf(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  return Math.max(...arr.map(Number))
}

function minOf(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  return Math.min(...arr.map(Number))
}

// 元素值的合理性校验。未知元素只警告不拒绝(留给人审)
function isReasonable(comp) {
  if (!comp || typeof comp !== 'object') return { ok: false, reason: 'no comp' }
  const keys = Object.keys(comp).filter((k) => k !== 'Fe' && k !== 'error')
  if (keys.length === 0) return { ok: false, reason: 'empty' }

  // C 最大值 < 0.05 → 不合理
  const c = comp.C
  if (c) {
    const cMax = maxOf(c)
    if (cMax != null && cMax < 0.05) return { ok: false, reason: `C max ${cMax} < 0.05` }
  }

  // 检查每个元素
  for (const k of keys) {
    const v = comp[k]
    if (!Array.isArray(v)) return { ok: false, reason: `${k} not array` }
    const mn = minOf(v)
    const mx = maxOf(v)
    if (mn == null || mx == null) continue
    if (mn < 0) return { ok: false, reason: `${k} negative ${mn}` }
    const lim = LIMITS[k]
    if (lim != null && mx > lim) return { ok: false, reason: `${k} max ${mx} > ${lim}` }
  }
  return { ok: true }
}

// 把 run 里的 N 重命名为 W (前提: 有 N 且 max>=2 且没有 W)
function tryRenameNtoW(run) {
  if (!run || typeof run !== 'object') return null
  if (!run.N || run.W) return null
  const nMax = maxOf(run.N)
  if (nMax == null || nMax < 2) return null
  // 保持元素顺序: N 改 key 为 W,其他不变
  const out = {}
  for (const [k, v] of Object.entries(run)) {
    if (k === 'N') out.W = v
    else out[k] = v
  }
  return out
}

// ---------- Bedrock 调用 ----------

const PROMPT_TEXT = [
  '这是一张钢材成分图表的右上角文字。请仔细识别每个元素及其含量值。',
  '',
  '特别注意:',
  '- 高速钢(HSS)和工具钢通常含有钨(W),典型 W 含量 0.5-20%',
  '- 氮(N)在不锈钢里也存在,但通常 < 2%',
  '- 如果你看到一个元素的值 > 2% 且字母看起来像 N,**几乎肯定是 W(钨)** 不是 N',
  '- 区分 V(钒) 和 Y、Si 和 St、Cu 和 Co',
  '',
  '返回严格 JSON: {"C":[v], "Cr":[v], ...}。范围用 [min,max], 单值用 [v]。只返回 JSON,不要其他文字。',
].join('\n')

// modelId, base64, max throttle retries
async function callBedrock(modelId, imageB64) {
  // 注意: Opus 4.8 已 deprecate temperature 参数, 不传
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
        { type: 'text', text: PROMPT_TEXT },
      ],
    }],
  })

  const maxThrottleRetries = 3
  for (let attempt = 1; attempt <= maxThrottleRetries; attempt++) {
    try {
      const resp = await bedrock.send(new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body,
      }))
      const result = JSON.parse(new TextDecoder().decode(resp.body))
      const text = (result.content?.[0]?.text || '').trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error(`no JSON: ${text.slice(0, 200)}`)
      const parsed = JSON.parse(match[0])
      const usage = result.usage || {}
      return { ok: true, comp: parsed, usage, raw: text }
    } catch (err) {
      const name = String(err.name || '')
      const msg = String(err.message || err)
      const isThrottle = /Throttl/i.test(name) || /Throttl/i.test(msg)
      // ThrottlingException 重试 (最多 3 次)
      if (isThrottle && attempt < maxThrottleRetries) {
        await sleep(2000)
        continue
      }
      return { ok: false, error: `${name}: ${msg}`, isThrottle }
    }
  }
  return { ok: false, error: 'unknown' }
}

// 第三跑:Opus → Sonnet → Haiku 降级。失败 3 次后降级。
async function thirdRun(slug, stats) {
  const cropPath = join(CROPS_DIR, `${slug}.png`)
  if (!existsSync(cropPath)) {
    return { ok: false, reason: 'no crop', model: null }
  }
  const imgB64 = readFileSync(cropPath).toString('base64')

  // 优先 Opus, 失败 3 次降级
  let lastErr = ''
  for (let i = 0; i < 3; i++) {
    const r = await callBedrock(MODEL_OPUS, imgB64)
    await sleep(500)
    if (r.ok) {
      stats.opusCalls++
      stats.opusUsage.input += r.usage.input_tokens || 0
      stats.opusUsage.output += r.usage.output_tokens || 0
      return { ok: true, comp: r.comp, model: MODEL_OPUS, usage: r.usage }
    }
    lastErr = r.error
  }
  stats.sonnetFallbacks++
  console.log(`    Opus 失败 3 次 (${lastErr.slice(0, 120)}), 降级 Sonnet`)

  // 降级 Sonnet
  for (let i = 0; i < 2; i++) {
    const r = await callBedrock(MODEL_SONNET, imgB64)
    await sleep(500)
    if (r.ok) {
      stats.sonnetCalls++
      stats.sonnetUsage.input += r.usage.input_tokens || 0
      stats.sonnetUsage.output += r.usage.output_tokens || 0
      return { ok: true, comp: r.comp, model: MODEL_SONNET, usage: r.usage }
    }
    lastErr = r.error
  }
  stats.haikuFallbacks++
  console.log(`    Sonnet 失败 (${lastErr.slice(0, 120)}), 降级 Haiku`)

  // 降级 Haiku
  for (let i = 0; i < 2; i++) {
    const r = await callBedrock(MODEL_HAIKU, imgB64)
    await sleep(500)
    if (r.ok) {
      stats.haikuCalls++
      return { ok: true, comp: r.comp, model: MODEL_HAIKU, usage: r.usage }
    }
    lastErr = r.error
  }
  return { ok: false, reason: 'all models failed: ' + lastErr, model: null }
}

// ---------- 主流程 ----------

async function main() {
  const flagged = JSON.parse(readFileSync(FLAGGED_FILE, 'utf-8'))
  const verified = JSON.parse(readFileSync(VERIFIED_FILE, 'utf-8'))
  const startVerifiedCount = Object.keys(verified).length

  const flaggedKeys = Object.keys(flagged)
  console.log(`flagged 条目: ${flaggedKeys.length}, verified 起始: ${startVerifiedCount}`)

  let stage1Saved = 0
  let stage2Saved = 0
  let stage3Saved = 0
  const stillFlagged = []

  // ---------- 阶段 1: N→W 批量修复 ----------
  console.log('\n=== 阶段 1: N→W 批量修复 ===')
  for (const key of flaggedKeys) {
    const entry = flagged[key]
    const run = entry.run1 || entry.run2
    const renamed = tryRenameNtoW(run)
    if (renamed) {
      const chk = isReasonable(renamed)
      if (chk.ok) {
        if (!verified[key]) {
          verified[key] = renamed
          stage1Saved++
        }
        continue
      }
    }
    stillFlagged.push(key)
  }
  console.log(`阶段 1 救回: ${stage1Saved} / ${flaggedKeys.length}`)

  // ---------- 阶段 2: 用 run1 做合理性校验 ----------
  console.log('\n=== 阶段 2: run1 合理性检查 ===')
  const stillFlagged2 = []
  for (const key of stillFlagged) {
    const entry = flagged[key]
    const run = entry.run1 || entry.run2
    const chk = isReasonable(run)
    if (chk.ok) {
      if (!verified[key]) {
        verified[key] = run
        stage2Saved++
      }
      continue
    }
    stillFlagged2.push(key)
  }
  console.log(`阶段 2 救回: ${stage2Saved} / 剩 ${stillFlagged.length}`)

  // ---------- 阶段 3: Opus 第三跑 ----------
  console.log(`\n=== 阶段 3: Opus 第三跑 (剩 ${stillFlagged2.length} 条) ===`)
  const stats = {
    opusCalls: 0,
    sonnetCalls: 0,
    haikuCalls: 0,
    sonnetFallbacks: 0,
    haikuFallbacks: 0,
    opusUsage: { input: 0, output: 0 },
    sonnetUsage: { input: 0, output: 0 },
  }
  const needsHuman = {}

  for (let i = 0; i < stillFlagged2.length; i++) {
    const key = stillFlagged2[i]
    const entry = flagged[key]
    const slug = slugify(key)
    console.log(`  [${i + 1}/${stillFlagged2.length}] ${key} (slug=${slug})...`)

    const r = await thirdRun(slug, stats)
    if (!r.ok) {
      console.log(`    失败: ${r.reason}`)
      needsHuman[key] = {
        ...entry,
        opusFailed: true,
        thirdRunReason: r.reason,
      }
      continue
    }

    // 第三跑结果也跑一次 N→W,以防 Opus/Sonnet 仍误识
    const renamed = tryRenameNtoW(r.comp) || r.comp
    const chk = isReasonable(renamed)
    if (chk.ok) {
      if (!verified[key]) {
        verified[key] = renamed
        stage3Saved++
        console.log(`    OK [${r.model}] -> verified`)
      }
    } else {
      console.log(`    [${r.model}] 结果仍不合理: ${chk.reason}`)
      needsHuman[key] = {
        ...entry,
        thirdRun: r.comp,
        thirdRunModel: r.model,
        thirdRunReason: chk.reason,
      }
    }
  }

  // ---------- 写出 ----------
  writeFileSync(VERIFIED_FILE, JSON.stringify(verified, null, 2))
  writeFileSync(NEEDS_HUMAN_FILE, JSON.stringify(needsHuman, null, 2))

  // ---------- 报告 ----------
  const totalCalls = stats.opusCalls + stats.sonnetCalls + stats.haikuCalls
  // Opus 4.8 估价 (Bedrock Opus 系列): $15 / MTok in, $75 / MTok out
  const opusCostUsd = (stats.opusUsage.input * 15 + stats.opusUsage.output * 75) / 1_000_000
  const avgOpusCost = stats.opusCalls > 0 ? opusCostUsd / stats.opusCalls : 0

  // needs-human 原因分布
  const reasonDist = {}
  for (const v of Object.values(needsHuman)) {
    const r = v.thirdRunReason || 'unknown'
    const cat = r === 'no crop' ? 'no crop'
      : /max .* >/.test(r) ? 'value too high'
      : /negative/.test(r) ? 'negative value'
      : /C max/.test(r) ? 'C too low'
      : /all models failed/.test(r) ? 'model failed'
      : 'other'
    reasonDist[cat] = (reasonDist[cat] || 0) + 1
  }

  console.log('\n========== 最终报告 ==========')
  console.log(`阶段1 N→W 批量修复: 救回 ${stage1Saved} 条`)
  console.log(`阶段2 合理性检查 run1: 救回 ${stage2Saved} 条`)
  console.log(`阶段3 Opus 第三跑: 成功调用 ${totalCalls} 次, 救回 ${stage3Saved} 条 (降级到 Sonnet/Haiku 次数: ${stats.sonnetFallbacks}/${stats.haikuFallbacks})`)
  console.log(`  - Opus 实际使用的 model ID: ${MODEL_OPUS}`)
  console.log(`  - Opus 调用: ${stats.opusCalls}, Sonnet: ${stats.sonnetCalls}, Haiku: ${stats.haikuCalls}`)
  console.log(`  - Opus tokens: in=${stats.opusUsage.input} out=${stats.opusUsage.output}, 估算成本 $${opusCostUsd.toFixed(4)} (avg/call: $${avgOpusCost.toFixed(4)})`)
  console.log(`最终 needs-human.json 剩余: ${Object.keys(needsHuman).length} 条`)
  console.log(`  原因分布:`, reasonDist)
  console.log(`最终 verified.json 总数: ${Object.keys(verified).length} 条 (原 ${startVerifiedCount} + 救回 ${stage1Saved + stage2Saved + stage3Saved} = ${Object.keys(verified).length})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
