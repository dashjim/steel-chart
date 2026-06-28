# Steel Chart 微信小程序

刀具钢材化学成分数据库微信小程序「钢材狂魔」（由「细节狂魔」创建）。已上线。

GitHub: https://github.com/dashjim/steel-chart
当前版本: v1.3.0 (待发布,新增 487 个别名独立成分)
AppID: wx5a77a7218df15b30

## 技术栈

- **框架**: uni-app (Vue 3 + Vite)
- **目标平台**: 微信小程序 (`npm run build:mp-weixin`)
- **图表**: Canvas 2D 自绘（steel-chart 组件）
- **数据**: JSON 通过 import 打包进 JS（不使用 wx.getFileSystemManager）
- **上传工具**: miniprogram-ci
- **翻译**: Claude Haiku 4.5 via AWS Bedrock (us-west-2)
- **OCR**: Claude Haiku 4.5 (主) / Opus 4.8 (复查) via Bedrock Vision,从 zknives 截图提取别名成分
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
│   │       ├── tradeoff/       # 综合性能散点图（韧性vs保持性，Reddit整理图）
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
- **别名独立成分: 487 个**（OCR 自 zknives 截图,双跑+合理性校验+Opus 复查,人审 5 条）
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
- 空输入时展示默认列表（getDefaultList，详见下方设计决策）

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

### 图片放大查看（天梯图/散点图）
- 内联用 `<image mode="widthFix">` 完整显示，点击调系统原生预览
- **包内 /static/ 图片不能直接喂 previewImage**（一直转圈）→ 先 `uni.getImageInfo` 转本地临时路径，再 `uni.previewImage({urls:[res.path]})`
- 系统原生预览支持双指缩放/拖动/长按保存（不要自己用 movable-view 做缩放，松手会缩回去）
- 图表类图片（线条+文字）用 PNG 128 色调色板无损（~115KB），不用 JPEG（文字糊）

### 搜索页空输入默认列表（getDefaultList）
- 顺序: Larrin 粉末钢(isPM) → 其余 Larrin 钢材 → 全部其余钢材（共 1451 种全展示）
- Larrin 名称匹配用**精确归一化**（去空格/连字符/点后比对），**禁用 includes**（短别名"60"会被"5160"误匹配）
- Larrin 斜杠组合名（M390/20CV/204P）拆分后逐个查；同名多钢材优先主名匹配的

### 别名独立成分（v1.3.0 新增）
zknives 对部分别名公开**独立成分表格**（与主钢材的"系列成分"不同）。我们通过 Bedrock Vision OCR 把这些表格提取为结构化 JSON,作为详情页用别名进入时的展示数据。

- **数据源**: `src/data/alias-composition-verified.json`（487 条）+ `alias-composition-needs-human.json`（5 条待人审）
- **OCR 流程**: 截图 → 裁剪右上角 → Haiku 4.5 双跑 → 一致性比对 + 元素合理性校验 → 失败的进 flagged → fix-flagged-aliases 三阶段救援（N→W 批量改名 / Opus 第三跑） → 最终 verified
- **N→W 复查**: Haiku 有系统性的 W↔N 字母混淆。LIMITS.N=0.5 收紧后,所有 N>0.1% 的样本都用 Opus 4.8 + 主名 hint 复查（recheck-n-aliases.mjs）
- **详情页用法**: 别名访问时优先用别名的 country/maker/desc/composition,无则降级到主钢材

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
- [x] 韧性低置信度标注（值前加 ≈，韧性标签旁 ⓘ 弹窗说明受热处理/硬度/工艺影响；评分顺序 保持性→防锈→韧性，韧性最不准放最后）
- [x] 综合性能散点图页（sub/tradeoff，韧性 vs 保持性，Reddit r/knifeclub 整理图）
- [x] 详情页"对比和图表"按钮（📊，评分卡片下方独立块）
- [x] 收藏页类型图标（📊 对比图表 / 成分收藏无图标）

### 下一步可做
- [ ] 详情页加 CATRA 切割数据（TCC mm + 硬度 Rc）
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

# 5. 抓取别名 country/maker/desc 元数据
node scripts/fetch-alias-metadata.mjs

# 6. 翻译别名描述（Bedrock,批量）
node scripts/translate-aliases.mjs

# 7. 别名独立成分流水线（需 /tmp/zknives-crops/ 已有 486 张裁剪图）
node scripts/extract-alias-composition-full.mjs  # 双跑 OCR → verified + flagged
node scripts/fix-flagged-aliases.mjs              # 三阶段救援 flagged
node scripts/recheck-n-aliases.mjs                # N>0.1% 复查 W↔N 误识
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
14. **uni-app 把 `>` 编译成 `&gt;`** — text 组件不反转义会显示乱码，用实体 `&#x203A;`(›)
15. **previewImage 对包内图片转圈** — `/static/xxx` 路径不被识别，必须先 getImageInfo 转临时路径
16. **movable-view 做图片缩放松手缩回** — 别自己做，直接用系统原生 previewImage
17. **名称匹配禁用 includes** — 短别名"60"会被"5160"/"s60v"误包含，必须精确归一化匹配
18. **真机横向溢出露白条** — 模拟器测不出；page/容器加 `overflow-x:hidden` + `width:100%`
19. **zknives 没公开 API** — 成分以 base64 PNG 像素形式嵌入 HTML（不是 JSON 也不是 SVG），必须 OCR 提取
20. **Haiku 4.5 OCR 有 W↔N 字母混淆** — N 在不锈钢里很少超过 1%（特例: LC200N/Vanax/Cronidur/MagnaCut/N77/Nitrox/S30V/S45VN/BD1N）。**任何 N>0.1% 的样本都要复查**,LIMITS.N=2 太松,改 0.5。复查时给 Opus 喂主名 hint 提高判断力
21. **Bedrock Opus 4.8 已 deprecate temperature 参数** — 传入会 ValidationException,只能传 max_tokens

## 设计文档

详见 `doc/design/DESIGN.md`。
