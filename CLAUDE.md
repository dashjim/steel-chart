# Steel Chart 微信小程序

刀具钢材化学成分数据库微信小程序。已上线。

GitHub: https://github.com/dashjim/steel-chart
当前版本: v1.1.1 (待发布 v1.2.0)
AppID: wx5a77a7218df15b30

## 技术栈

- **框架**: uni-app (Vue 3 + Vite)
- **目标平台**: 微信小程序 (`npm run build:mp-weixin`)
- **图表**: Canvas 2D 自绘（steel-chart 组件）
- **数据**: JSON 通过 import 打包进 JS（不使用 wx.getFileSystemManager）
- **上传工具**: miniprogram-ci
- **翻译**: Claude Haiku 4.5 via AWS Bedrock (us-west-2)
- **评分模型**: 线性回归，基于 Larrin Thomas 实测数据训练

## 项目结构

```
steel-chart/
├── src/
│   ├── pages/
│   │   ├── index/              # 首页：Google风格（标题+搜索框+天梯图入口）
│   │   ├── favorites/          # 收藏页（支持单钢材和对比组合收藏）
│   │   ├── about/              # 关于页（数据来源+模型说明）
│   │   └── sub/                # 子包（按需加载，共152KB）
│   │       ├── search/         # 搜索页（自动聚焦，实时+模糊搜索）
│   │       ├── detail/         # 钢材详情（成分/评分/工艺/描述/别名/链接）
│   │       ├── chart/          # 成分对比图（质量%/原子数/摩尔%，最多5种）
│   │       │   ├── chart.vue
│   │       │   └── select-steel.vue  # 搜索选择对比钢材
│   │       ├── ladder/         # CATRA天梯图（图片可放大+轴含义说明）
│   │       ├── elements/       # 元素列表
│   │       └── element-info/   # 元素说明（专业冶金学描述）
│   ├── components/
│   │   └── steel-chart/        # Canvas 图表组件（双色柱 min/max）
│   ├── data/                   # 数据 JSON（import 打包，非 static 目录）
│   │   ├── steels.json         # 1451种钢材主数据（含中文描述）
│   │   ├── searchIndex.json    # 搜索索引（id → 名称数组）
│   │   ├── larrin-ratings.json # Larrin Thomas 实测评分（61种钢材）
│   │   ├── rating-model-v2.json # v2线性回归模型系数（13交叉特征）
│   │   └── catra-data.json    # CATRA切割数据（60种，TCC mm + Rc）
│   ├── utils/
│   │   ├── data.js             # 数据加载（getSteelById 返回深拷贝）
│   │   ├── search.js           # 搜索（includes + 编辑距离模糊）
│   │   ├── favorites.js        # 收藏管理（支持 compareData）
│   │   ├── composition.js      # 成分计算（原子数/摩尔%）
│   │   └── ratings.js          # 性能评分（Larrin实测 + v2模型估算）
│   ├── manifest.json
│   └── pages.json              # 路由 + TabBar + 子包配置
├── scripts/
│   ├── parse-steel-data.mjs         # 解析 steelchart.php → steels.json
│   ├── fetch-descriptions.mjs       # 从 zknives.com 抓取描述
│   ├── translate-descriptions.mjs   # 批量翻译描述
│   ├── translate.mjs                # 通用翻译工具
│   └── build-rating-model.mjs       # 构建评分回归模型
├── doc/
│   ├── design/             # UI 设计参考截图 + DESIGN.md
│   └── source-data/        # 原始数据源（steelchart.php, 66hs.shtml）
└── dist/build/mp-weixin/   # 构建产物（~1.2MB，限制2MB）
```

## 常用命令

```bash
npm run dev:mp-weixin     # 开发模式（热重载）
npm run build:mp-weixin   # 生产构建
npm run dev:h5            # H5 预览（浏览器调试，部分 API 不可用）
node scripts/build-rating-model.mjs  # 重建评分模型
```

## 数据统计

