# Steel Chart 微信小程序

刀具钢材化学成分数据库小程序，参考 iOS 应用 "Knife Steel Composition Chart"。

## 技术栈

- **框架**: uni-app (Vue 3 + Vite)
- **目标平台**: 微信小程序 (`npm run dev:mp-weixin`)
- **图表**: Canvas 2D 或 uCharts
- **数据**: 静态 JSON 打包在 `src/static/data/`
- **上传工具**: miniprogram-ci

## 项目结构

```
steel-chart/
├── src/
│   ├── pages/          # 页面
│   ├── static/data/    # 钢材数据 JSON
│   ├── components/     # 复用组件
│   ├── utils/          # 工具函数（计算、数据加载）
│   ├── manifest.json   # 小程序配置
│   └── pages.json      # 路由配置
├── scripts/            # 数据解析脚本
├── doc/
│   ├── design/         # UI 设计参考截图 + 设计文档
│   └── source-data/    # 原始数据源（HTML）
└── dist/build/mp-weixin/  # 构建产物
```

## 常用命令

```bash
npm run dev:mp-weixin     # 开发模式
npm run build:mp-weixin   # 生产构建
npm run dev:h5            # H5 预览（浏览器调试）
```

## 数据处理

原始数据在 `doc/source-data/steelchart.php`（HTML 表格，1013 种钢材）。
解析脚本 `scripts/parse-steel-data.js` 负责提取并输出 `src/static/data/steels.json`。

## 设计文档

详见 `doc/design/DESIGN.md`。
