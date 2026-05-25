# Steel Chart 小程序设计文档

## 项目概述

参考 iOS 应用 "Knife Steel Composition Chart"（zknives.com），开发一款微信小程序，提供刀具钢材化学成分的查询、对比和可视化功能。

## 数据来源

数据来自 zknives.com 的钢材数据库（`steelchart.php`），包含：
- **1013 种钢材合金**
- **6524 个名称**（含各国标准别名）
- 每种钢材的化学元素成分（范围值或精确值）

### 数据字段

| 字段 | 说明 | 示例 |
|------|------|------|
| Name | 钢材名称 | #45, 00Cr17Ni14Mo2, CPM 10V |
| Base | 基体元素 | Fe (铁基) |
| C | 碳 | 0.42-0.50 |
| Cr | 铬 | 4.75-5.75 |
| Mo | 钼 | 1.10-1.50 |
| V | 钒 | 9.25-10.25 |
| W | 钨 | - |
| Co | 钴 | - |
| Ni | 镍 | - |
| Mn | 锰 | 0.35-0.60 |
| Si | 硅 | 0.75-1.10 |
| S | 硫 | 0.05-0.09 |
| P | 磷 | - |
| Cu | 铜 | - |
| Nb | 铌 | - |
| N | 氮 | - |
| Tech | 制造工艺 | Ingot, PM (粉末冶金) |
| Maker | 制造商 | Bohler-Uddeholm, Carpenter |
| CC | 国家代码 | US, SE, JP, CN |

### 附加信息（每种钢材详情页）

- 钢材描述/用途说明
- 各国标准对照（Cross-References）：AFNOR, AISI, BS, CSN, DIN, EN, GB, GOST, JIS 等
- 等效/替代品牌名（Proprietary Equivalents）

## 页面结构

### 1. 首页 - 钢材列表 (`pages/index/index`)

**功能：**
- 钢材列表，按名称排序
- 顶部搜索框，支持模糊搜索
- 左侧复选框（用于多选对比）
- 右侧收藏星标
- 支持按元素含量筛选/排序

**UI 参考：** `doc/design/1-lading-page-list-of-steels.jpeg`

### 2. 钢材详情页 (`pages/detail/detail`)

**功能：**
- 显示钢材名称
- 化学成分列表（元素: 含量范围）
- 标准来源（Standard: GB/AISI/DIN 等）
- 钢材描述/注释
- 各国标准交叉引用列表（可点击跳转）

**UI 参考：** `doc/design/2-detail-page-of-one-steel.jpeg`

### 3. 成分图表页 (`pages/chart/chart`)

**功能：**
- 柱状图可视化，支持三种模式：
  - **Mass %** — 质量百分比（直接数据）
  - **Atoms** — 原子数（质量/原子量 归一化）
  - **Molar %** — 摩尔百分比
- 支持多种钢材叠加对比（不同颜色）
- 图例显示钢材名和成分值
- 可放大/缩小（+/- 按钮调节 Y 轴范围）

**UI 参考：**
- `doc/design/3-mass-of-one-steel-from-detailedpage.jpeg`
- `doc/design/4-atoms-of-one-steel.jpeg`
- `doc/design/5-molar.jpeg`

### 4. 元素选择页 (`pages/elements/elements`)

**功能：**
- 选择图表中要显示的元素
- 复选框列表（Carbon, Chromium, Molybdenum, etc.）
- 点击 ℹ️ 查看元素详细说明
- "Rebuild" 按钮重新生成图表

**UI 参考：** `doc/design/6-elements-list-of-one-steel.jpeg`

### 5. 元素说明页 (`pages/element-info/element-info`)

**功能：**
- 显示单个元素在合金中的作用说明
- 纯文本展示

**UI 参考：** `doc/design/7-description-of-one-component-belongs-to-one-steel.jpeg`

## 底部 TabBar

| 图标 | 页面 | 说明 |
|------|------|------|
| 📋 | 钢材列表 | 主页/搜索 |
| ⚙️ | 筛选/设置 | 按元素范围筛选 |
| 💾 | 收藏 | 收藏的钢材 |
| ⋯ | 更多 | 关于/帮助 |

## 数据格式设计

### 完整 Schema

每种钢材存储为一个 JSON 对象，包含以下字段：