- 钢材种类: 1451
- 名称/别名: 34899
- 有描述: 1350 (93%)
- 有制造商: 645
- 有工艺: 216（PM/CPM/ESR/MM/SF/VIM）
- Larrin 实测评分: 61 种钢材
- CATRA 切割数据: 60 种钢材
- 构建产物: 主包 1.3MB + 子包 152KB = 1.4MB（gzip 传输 ~420KB）

## 关键设计决策

### 数据加载
JSON 通过 `import` 编译进 JS bundle。**不能用** `wx.getFileSystemManager().readFileSync` 读取包内文件（会失败，这是小程序限制）。

### Vue 响应式陷阱（重要！）
`getSteelById()` 必须返回 `JSON.parse(JSON.stringify(steel))` 深拷贝。否则 Vue 会代理缓存中的原始对象，页面销毁后 ctx 变 null 导致崩溃。详情页的 data 只存基本类型和纯数组，**绝不存原始 steel 对象引用**。v-for 中的 @click 事件传 index 而非对象属性。

### 首页设计（Google 风格）
- 首页只有：标题 + 副标题（数据统计）+ 大搜索框 + 天梯图入口
- 搜索框是"假的"——点击跳转到子包 `sub/search/search`（真搜索页）
- 不再在首页加载 1451 条数据列表
- 目的：用户打开瞬间理解这是什么应用，不会因为看到一堆数字编号钢材而流失

### 搜索逻辑（sub/search 页面）
- 所有名称（主名称 + 别名）扁平化为独立条目
- 自动聚焦输入框
- 实时搜索：`name.includes(keyword)`，按精确>前缀>包含+长度排序
- 模糊搜索（"模糊"按钮触发）：对全部 34899 条计算编辑距离，返回 top 50
- 同名称多钢材时，优先指向主名称包含搜索词的钢材
- 搜索时无"别名"和"主名称"区分——用户视角每个名称都是独立条目
- 搜索结果和收藏都存 displayName（用户看到的名称）

### 图表对比功能
- 详情页评分标题右侧有"对比"按钮（pill 样式）→ 进入图表页
- 图表页底部: +对比（跳搜索选择页）/ ★收藏
- 最多 5 种钢材同时对比，5 种颜色（蓝/橙/绿/红/紫）
- 图例左侧 ✕ 按钮移除单个钢材
- 图例显示成分（元素白色，数值灰色）
- 点击图例行进入该钢材详情页
- 对比组合可收藏（收藏页显示 "M390 / CPM 3V / D2"，点击直达图表）

### 图表计算
- 质量%: 直接使用 composition 数据
- 原子数: `mass% / atomicMass × 1000`（每 1000g 合金中原子数，与 iOS 参考 app 一致）
- 摩尔%: 归一化百分比（含 Fe 平衡）

### 描述中钢材链接
详情页描述文本中自动识别其他钢材名称（≥3字符），橙色高亮可点击跳转。长名称优先匹配避免重叠。同名称多钢材时优先指向主名称匹配的。

### 分包策略
主包: 首页 + 收藏 + 关于（TabBar 页面）
子包 `pages/sub/`: 详情 + 图表 + 选择钢材 + 元素（按需加载）

## 评分系统（进行中）

### 数据来源
Larrin Thomas (knifesteelnerds.com) 的实测数据：
- 文章: https://knifesteelnerds.com/2021/10/19/knife-steels-rated-by-a-metallurgist-toughness-edge-retention-and-corrosion-resistance/
- 0-10 分制评分覆盖 61 种常见刀具钢
- CATRA 实测切割数据（TCC mm）+ Charpy 冲击韧性 + 盐雾腐蚀测试

### 三个评分维度
1. **韧性 (Toughness)** — Charpy 冲击测试，受碳化物体积/大小/热处理影响
2. **保持性 (Edge Retention)** — CATRA 切割测试，受硬度/碳化物硬度/碳化物体积影响
3. **防锈 (Corrosion Resistance)** — 盐雾测试，受游离铬/Mo/表面处理影响

### 线性回归估算模型

对没有 Larrin 实测数据的钢材，用 v2 模型（13 个交叉特征 + Ridge 正则化）估算。

