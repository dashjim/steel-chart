# Steel Chart 微信小程序

刀具钢材化学成分数据库小程序，参考 iOS 应用 "Knife Steel Composition Chart"。

## 技术栈

- **框架**: uni-app (Vue 3 + Vite)
- **目标平台**: 微信小程序 (`npm run build:mp-weixin`)
- **图表**: Canvas 2D 自绘（steel-chart 组件）
- **数据**: JSON 通过 import 打包进 JS（不使用 wx.getFileSystemManager）
- **上传工具**: miniprogram-ci
- **翻译**: Claude Haiku 4.5 via AWS Bedrock (us-west-2)

## 项目结构

```
steel-chart/
├── src/
│   ├── pages/
│   │   ├── index/          # 首页：钢材列表 + 实时搜索 + 模糊搜索
│   │   ├── favorites/      # 收藏页
│   │   ├── about/          # 关于页
│   │   └── sub/            # 子包（按需加载）
│   │       ├── detail/     # 钢材详情（成分/工艺/描述/别名）
│   │       ├── chart/      # 成分柱状图（质量%/原子数/摩尔%）
│   │       ├── elements/   # 元素列表
│   │       └── element-info/ # 元素说明
│   ├── components/
│   │   └── steel-chart/    # Canvas 图表组件
│   ├── data/               # 钢材数据 JSON（import 打包，非 static）
│   ├── utils/
│   │   ├── data.js         # 数据加载（getSteelById 返回深拷贝避免 Vue 代理污染）
│   │   ├── search.js       # 搜索（includes 匹配 + 可选编辑距离模糊搜索）
│   │   ├── favorites.js    # 收藏管理（存 {id, displayName}）
│   │   └── composition.js  # 成分计算（原子数/摩尔%）
│   ├── manifest.json
│   └── pages.json          # 路由 + TabBar + 子包配置
├── scripts/
│   ├── parse-steel-data.mjs       # 解析 steelchart.php → steels.json
│   ├── fetch-descriptions.mjs     # 从 zknives.com 抓取描述
│   ├── translate-descriptions.mjs # 批量翻译描述
│   └── translate.mjs              # 通用翻译工具
├── doc/
│   ├── design/             # UI 设计参考截图 + DESIGN.md
│   └── source-data/        # 原始数据源（steelchart.php, 66hs.shtml）
└── dist/build/mp-weixin/   # 构建产物（~1.2MB）
```

## 常用命令

```bash
npm run dev:mp-weixin     # 开发模式（热重载）
npm run build:mp-weixin   # 生产构建
npm run dev:h5            # H5 预览（浏览器调试，部分 API 不可用）
```

## 数据统计

- 钢材种类: 1451
- 名称/别名: 34899
- 有描述: 1350 (93%)
- 有制造商: 645
- 有工艺: 216
- 构建产物: ~1.2MB（限制 2MB）

## 关键设计决策

### 数据加载
JSON 通过 `import` 编译进 JS bundle。不能用 `wx.getFileSystemManager().readFileSync` 读取包内文件（会失败）。

### Vue 响应式陷阱
`getSteelById()` 必须返回 `JSON.parse(JSON.stringify(steel))` 深拷贝。否则 Vue 会代理缓存中的原始对象，页面销毁后 ctx 变 null 导致崩溃。详情页的 data 只存基本类型和纯数组，不存原始 steel 对象引用。

### 搜索逻辑
- 所有名称（主名称 + 别名）扁平化为独立条目
- 实时搜索：`name.includes(keyword)`，按精确>前缀>包含+长度排序
- 模糊搜索（按钮触发）：对全部 34899 条计算编辑距离，返回 top 50
- 同名称多钢材时，优先指向主名称匹配的钢材
- 搜索结果和收藏都存 displayName（用户看到的名称）

### 图表计算
- 质量%: 直接使用 composition 数据
- 原子数: `mass% / atomicMass × 1000`（每 1000g 合金中原子数）
- 摩尔%: 归一化百分比（含 Fe 平衡）

### 描述中钢材链接
详情页描述文本中自动识别其他钢材名称，橙色高亮可点击跳转。长名称优先匹配避免重叠。

### 分包
主包: 首页 + 收藏 + 关于（TabBar 页面）
子包 `pages/sub/`: 详情 + 图表 + 元素（按需加载）

## 数据处理流程

```bash
# 1. 解析主表（从 steelchart.php 提取 1451 条钢材）
node scripts/parse-steel-data.mjs

# 2. 抓取描述（需联网，~4分钟）
node scripts/fetch-descriptions.mjs

# 3. 翻译为中文（需 AWS Bedrock，~3分钟）
node scripts/translate-descriptions.mjs
```

## 设计文档

详见 `doc/design/DESIGN.md`。