```json
{
  "id": 1021,
  "name": "A11",
  "aliases": ["CPM 10V", "PM A11", "T30111"],
  "base": "Fe",
  "standard": "AISI",
  "composition": {
    "C": [2.40, 2.50],
    "Cr": [4.75, 5.75],
    "Mo": [1.10, 1.50],
    "V": [9.25, 10.25],
    "Mn": [0.35, 0.60],
    "Si": [0.75, 1.10],
    "S": [0.05, 0.09]
  },
  "tech": "PM",
  "maker": "Crucible",
  "country": "US",
  "description": "High-speed tool steel, popular for custom knives...",
  "crossRefs": {
    "AFNOR": ["Z90WDCV", "Z85WDCV-06-05-04-02"],
    "AISI": ["M2"],
    "BS": ["BM2"],
    "DIN": ["S6-5-2", "HS6-5-2C"],
    "EN": ["HS6-5-2"],
    "GB": ["W6Mo5Cr4V2"],
    "GOST": ["R6M5"],
    "JIS": ["SKH51", "SKH9"]
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 唯一标识 |
| name | string | 是 | 主名称 |
| aliases | string[] | 否 | 别名列表（同组钢材其他名称） |
| base | string | 是 | 基体元素，通常 "Fe" |
| standard | string | 否 | 所属标准体系（GB/AISI/DIN 等） |
| composition | object | 是 | 成分数据，值为 `[min, max]` 或 `[value]`（单值） |
| tech | string | 否 | 制造工艺：Ingot/PM/3rdGen 等 |
| maker | string | 否 | 制造商 |
| country | string | 否 | 国家代码 |
| description | string | 否 | 钢材描述/用途 |
| crossRefs | object | 否 | 各国标准交叉引用，key=标准名，value=钢材号数组 |

**成分值规则：**
- 范围值：`"C": [0.42, 0.50]` — 表示 0.42% ~ 0.50%
- 单值：`"P": [0.03]` — 表示 ≤0.03% 或精确 0.03%
- 无此元素：字段不存在（不使用 null 或 0）

### 数据文件结构

```
src/static/data/
├── steels.json           # 主数据（1451 条，~575KB）
├── searchIndex.json      # 搜索索引（id → 名称数组，~343KB）
├── descriptions.json     # 英文描述（id → 描述文本）
└── descriptions-zh.json  # 中文描述（Haiku 4.5 翻译）
```

**总计未压缩 ~1MB，gzip 后 ~200KB，在小程序 2MB 限制内有充足余量。**

**搜索索引格式：**
```json
[
  {"t": "A11", "id": 1021},
  {"t": "CPM 10V", "id": 1021},
  {"t": "M2", "id": 1021},
  {"t": "#45", "id": 502},
  {"t": "1045", "id": 502}
]
```

搜索时对 `t` 字段做大小写不敏感的 `includes` 匹配，返回对应 id 列表。

### 数据加载策略

- **全量打包**进小程序主包（预估 ~300KB，在 2MB 限制内）
- App 启动时一次加载 `searchIndex.json` 到内存
- `steels.json` 按需读取（首次进入列表页加载）
- 收藏数据存 `uni.setStorageSync('favorites', [id1, id2, ...])`

## 图表渲染设计

### 渲染方式

使用 **Canvas 2D API** 自绘（不依赖第三方图表库），原因：
- 需要精确控制双色柱（min/max 区间）
- 多钢材并排分组柱需要自定义布局
- 小程序 Canvas 2D 性能足够（柱子数 ≤ 16 × 对比钢材数）

### 柱状图规格

#### 单钢材模式

```
  Y轴(%)
  0.90 ┃     ┃
  0.80 ┃     ┃
  0.70 ┃     ┃
  0.60 ┃ ░░░ ┃    ← max（浅色）
  0.50 ┃ ███ ┃
  0.42 ┃ ███ ┃    ← min（深色）
       ┗━━━━━━━
         C   Mn
```

- 每根柱子分两段颜色：深色填充 0→min，浅色填充 min→max
- 单值元素只画一根实色柱（深色）
- 右上角浮动图例：钢材名 + 各元素范围文字

#### 多钢材对比模式

```
  Y轴(%)
  0.90 ┃       ┃
  0.60 ┃ ░█ ░█ ┃   ← 两种钢材并排
  0.42 ┃ ██ ██ ┃
       ┗━━━━━━━━━
         C    Mn