模型特征包括：基础成分(C/Cr/Mo/V/W/Co/Nb/N) + isPM + 交叉特征(V×C, Cr×C, W×C, Cr-C×4, 游离Cr估算, 总碳化物体积, C², V², Cr×Mo, V×isPM, C×isPM, Cr×N, Mo×N)

模型精度（v2, 60 个训练样本）：
| 指标 | R² | RMSE |
|------|-----|------|
| 保持性 | 0.984 | 0.33 |
| 防锈 | 0.990 | 0.33 |
| 韧性 | 0.762 | 1.12 |

### isPM 判断规则
以下任一条件满足即视为粉末钢（isPM=1）：
- tech 字段为 PM / CPM / MM
- 名称包含 "CPM" 或 "Micro-Melt"

### 韧性模型已知局限
韧性 R²=0.76 是成分模型的天花板。无法准确预测的情况：
- **K390/Vanadis 8**：超高 V 粉末钢，碳化物极细韧性远超成分暗示（低估 3-4 分）
- **AEB-L/14C28N**：简单不锈钢但热处理极优，韧性 9（低估 2-3 分）
- **1.4116**：Larrin 测的样品可能热处理差（高估 4 分）
- 极端成分钢（ZDP-189 C=3%）会被 clamp(0,10) 截断

尝试过的改进方向（效果有限）：
- sqrt/log 非线性特征 → R² 仅从 0.76 到 0.76
- 区分碳化物类型（VC细/CrC粗）→ K390 改善但整体 R² 下降
- 结论：韧性根本依赖热处理和微观组织，成分无法完全捕捉

### 已完成
- [x] 详情页显示评分（有 Larrin 数据的显示金色实测，无的显示蓝色估算）
- [x] CATRA 天梯图数据（60 种钢材，存于 catra-data.json）
- [x] 评分区域加 ⓘ 图标跳转关于页查看模型说明
- [x] 关于页标注数据来源和模型表现

### 下一步可做
- [ ] 详情页加 CATRA 切割数据（TCC mm + 硬度 Rc）
- [ ] 韧性预测标注"低置信度"
- [ ] 基于 CATRA 数据的保持性天梯排名页

## 数据处理流程

```bash
# 1. 解析主表（从 steelchart.php 提取 1451 条钢材）
node scripts/parse-steel-data.mjs

# 2. 抓取描述（需联网，~4分钟）
node scripts/fetch-descriptions.mjs

# 3. 翻译为中文（需 AWS Bedrock，~3分钟）
node scripts/translate-descriptions.mjs

# 4. 构建评分模型 v2（需 larrin-ratings.json）
node scripts/build-rating-model-v2.mjs
```

## 已踩过的坑

1. **wx.getFileSystemManager 不能读包内文件** — 必须用 import
2. **Vue 响应式代理污染共享对象** — getSteelById 必须深拷贝
3. **v-for 遍历 object 在小程序崩溃** — 必须预处理为数组
4. **v-for 中 @click 传对象属性导致 ctx null** — 改传 index
5. **搜索性能** — editDistance 对 34899 条逐个算会卡死（~几秒），只能按钮触发
6. **steels.find() 在循环中 O(n²)** — 预建 Map 查找
7. **翻译截断** — 原始脚本对 >500 字符截断后翻译，必须完整翻译
8. **URL 提取遗漏** — 438 种钢材的详情页 URL 没从表格正则中提取到，需用主名称推导
9. **嵌套 text 才能内联** — 小程序中 template+view 会换行，只有 text 嵌套 text 保持内联
10. **分包必须配合数据位置** — JSON 放 static/ 会被复制到产物，放 src/data/ 通过 import 打包不会重复
11. **主包页面 import JSON 不能用 @/ alias** — 编译出错误路径 `pages/index/@/data/...`，必须用相对路径 `../../data/`
12. **Array.sort() 会修改原数组** — 对比页 `steelIds.sort()` 导致 ids 和 names 索引不对应，必须 `.slice().sort()`
13. **isPM 判断不全** — PM/CPM/MM/名称含CPM 都是粉末钢，之前只判断了前两种导致韧性预测偏低

## 设计文档

详见 `doc/design/DESIGN.md`。
