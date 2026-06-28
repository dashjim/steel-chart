/**
 * 生成 needs-human 审核网页: 左侧 zknives 裁剪截图, 右侧多个候选(Haiku run1/Opus)+ 主名成分。
 * 输出: scripts/review.html (自包含, 图片内嵌 base64)
 *
 * 用法: node scripts/generate-review-page.mjs
 *      在浏览器打开 scripts/review.html
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const needsHuman = JSON.parse(readFileSync(join(ROOT, 'src/data/alias-composition-needs-human.json'), 'utf-8'))
const steels = JSON.parse(readFileSync(join(ROOT, 'src/data/steels.json'), 'utf-8'))
const meta = JSON.parse(readFileSync(join(ROOT, 'src/data/alias-metadata.json'), 'utf-8'))

const aliasToPrimary = new Map()
for (const s of steels) for (const a of (s.aliases || [])) if (!aliasToPrimary.has(a)) aliasToPrimary.set(a, s)

function compToStr(comp) {
  if (!comp) return '(无)'
  return Object.entries(comp)
    .filter(([k]) => !['recheckReason', 'opus_result', 'main_hint', 'status', 'verified', 'flagged', 'flagReason', 'thirdRun', 'thirdRunModel', 'run1', 'run2'].includes(k))
    .map(([el, vals]) => {
      const v = Array.isArray(vals) ? (vals.length === 2 ? `${vals[0]}-${vals[1]}` : `${vals[0]}`) : `${vals}`
      return `${el}: ${v}`
    })
    .join(', ')
}

function imageToDataUri(p) {
  if (!existsSync(p)) return null
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`
}

const html = [`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>needs-human 人工审核 (5 条)</title>
<style>
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; margin: 0; background: #1a1a1a; color: #ddd; }
.toolbar { position: sticky; top: 0; background: #222; padding: 16px 24px; border-bottom: 1px solid #444; z-index: 100; }
.toolbar h1 { margin: 0; font-size: 18px; }
.toolbar .hint { color: #999; font-size: 13px; margin-top: 6px; }
.container { padding: 20px 24px; }
.item { background: #2a2a2a; border-radius: 8px; padding: 18px; margin-bottom: 18px; display: grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: start; }
.img-col { background: #fff; border-radius: 4px; text-align: center; }
.img-col img { max-width: 100%; display: block; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.name { font-size: 22px; font-weight: bold; color: #FFD700; }
.meta-line { color: #888; font-size: 13px; margin-bottom: 12px; }
.meta-line a { color: #6cb; text-decoration: none; margin: 0 8px; }
.reason { background: #3a2a1a; border-left: 3px solid #d97e2c; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; color: #f0c090; border-radius: 0 4px 4px 0; }
.row { padding: 10px 0; border-bottom: 1px solid #3a3a3a; }
.row:last-child { border-bottom: none; }
.row .label { color: #888; font-size: 12px; margin-bottom: 4px; font-weight: bold; }
.row .value { font-family: ui-monospace, monospace; font-size: 13px; word-break: break-word; line-height: 1.6; }
.v-haiku { color: #b6e4a4; }
.v-opus { color: #c4a4e4; }
.v-third { color: #e4b6a4; }
.v-primary { color: #88aac0; }
.actions { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; }
.actions button { padding: 8px 16px; cursor: pointer; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px; font-size: 13px; }
.actions button.accept.selected { background: #2d6a2d; border-color: #4a8; }
.actions button.reject.selected { background: #a04444; border-color: #d66; }
.export-bar { padding: 18px 24px; background: #222; border-top: 1px solid #444; }
.export-bar button { padding: 10px 20px; background: #4a8; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
</style>
</head>
<body>

<div class="toolbar">
  <h1>needs-human 人工审核 — ${Object.keys(needsHuman).length} 条</h1>
  <div class="hint">这些钢材的成分提取结果超出了元素合理性上限,但 Opus 复跑结果一致,可能是真值(特殊成分)。请逐条判断是否接受。</div>
</div>

<div class="container">
`]

for (const [name, info] of Object.entries(needsHuman)) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const cropPath = `/tmp/zknives-crops/${slug}.png`
  const dataUri = imageToDataUri(cropPath)
  const primary = aliasToPrimary.get(name)
  const primaryName = primary ? primary.name : '(找不到主名)'
  const primaryComp = primary ? primary.composition : null
  const aliasMeta = meta[name] || {}

  // 收集所有候选成分
  const haikuComp = info.run1 || null
  const opusComp = info.opus_result || info.thirdRun || null
  const flagReason = info.flagReason || info.recheckReason || ''
  // 顶层成分(50100B 这种 recheck 后直接被存为顶层)
  const topLevelComp = (!info.run1 && !info.opus_result && !info.thirdRun) ? info : null

  html.push(`<div class="item" data-name="${name}">
  <div class="img-col">${dataUri ? `<img src="${dataUri}" alt="${name}">` : '<div style="padding:60px;color:#999;">无截图</div>'}</div>
  <div class="data-col">
    <div class="head">
      <div class="name">${name}</div>
    </div>
    <div class="meta-line">
      主名: <strong>${primaryName}</strong>
      ${aliasMeta.country ? ` · 国: ${aliasMeta.country}` : ''}
      ${aliasMeta.maker ? ` · 厂: ${aliasMeta.maker}` : ''}
      <a href="https://www.zknives.com/knives/steels/${slug}.shtml" target="_blank">zknives ↗</a>
    </div>
    <div class="reason">⚠ ${flagReason}</div>

    ${topLevelComp ? `
    <div class="row">
      <div class="label">当前存储(疑似 W↔N 不确定)</div>
      <div class="value v-haiku">${compToStr(topLevelComp)}</div>
    </div>
    ` : ''}

    ${haikuComp ? `
    <div class="row">
      <div class="label">Haiku run1</div>
      <div class="value v-haiku">${compToStr(haikuComp)}</div>
    </div>
    ` : ''}

    ${opusComp ? `
    <div class="row">
      <div class="label">Opus 4.8 复读${info.thirdRunModel ? ` (${info.thirdRunModel.split('.').pop()})` : ''}</div>
      <div class="value v-opus">${compToStr(opusComp)}</div>
    </div>
    ` : ''}

    <div class="row">
      <div class="label">数据库主名 ${primaryName}</div>
      <div class="value v-primary">${compToStr(primaryComp)}</div>
    </div>

    <div class="actions">
      <button class="accept" data-mark="accept_haiku">采用 Haiku</button>
      <button class="accept" data-mark="accept_opus">采用 Opus</button>
      <button class="reject" data-mark="reject">放弃(用主名)</button>
    </div>
  </div>
</div>
`)
}

html.push(`</div>

<div class="export-bar">
  <button onclick="exportMarks()">导出标记 JSON</button>
  <span style="color:#888;margin-left:16px;font-size:13px;">标记保存在浏览器本地,刷新不丢。</span>
</div>

<script>
const KEY = 'needs-human-marks';
let marks = JSON.parse(localStorage.getItem(KEY) || '{}');

document.querySelectorAll('.item').forEach(it => {
  const name = it.dataset.name;
  const mark = marks[name];
  it.querySelectorAll('.actions button').forEach(btn => {
    if (btn.dataset.mark === mark) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      const m = btn.dataset.mark;
      if (marks[name] === m) {
        delete marks[name];
        btn.classList.remove('selected');
      } else {
        marks[name] = m;
        it.querySelectorAll('.actions button').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      localStorage.setItem(KEY, JSON.stringify(marks));
    });
  });
});

function exportMarks() {
  const blob = new Blob([JSON.stringify(marks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'needs-human-marks.json';
  a.click();
}
</script>
</body>
</html>
`)

const outPath = join(ROOT, 'scripts/review.html')
writeFileSync(outPath, html.join(''), 'utf-8')
const size = readFileSync(outPath).length
console.log(`生成 ${outPath}`)
console.log(`大小: ${(size / 1024).toFixed(1)} KB`)
console.log(`总条目: ${Object.keys(needsHuman).length}`)
