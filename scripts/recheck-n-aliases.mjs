/**
 * 复查 verified.json 里所有 N > 0.1% 的别名条目。
 *
 * 背景:Haiku 4.5 OCR 有系统性 W→N 字母混淆 (反之亦然)。
 *   - N 在不锈钢里很少超过 1% (LC200N、Vanax、MagnaCut、N77 等特例除外)。
 *   - 工具钢/高速钢里 W 含量 0.5-20% 是常见的。
 *   - LIMITS.N=2 阈值太松,所有 N > 0.1% 的样本都需要复查。
 *
 * 流程:
 *   1. 扫 verified.json, 找所有 N max > 0.1% 的条目。
 *   2. 从 steels.json 反查别名的主名 composition (W / N 线索)。
 *   3. 用 Opus 4.8 重读 /tmp/zknives-crops/<slug>.png, 在 prompt 里加入主名提示。
 *   4. 决策:
 *      - Opus 返回有 W 没 N 且 W 值接近原 N → 改 N→W
 *      - Opus 返回仍是 N 且与主名 N 接近 → 保留 N
 *      - 矛盾 → 移到 needs-human
 *
 * 输出:
 *   - 覆盖 src/data/alias-composition-verified.json
 *   - 追加到 src/data/alias-composition-needs-human.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const VERIFIED_FILE = join(ROOT, 'src/data/alias-composition-verified.json')
const NEEDS_HUMAN_FILE = join(ROOT, 'src/data/alias-composition-needs-human.json')
const STEELS_FILE = join(ROOT, 'src/data/steels.json')
const CROPS_DIR = '/tmp/zknives-crops'

const REGION = 'us-west-2'
const MODEL_OPUS = 'us.anthropic.claude-opus-4-8'

// 元素合理性上限 (含量百分比)。N 阈值放宽到 0.5
const LIMITS = {
  C: 3.5, Cr: 30, Mo: 12, W: 20, V: 14, Co: 20, Ni: 10,
  Mn: 3, Si: 3, S: 0.1, P: 0.1, Cu: 1, Nb: 4, N: 0.5,
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

// 区间近似相等: max 值相差 ≤ 0.5 或相对差 ≤ 30%
function valuesClose(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  const aMax = maxOf(a)
  const bMax = maxOf(b)
  if (aMax == null || bMax == null) return false
  const diff = Math.abs(aMax - bMax)
  if (diff <= 0.5) return true
  const rel = diff / Math.max(aMax, bMax)
  return rel <= 0.3
}

// 构建主名 hint 字符串
function buildMainHint(mainSteel) {
  if (!mainSteel || !mainSteel.composition) return '无可用主名提示'
  const c = mainSteel.composition
  const parts = []
  if (c.W) parts.push(`W=${JSON.stringify(c.W)}`)
  else parts.push('不含 W')
  if (c.N) parts.push(`N=${JSON.stringify(c.N)}`)
  else parts.push('不含 N')
  // 主元素
  for (const k of ['C', 'Cr', 'Mo', 'V', 'Co']) {
    if (c[k]) parts.push(`${k}=${JSON.stringify(c[k])}`)
  }
  return `主名 ${mainSteel.name}: ${parts.join(', ')}`
}

// 合理性校验 (用收紧的 LIMITS.N=0.5)
function isReasonable(comp) {
  if (!comp || typeof comp !== 'object') return { ok: false, reason: 'no comp' }
  const keys = Object.keys(comp).filter((k) => k !== 'Fe' && k !== 'error')
  if (keys.length === 0) return { ok: false, reason: 'empty' }
  const c = comp.C
  if (c) {
    const cMax = maxOf(c)
    if (cMax != null && cMax < 0.05) return { ok: false, reason: `C max ${cMax} < 0.05` }
  }
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

// 把 comp 里的 N 重命名为 W (保留 key 顺序)
function renameNtoW(comp) {
  const out = {}
  for (const [k, v] of Object.entries(comp)) {
    if (k === 'N') out.W = v
    else out[k] = v
  }
  return out
}

// ---------- Bedrock 调用 ----------

function buildPrompt(mainHint) {
  return [
    '这是钢材成分图表的右上角文字。仔细识别每个元素及其含量值。',
    '',
    '关键区分(W 和 N 字母在小图里极易混淆):',
    '- W = 钨(Tungsten),原子量 184。高速钢/工具钢里 W 含量典型 0.5-20%',
    '- N = 氮(Nitrogen),原子量 14。只有少数氮强化不锈钢含 N(如 LC200N、Vanax、Cronidur 30、MagnaCut),N 含量通常 < 0.5%',
    '- 如果一个元素值在 1-20% 范围,字母看起来像 N,几乎肯定是 W',
    '- 如果一个元素值在 0.1-0.5% 范围,字母像 N,可能是 N',
    '',
    `数据库主名成分提示(参考但不要盲信): ${mainHint}`,
    '',
    '返回严格 JSON: {"C":[v], "Cr":[v], ...}。范围用 [min,max], 单值用 [v]。只返回 JSON。',
  ].join('\n')
}

async function callOpus(imageB64, mainHint) {
  // Opus 4.8 已 deprecate temperature 参数, 不传
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
        { type: 'text', text: buildPrompt(mainHint) },
      ],
    }],
  })

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await bedrock.send(new InvokeModelCommand({
        modelId: MODEL_OPUS,
        contentType: 'application/json',
        accept: 'application/json',
        body,
      }))
      const result = JSON.parse(new TextDecoder().decode(resp.body))
      const text = (result.content?.[0]?.text || '').trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error(`no JSON: ${text.slice(0, 200)}`)
      const parsed = JSON.parse(match[0])
      return { ok: true, comp: parsed, usage: result.usage || {} }
    } catch (err) {
      const name = String(err.name || '')
      const msg = String(err.message || err)
      const isThrottle = /Throttl/i.test(name) || /Throttl/i.test(msg)
      if (isThrottle && attempt < maxRetries) {
        await sleep(2000)
        continue
      }
      return { ok: false, error: `${name}: ${msg}` }
    }
  }
  return { ok: false, error: 'unknown' }
}

// ---------- 主流程 ----------

async function main() {
  const verified = JSON.parse(readFileSync(VERIFIED_FILE, 'utf-8'))
  const needsHumanExisting = existsSync(NEEDS_HUMAN_FILE)
    ? JSON.parse(readFileSync(NEEDS_HUMAN_FILE, 'utf-8'))
    : {}
  const steels = JSON.parse(readFileSync(STEELS_FILE, 'utf-8'))

  // 别名 → 主钢材 索引
  const aliasToMain = new Map()
  for (const st of steels) {
    if (Array.isArray(st.aliases)) {
      for (const a of st.aliases) aliasToMain.set(a, st)
    }
  }

  const startVerifiedCount = Object.keys(verified).length

  // 找候选: N max > 0.1
  const candidates = []
  for (const [key, comp] of Object.entries(verified)) {
    const n = comp.N
    if (!Array.isArray(n) || n.length === 0) continue
    const nMax = maxOf(n)
    if (nMax != null && nMax > 0.1) candidates.push(key)
  }

  console.log(`verified 总数: ${startVerifiedCount}`)
  console.log(`N > 0.1% 候选: ${candidates.length}`)

  let mainHintWCount = 0
  let mainHintNCount = 0
  for (const key of candidates) {
    const main = aliasToMain.get(key)
    if (main && main.composition) {
      if (main.composition.W && !main.composition.N) mainHintWCount++
      else if (main.composition.N) mainHintNCount++
    }
  }
  console.log(`主名提示"是 W"(主名有 W 没 N): ${mainHintWCount}`)
  console.log(`主名提示"是 N"(主名有 N): ${mainHintNCount}`)

  let renamedToW = 0
  let keptAsN = 0
  let movedToHuman = 0
  const newNeedsHuman = {}

  console.log(`\n=== 串行调用 Opus 4.8 重读 (间隔 500ms) ===`)
  for (let i = 0; i < candidates.length; i++) {
    const key = candidates[i]
    const slug = slugify(key)
    const cropPath = join(CROPS_DIR, `${slug}.png`)
    const original = verified[key]
    const main = aliasToMain.get(key)
    const mainHint = buildMainHint(main)

    if (!existsSync(cropPath)) {
      console.log(`  [${i + 1}/${candidates.length}] ${key} (slug=${slug}): 缺图 → needs-human`)
      newNeedsHuman[key] = { ...original, recheckReason: 'no crop', recheckMainHint: mainHint }
      delete verified[key]
      movedToHuman++
      continue
    }

    const imgB64 = readFileSync(cropPath).toString('base64')
    const r = await callOpus(imgB64, mainHint)
    await sleep(500)

    if (!r.ok) {
      console.log(`  [${i + 1}/${candidates.length}] ${key}: Opus 失败 (${r.error.slice(0, 100)}) → needs-human`)
      newNeedsHuman[key] = {
        ...original,
        recheckReason: 'opus failed: ' + r.error,
        recheckMainHint: mainHint,
      }
      delete verified[key]
      movedToHuman++
      continue
    }

    const opusComp = r.comp
    const opusW = opusComp.W
    const opusN = opusComp.N

    // 决策
    if (opusW && !opusN) {
      // Opus 说有 W 没 N。改 N→W
      const renamed = renameNtoW(original)
      // 同时把 W 值替换为 Opus 的 W (它可能更准)
      renamed.W = opusW
      const chk = isReasonable(renamed)
      if (chk.ok) {
        verified[key] = renamed
        renamedToW++
        console.log(`  [${i + 1}/${candidates.length}] ${key}: N→W (Opus W=${JSON.stringify(opusW)})`)
      } else {
        console.log(`  [${i + 1}/${candidates.length}] ${key}: N→W 后不合理 (${chk.reason}) → needs-human`)
        newNeedsHuman[key] = {
          ...original,
          recheckReason: 'uncertain_w_vs_n',
          opus_result: opusComp,
          recheckMainHint: mainHint,
        }
        delete verified[key]
        movedToHuman++
      }
    } else if (opusN && !opusW) {
      // Opus 仍然说是 N
      // 主名 N 接近 → 真氮强化钢, 保留 (即使 N 值超过 0.5 阈值, 如 N77、Vanax)
      // 否则数值需 < 0.5%
      const opusNMax = maxOf(opusN)
      const mainN = main && main.composition && main.composition.N
      const closeToMain = mainN ? valuesClose(opusN, mainN) : false
      // 用 Opus 返回的成分,但保留 N
      const updated = { ...original, N: opusN }
      // 合理性校验: 如果与主名 N 接近, 跳过 N 上限校验 (允许真氮强化钢)
      const chk = closeToMain
        ? isReasonable({ ...updated, N: undefined })
        : isReasonable(updated)
      if (chk.ok && (closeToMain || opusNMax <= 0.5)) {
        verified[key] = updated
        keptAsN++
        console.log(`  [${i + 1}/${candidates.length}] ${key}: 保留 N=${JSON.stringify(opusN)} (主名 N=${JSON.stringify(mainN || null)}, close=${closeToMain})`)
      } else {
        console.log(`  [${i + 1}/${candidates.length}] ${key}: N 矛盾或不合理 (chk=${chk.reason || 'ok'}, close=${closeToMain}) → needs-human`)
        newNeedsHuman[key] = {
          ...original,
          recheckReason: 'uncertain_w_vs_n',
          opus_result: opusComp,
          recheckMainHint: mainHint,
        }
        delete verified[key]
        movedToHuman++
      }
    } else if (opusW && opusN) {
      // Opus 说两个都有 - 罕见,直接采纳但要合理性校验
      const updated = { ...original, N: opusN, W: opusW }
      const chk = isReasonable(updated)
      if (chk.ok) {
        verified[key] = updated
        keptAsN++
        console.log(`  [${i + 1}/${candidates.length}] ${key}: Opus 说 W+N 都有, 采纳 W=${JSON.stringify(opusW)} N=${JSON.stringify(opusN)}`)
      } else {
        console.log(`  [${i + 1}/${candidates.length}] ${key}: W+N 不合理 (${chk.reason}) → needs-human`)
        newNeedsHuman[key] = {
          ...original,
          recheckReason: 'uncertain_w_vs_n',
          opus_result: opusComp,
          recheckMainHint: mainHint,
        }
        delete verified[key]
        movedToHuman++
      }
    } else {
      // Opus 说两个都没有 - 不知道原 N 是什么
      console.log(`  [${i + 1}/${candidates.length}] ${key}: Opus 既无 W 也无 N → needs-human`)
      newNeedsHuman[key] = {
        ...original,
        recheckReason: 'uncertain_w_vs_n',
        opus_result: opusComp,
        recheckMainHint: mainHint,
      }
      delete verified[key]
      movedToHuman++
    }
  }

  // 合并 needs-human (保留现有 4 条)
  const mergedNeedsHuman = { ...needsHumanExisting, ...newNeedsHuman }

  writeFileSync(VERIFIED_FILE, JSON.stringify(verified, null, 2))
  writeFileSync(NEEDS_HUMAN_FILE, JSON.stringify(mergedNeedsHuman, null, 2))

  console.log('\n========== 最终报告 ==========')
  console.log(`N > 0.1% 候选: ${candidates.length} 条`)
  console.log(`  主名提示"是 W": ${mainHintWCount} 条`)
  console.log(`  主名提示"是 N": ${mainHintNCount} 条`)
  console.log(`Opus 重读后:`)
  console.log(`  - 改成 W: ${renamedToW} 条`)
  console.log(`  - 保留 N: ${keptAsN} 条`)
  console.log(`  - 移到 needs-human: ${movedToHuman} 条`)
  console.log(`最终 verified.json 总数: ${Object.keys(verified).length} 条`)
  console.log(`最终 needs-human.json 总数: ${Object.keys(mergedNeedsHuman).length} 条`)
}

main().catch((e) => { console.error(e); process.exit(1) })
