/**
 * 精简 alias-metadata.json：去除 desc 字段(已单独翻译到 alias-desc-zh.json),
 * 只保留 country / maker,降低 bundle 大小。
 *
 * 输入: src/data/alias-metadata.json (含 desc, 673KB)
 * 输出: src/data/alias-metadata.json (覆盖,只留 country/maker)
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FILE = join(ROOT, 'src/data/alias-metadata.json')

const data = JSON.parse(readFileSync(FILE, 'utf-8'))
const stripped = {}
let kept = 0
for (const [name, meta] of Object.entries(data)) {
  const out = {}
  if (meta.country) out.country = meta.country
  if (meta.maker) out.maker = meta.maker
  if (Object.keys(out).length > 0) {
    stripped[name] = out
    kept++
  }
}

writeFileSync(FILE, JSON.stringify(stripped), 'utf-8')
const sizeBefore = readFileSync(FILE + '').length
console.log('精简后条目数:', kept)
console.log('新文件大小:', Math.round(sizeBefore / 1024), 'KB')
