/**
 * 抽样 30 个独立别名，用 AgentCore Browser 截图 zknives 详情页，
 * 然后用 Bedrock Claude Haiku 4.5 视觉模型提取右上角成分文字。
 *
 * 用途: 验证 zknives 网页 Vision OCR 提取成分的可行性 / 准确率。
 *
 * 输出:
 *   - src/data/alias-composition-sample.json   { alias, primary, primaryComp, visionComp, diff, status }
 *   - /tmp/zknives-shots/<slug>.png            截图（调试用）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const CROPS_DIR = '/tmp/zknives-crops'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DESC_FILE = join(ROOT, 'src/data/alias-desc-zh.json')
const STEELS_FILE = join(ROOT, 'src/data/steels.json')
const OUT_FILE = join(ROOT, 'src/data/alias-composition-sample.json')
const SHOTS_DIR = '/tmp/zknives-shots'
const BROWSER_SCRIPT = '/home/ubuntu/.claude/skills/agentcore-browser/scripts/browser.py'

const REGION = 'us-west-2'
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const SAMPLE_SIZE = 30
const SEED = 42

if (!existsSync(SHOTS_DIR)) mkdirSync(SHOTS_DIR, { recursive: true })
if (!existsSync(CROPS_DIR)) mkdirSync(CROPS_DIR, { recursive: true })

// 把全页截图裁剪为 chart 右上角成分文字区域（zknives 页面宽度固定 1441px）。
// 测试多个样本: x[900,1120] y[360,700] 能稳定捕获到所有成分行（最多 ~13 行）。
function cropChartArea(srcPath, dstPath) {
  // 调用 python PIL 进行裁剪。Node 不引入额外原生依赖。
  const script = `from PIL import Image; im = Image.open('${srcPath}'); im.crop((900, 360, 1120, 700)).save('${dstPath}')`
  const r = spawnSync('python3', ['-c', script], { encoding: 'utf-8' })
  if (r.status !== 0) throw new Error(`crop failed for ${srcPath}: ${r.stderr}`)
}

// ---------- 工具函数 ----------

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Mulberry32 - 确定性 PRNG
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededSample(arr, n, seed) {
  // Fisher-Yates 部分洗牌
  const rand = mulberry32(seed)
  const copy = arr.slice()
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (copy.length - i))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

// ---------- 数据加载 ----------

const aliasDesc = JSON.parse(readFileSync(DESC_FILE, 'utf-8'))
const steels = JSON.parse(readFileSync(STEELS_FILE, 'utf-8'))

// alias -> { primary, composition }
const aliasToPrimary = new Map()
const nameToSteel = new Map()
for (const s of steels) {
  nameToSteel.set(s.name, s)
}
for (const s of steels) {
  if (!Array.isArray(s.aliases)) continue
  for (const a of s.aliases) {
    if (!a || aliasToPrimary.has(a)) continue
    aliasToPrimary.set(a, { primary: s.name, composition: s.composition || {} })
  }
}

// ---------- 抽样 ----------

const allAliases = Object.keys(aliasDesc).sort()
const sample = seededSample(allAliases, SAMPLE_SIZE, SEED)
console.log(`抽样 ${sample.length} 个别名 (seed=${SEED}):`)
sample.forEach((a, i) => console.log(`  ${i + 1}. ${a} -> ${slugify(a)}`))

// ---------- 浏览器截图（串行单 session） ----------

function captureScreenshots(aliases) {
  const needed = aliases.filter((a) => !existsSync(join(SHOTS_DIR, `${slugify(a)}.png`)))
  if (needed.length === 0) {
    console.log('\n[1/2] 全部截图已存在，跳过浏览器截图')
    return
  }
  const cmds = []
  cmds.push(`create_session s1 "OCR sampling" ${REGION} 1800`)
  for (const alias of needed) {
    const slug = slugify(alias)
    const url = `https://www.zknives.com/knives/steels/${slug}.shtml`
    const outPath = join(SHOTS_DIR, `${slug}.png`)
    cmds.push(`navigate s1 ${url} networkidle`)
    cmds.push(`wait 2`)
    cmds.push(`screenshot s1 ${outPath} true`)
  }
  cmds.push(`close_session s1`)

  console.log(`\n[1/2] AgentCore Browser 串行截图 ${needed.length} 个...`)
  const stdin = cmds.join('\n') + '\n'
  const result = spawnSync('python3', [BROWSER_SCRIPT], {
    input: stdin,
    encoding: 'utf-8',
    stdio: ['pipe', 'inherit', 'inherit'],
    timeout: 30 * 60 * 1000,
  })
  if (result.status !== 0) {
    throw new Error(`browser.py exited with code ${result.status}`)
  }
}

// ---------- Bedrock Vision 调用 ----------

const bedrock = new BedrockRuntimeClient({ region: REGION })

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

async function callVision(imagePath, retries = 1) {
  const imgB64 = readFileSync(imagePath).toString('base64')
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imgB64 } },
        { type: 'text', text: PROMPT_TEXT },
      ],
    }],
  })
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
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error(`no JSON in response: ${text.slice(0, 200)}`)
      const parsed = JSON.parse(match[0])
      return { ok: true, raw: text, comp: parsed }
    } catch (err) {
      if (attempt === retries) return { ok: false, error: String(err.message || err) }
    }
  }
}

// ---------- 比对 ----------

function normValue(v) {
  // composition value: [v] 或 [min, max]，返回中位值用于差异比较
  if (!Array.isArray(v) || v.length === 0) return null
  if (v.length === 1) return Number(v[0])
  return (Number(v[0]) + Number(v[1])) / 2
}

function compareComp(visionComp, primaryComp) {
  // 关注主要碳化物形成元素：C/Cr/Mo/V/W
  const keyElements = ['C', 'Cr', 'Mo', 'V', 'W']
  const visionKeys = new Set(Object.keys(visionComp).filter((k) => !['Fe', 'error'].includes(k)))
  const primaryKeys = new Set(Object.keys(primaryComp))

  const diffs = []
  let maxRelDiff = 0
  const elementSetDiff = []

  // 元素集差异（key elements only）
  for (const e of keyElements) {
    const inV = visionKeys.has(e)
    const inP = primaryKeys.has(e)
    if (inV && !inP) elementSetDiff.push(`+${e} (vision only)`)
    if (!inV && inP) elementSetDiff.push(`-${e} (primary only)`)
  }

  // 数值差异
  for (const e of keyElements) {
    const vV = normValue(visionComp[e])
    const vP = normValue(primaryComp[e])
    if (vV != null && vP != null) {
      const denom = Math.max(Math.abs(vV), Math.abs(vP), 0.01)
      const relDiff = Math.abs(vV - vP) / denom
      if (relDiff > maxRelDiff) maxRelDiff = relDiff
      if (relDiff > 0.10) {
        diffs.push(`${e}: vision=${vV.toFixed(2)} vs primary=${vP.toFixed(2)} (Δ${(relDiff * 100).toFixed(0)}%)`)
      }
    }
  }

  let status
  if (visionComp.error) status = 'vision_no_chart'
  else if (elementSetDiff.length === 0 && diffs.length === 0) status = 'match'
  else if (elementSetDiff.length > 0) status = 'element_set_diff'
  else if (maxRelDiff > 0.10) status = 'value_diff_gt_10pct'
  else status = 'minor_diff_lt_10pct'

  return { status, diffs, elementSetDiff, maxRelDiff }
}

// ---------- 主流程 ----------

async function main() {
  // 截图
  captureScreenshots(sample)

  console.log('\n[2/2] 调用 Bedrock Vision 提取成分...')
  const results = []
  for (let i = 0; i < sample.length; i++) {
    const alias = sample[i]
    const slug = slugify(alias)
    const shotPath = join(SHOTS_DIR, `${slug}.png`)
    const primaryInfo = aliasToPrimary.get(alias) || { primary: null, composition: {} }

    if (!existsSync(shotPath)) {
      console.log(`  ${i + 1}/${sample.length} ${alias}: 截图缺失`)
      results.push({
        alias, slug, primary: primaryInfo.primary, primaryComp: primaryInfo.composition,
        visionRaw: null, visionComp: null, status: 'screenshot_missing',
      })
      continue
    }

    // 裁剪到 chart 右上角成分文字区域（不裁的话整页 1441×2000+ 字太小，模型会幻觉）
    const cropPath = join(CROPS_DIR, `${slug}.png`)
    cropChartArea(shotPath, cropPath)

    const vis = await callVision(cropPath)
    if (!vis.ok) {
      console.log(`  ${i + 1}/${sample.length} ${alias}: Vision 失败 - ${vis.error}`)
      results.push({
        alias, slug, primary: primaryInfo.primary, primaryComp: primaryInfo.composition,
        visionRaw: null, visionComp: null, status: 'vision_failed', error: vis.error,
      })
      continue
    }

    const cmp = compareComp(vis.comp, primaryInfo.composition)
    console.log(`  ${i + 1}/${sample.length} ${alias} -> ${primaryInfo.primary}  [${cmp.status}]  ${cmp.diffs.slice(0, 2).join('; ')}`)
    results.push({
      alias, slug, primary: primaryInfo.primary,
      primaryComp: primaryInfo.composition,
      visionRaw: vis.raw,
      visionComp: vis.comp,
      compareStatus: cmp.status,
      diffs: cmp.diffs,
      elementSetDiff: cmp.elementSetDiff,
      maxRelDiff: cmp.maxRelDiff,
    })
  }

  writeFileSync(OUT_FILE, JSON.stringify(results, null, 2))
  console.log(`\n保存结果到 ${OUT_FILE}`)

  // 汇总
  const summary = {
    total: results.length,
    visionSuccess: results.filter((r) => r.visionComp && !r.visionComp.error).length,
    visionFailed: results.filter((r) => r.status === 'vision_failed' || r.status === 'screenshot_missing').length,
    visionNoChart: results.filter((r) => r.visionComp?.error).length,
    match: results.filter((r) => r.compareStatus === 'match').length,
    elementSetDiff: results.filter((r) => r.compareStatus === 'element_set_diff').length,
    valueDiffGt10: results.filter((r) => r.compareStatus === 'value_diff_gt_10pct').length,
    minorDiff: results.filter((r) => r.compareStatus === 'minor_diff_lt_10pct').length,
  }
  console.log('\n=== 汇总 ===')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
