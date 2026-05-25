/**
 * 调用 Claude Haiku 4.5 (Bedrock) 批量翻译文本为中文
 *
 * 用法:
 *   node scripts/translate.mjs <input.json> <output.json>
 *
 * 输入格式: JSON 数组，每个元素是要翻译的英文字符串
 *   ["text1", "text2", ...]
 *
 * 输出格式: 同结构的中文翻译数组
 *   ["翻译1", "翻译2", ...]
 *
 * 也可以作为模块导入:
 *   import { translateBatch, translateOne } from './translate.mjs'
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { readFileSync, writeFileSync } from 'fs'

const REGION = process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION || 'us-west-2'
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const BATCH_SIZE = 20
const DELAY_MS = 500

const client = new BedrockRuntimeClient({ region: REGION })

export async function translateOne(text) {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `将以下英文翻译为中文，保持专业术语准确（冶金/材料学领域）。只输出翻译结果，不要解释。\n\n${text}`
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
  return result.content[0].text.trim()
}

export async function translateBatch(texts) {
  const results = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const numbered = batch.map((t, idx) => `[${idx + 1}] ${t}`).join('\n\n')

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `将以下英文翻译为中文，保持专业术语准确（冶金/材料学/刀具领域）。
按相同编号格式输出翻译结果，每条翻译前加 [编号]。

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

    const lines = translated.split(/\n+/)
    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)/)
      if (match) {
        results.push(match[2].trim())
      }
    }

    if (i + BATCH_SIZE < texts.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }

    console.error(`  翻译进度: ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}`)
  }

  return results
}

// CLI 模式
const args = process.argv.slice(2)
if (args.length >= 2) {
  const input = JSON.parse(readFileSync(args[0], 'utf-8'))
  console.error(`开始翻译 ${input.length} 条文本...`)
  const output = await translateBatch(input)
  writeFileSync(args[1], JSON.stringify(output, null, 2), 'utf-8')
  console.error(`完成，已写入 ${args[1]}`)
} else if (args.length === 0) {
  // 模块导入模式，不执行
} else {
  console.error('用法: node scripts/translate.mjs <input.json> <output.json>')
  process.exit(1)
}
