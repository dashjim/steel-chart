/**
 * 翻译"真正独立"的别名描述(英文 → 中文)
 *
 * 输入: src/data/aliases-to-translate.json
 * 输出: src/data/alias-desc-zh.json
 *
 * 使用 Claude Haiku 4.5 (Bedrock)
 * 注意: 不截断, 全文翻译
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const INPUT_FILE = join(ROOT, 'src/data/aliases-to-translate.json')
const OUTPUT_FILE = join(ROOT, 'src/data/alias-desc-zh.json')
const PROGRESS_FILE = join(ROOT, 'src/data/alias-desc-zh-progress.json')

const REGION = process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION || 'us-west-2'
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const BATCH_SIZE = 10
const DELAY_MS = 600

const client = new BedrockRuntimeClient({ region: REGION })

async function translateBatch(texts) {
  const numbered = texts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `将以下刀具钢材描述翻译为中文。要求：
- 保持冶金/材料学专业术语准确
- 保留钢材型号名称不翻译（如 CPM 3V, D2, M2, AISI, HRC）
- 按相同编号格式输出，每条前加 [编号]
- 只输出翻译结果

${numbered}`
    }]
  })

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body
  })

  const response = await client.send(command)
  const result = JSON.parse(new TextDecoder().decode(response.body))
  const translated = result.content[0].text.trim()

  const results = []
  const lines = translated.split('\n')
  let current = ''
  let currentIdx = -1

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.*)/)
    if (match) {
      if (currentIdx >= 0) results[currentIdx] = current.trim()
      currentIdx = parseInt(match[1]) - 1
      current = match[2]
    } else if (currentIdx >= 0) {
      current += ' ' + line
    }
  }
  if (currentIdx >= 0) results[currentIdx] = current.trim()

  return results
}

async function main() {
  const input = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'))
  const entries = Object.entries(input).filter(([_, d]) => d && d.length > 0)
  console.log(`待翻译: ${entries.length} 条别名描述\n`)

  let translated = {}
  if (existsSync(PROGRESS_FILE)) {
    translated = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    console.log(`已有进度: ${Object.keys(translated).length} 条`)
  }

  const remaining = entries.filter(([name]) => !(name in translated))
  console.log(`剩余: ${remaining.length} 条\n`)

  let done = 0
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE)
    const names = batch.map(([n]) => n)
    const texts = batch.map(([_, d]) => d)  // 不截断

    try {
      const results = await translateBatch(texts)
      for (let j = 0; j < names.length; j++) {
        translated[names[j]] = results[j] || ''
      }
    } catch (e) {
      console.error(`  批次 ${i} 翻译失败: ${e.message}`)
    }

    done += batch.length

    if (done % 50 < BATCH_SIZE) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(translated, null, 2), 'utf-8')
    }

    if (done % 30 < BATCH_SIZE) {
      const pct = ((done / remaining.length) * 100).toFixed(1)
      console.log(`  进度: ${done}/${remaining.length} (${pct}%)`)
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  writeFileSync(PROGRESS_FILE, JSON.stringify(translated, null, 2), 'utf-8')
  writeFileSync(OUTPUT_FILE, JSON.stringify(translated), 'utf-8')

  console.log(`\n完成! ${Object.keys(translated).length} 条翻译`)
  console.log(`输出: ${OUTPUT_FILE}`)
}

main().catch(e => {
  console.error('错误:', e.message)
  process.exit(1)
})
