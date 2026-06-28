/**
 * 把 larrin-ratings.json 里的 Larrin 简称改为数据库主名,
 * 以便 Larrin 评级页直接显示主名、点击跳详情页一致。
 *
 * 映射表已人工审核，确保 28 个不一致名字对应正确主名。
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const RENAME = {
  // 字符差异(空格/连字符)
  'CruForgeV': 'Cru Forge V',
  'CPM-CruWear': 'Cru-Wear',
  'CPM-M4': 'CPM M4',
  'CPM-154': 'CPM154',
  // 加 CPM 前缀(美国 Crucible 出品)
  '10V': 'CPM 10V',
  '15V': 'CPM 15V',
  '3V': 'CPM 3V',
  'Rex 121': 'CPM Rex 121',
  'MagnaCut': 'CPM MagnaCut',
  'S30V': 'CPM S30V',
  'S35VN': 'CPM S35VN',
  'S45VN': 'CPM S45VN',
  'S60V': 'CPM S60V',
  'S90V': 'CPM S90V',
  'S110V': 'CPM S110V',
  'S125V': 'CPM S125V',
  'V4E/4V': 'CPM 4V',
  // 日本钢
  'Super Gold 2': 'R2',
  'V-Toku2': 'V2 Special',
  'Blue Super': 'Aogami Super',
  // 复合斜杠名: 选最知名的
  'Rex 45/HAP40': 'CPM Rex 45',
  'M390/20CV/204P': 'M390 MicroClean',
  'AUS-8/8Cr13MoV': 'AUS8',
  // 其他
  '26C3': 'UHB26C3',
  '1.2562': 'ERW3',
  'BD1N': 'CTS-BD1N',
  'Vanax': 'Vanax SuperClean',
  'XHP': 'CTS-XHP'
}

const FILE = join(ROOT, 'src/data/larrin-ratings.json')
const ratings = JSON.parse(readFileSync(FILE, 'utf-8'))

let renamed = 0
for (const r of ratings) {
  if (RENAME[r.name]) {
    r.name = RENAME[r.name]
    renamed++
  }
}

writeFileSync(FILE, JSON.stringify(ratings, null, 2), 'utf-8')
console.log(`重命名: ${renamed} / ${ratings.length}`)
console.log('已写回 larrin-ratings.json')
