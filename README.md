# Yi Chang — 独立站前端

Astro 7 静态站，内容来自 Sanity（projectId `vk38187i`，dataset `production`）。
托管在 Netlify，内容更新通过 Sanity webhook 触发重建。

## 本地开发

需要 Node >= 22.23.4（Astro 7 硬要求）。

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 输出到 dist/
npm run preview
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `SITE_URL` | 站点绝对地址，用于 canonical / sitemap。本地可不设，默认为 `https://example.com` |

Netlify 后台 → Site configuration → Environment variables 里配置 `SITE_URL`。

## 目录结构

```
src/
  pages/            路由薄壳（只 import 对应 view）
    index.astro            → /
    products/index.astro   → /products
    product/[slug].astro   → /product/:slug（getStaticPaths 枚举）
    posts/…                → /posts
    en/…                   → 所有英文路由镜像
  views/            实际页面实现（中英共用同一份）
  components/       PortableText.astro 等
  layouts/Base.astro
  lib/
    sanity.ts       client / 图片 URL / 价格格式化
    queries.ts      GROQ 查询
    i18n.ts         双语取值 + UI 文案
schemaTypes/        Sanity schema（与 Studio 共用同一份源码）
```

## 设计决策

- **双语用对象字段**：`title: {zh, en}`，`en` 为空时自动回退中文。
- **语言靠 URL 前缀判断**：`/en/...` → 英文，其余中文。不用 cookie，SEO 稳定。
- **价格单位是美元整数/小数**（`28` 表示 $28），由 `product.currency` 决定符号。
- **多规格商品**：`hasVariants` 开关，开时只用 `variants[]` 各自的 price/stock/sku。
- **列表页不查正文块**，详情页一次 GROQ 展开关联数据，避免瀑布请求。

## 内容更新流程

站点已接入 **Netlify Git 集成**，两条链路都会触发自动构建：

**A. 内容更新（日常）**

1. 在 Sanity Studio 编辑并发布：https://yichang.sanity.studio/
2. Sanity webhook `netlify-rebuild` 触发 Netlify Build Hook
3. Netlify 拉取本仓库、执行 `npm run build`、全站预渲染
4. 通常 1 分钟内生效

**B. 代码更新**

1. `git push` 到 `main`
2. Netlify 自动构建部署

两条链路都**不需要本地服务器参与**。手动部署脚本已停用，见 `DEPLOY.md`。

## 部署配置

| 项 | 值 |
|---|---|
| 站点 | https://yichang-store.netlify.app |
| Netlify 项目 | https://app.netlify.com/projects/yichang-store |
| 仓库 | https://github.com/cen-yison/yichang |
| 构建命令 | `npm run build`（`netlify.toml` 已声明） |
| 发布目录 | `dist`（`netlify.toml` 已声明） |
| Node 版本 | `22.23.4`（`netlify.toml` 已声明） |
| Build Hook | `6aeffde6baa9f46ec4bfd57b`（Sanity webhook 指向它） |
| Sanity webhook | `netlify-rebuild`，id `ZgPpgNTeU04xWJKg` |