```

- 同一元素的多种钢材柱子紧挨并排
- 每种钢材独立颜色（色板：蓝、橙、绿、红，最多支持 4 种同时对比）
- 图例显示各钢材名称和颜色标识

#### 三种模式

| 模式 | Y 轴含义 | 计算方式 |
|------|----------|----------|
| Mass % | 质量百分比 | 直接使用 composition 数据 |
| Atoms | 原子数（归一化） | `value / ATOMIC_MASS[element]` |
| Molar % | 摩尔百分比 | `atoms[el] / sum(atoms) * 100` |

**范围值在 Atoms/Molar 模式的处理：**
- min 和 max 分别计算，仍显示双色柱
- Fe 不在图表中显示（隐式为 100% 减去其他元素之和）

#### 缩放

- +/- 按钮调节 Y 轴最大值
- 步进：×2 / ÷2（如 1.0 → 0.5 → 0.25 → 0.125）
- 自动适配：首次显示时 Y 轴 max = 数据最大值 × 1.2

#### 交互

- 点击柱子高亮并在图例中突出显示该元素
- 左右滑动切换 Mass/Atoms/Molar 模式
- 长按导出图片（调用 `canvas.toTempFilePath`）

### Canvas 组件封装

```
src/components/
└── steel-chart/
    ├── steel-chart.vue      # Canvas 组件
    └── chart-bindbindbindbindbindutil bindutil bindutil bindutil bindutil bindutil bindutil bindutil.bindutil.bindutil.bindutil.bindutil
```

修正：
```
src/components/
└── steel-chart/
    ├── steel-chart.vue      # Canvas 组件（接收 steels 数组 + mode）
    └── chart-bindutil.bindutil
```

组件 Props：
```javascript
props: {
  steels: Array,       // 要展示的钢材对象数组（1~4个）
  mode: String,        // 'mass' | 'atoms' | 'molar'
  elements: Array,     // 要显示的元素列表 ['C','Cr','Mo',...]
  yMax: Number         // Y轴最大值
}
```

## 技术方案

### 前端框架
- **uni-app** (Vue 3 + Vite)
- 编译目标：微信小程序 (`mp-weixin`)

### 数据处理流程

```
steelchart.php (HTML) + 66hs.shtml (详情页样本)
    → scripts/parse-steel-data.js
    → src/static/data/steels.json
    → src/static/data/searchIndex.json
```

### 计算逻辑

#### 原子量常数
```javascript
const ATOMIC_MASS = {
  C: 12.011, Cr: 51.996, Mo: 95.94, V: 50.942,
  W: 183.84, Co: 58.933, Ni: 58.693, Mn: 54.938,
  Si: 28.086, S: 32.065, P: 30.974, Cu: 63.546,
  Nb: 92.906, N: 14.007, Fe: 55.845
}
```

#### Mass % → Atoms 转换
```
atoms[element] = mass_percent[element] / ATOMIC_MASS[element]
```

#### Molar %
```
molar_percent[element] = atoms[element] / sum(all_atoms) * 100
```

#### 范围值处理
```javascript
// composition 值为 [min, max] 或 [value]
function getMinMax(comp) {
  if (comp.length === 1) return { min: comp[0], max: comp[0] }
  return { min: comp[0], max: comp[1] }
}
```

## 搜索设计

### 搜索范围
- 主名称（name）
- 别名（aliases）

### 搜索算法
1. 用户每输入一个字符 → 实时触发搜索（无防抖）
2. 输入转小写，遍历 `searchIndex`，对每个名称做 `includes` 匹配
3. 去重（同一 id 多次匹配只返回一次）
4. 排序：精确匹配 > 前缀匹配 > 包含匹配

### 性能保障
- `searchIndex.json` 启动时加载到内存（~343KB）
- 索引格式 `{id: [name1, name2, ...]}` 按 id 分组，遍历高效
- 每次输入实时匹配（1451 组 × 平均 24 名称，JS 遍历 <10ms）
- 结果虚拟列表渲染（一屏只渲染可见项）

## 数据解析（预处理脚本）

需要编写 Node.js 脚本，从 `steelchart.php` 中提取结构化数据：

```
scripts/parse-steel-data.js
  输入: doc/source-data/steelchart.php
  输出: src/static/data/steels.json + src/static/data/searchIndex.json
```

## 开发计划

| 阶段 | 内容 | 产出 |
|------|------|------|
| P0 | 数据解析脚本 + JSON 生成 | `steels.json` |
| P1 | 钢材列表页 + 搜索 | 可浏览所有钢材 |
| P2 | 详情页 | 查看成分和交叉引用 |
| P3 | 图表页 | 柱状图可视化 |
| P4 | 收藏 + 元素筛选 | 完整功能 |
| P5 | 优化 + 上线 | miniprogram-ci 上传 |
