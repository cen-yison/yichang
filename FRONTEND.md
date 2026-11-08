# 前端开发说明

Astro 7 静态站。内容来自 Sanity，托管在 Netlify，代码在 GitHub。

本文只讲**前端开发**：代码怎么组织、怎么改、怎么调试、怎么发。内容编辑（写文章、上架商品）请直接看 Studio 内的字段提示，不在本文范围。

---

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Astro 7.4 | 静态输出，默认零 JS |
| 内容 | Sanity（projectId `vk38187i`，dataset `production`） | 只读，匿名访问 |
| 客户端 | `@sanity/client` 8.15 | 不装 `@sanity/astro`，见「踩过的坑」第 3 条 |
| 图片 | `@sanity/image-url` 2.1 | CDN 裁剪 + webp 转换 |
| 样式 | 原生 CSS，写在组件内 | 无 CSS 框架 |
| 托管 | Netlify | 静态 CDN |
| 构建 | `npm run build` → `dist/` | 10 个页面，约 5 秒 |

---

## 一、本地环境

### 1.1 Node 版本

**必须 ≥ 22.23.4。** Astro 7 的硬要求。

```bash
node -v   # 应该 ≥ v22.23.4
```

⚠️ 版本不够时 `astro build` 会**打印 "Node.js vX is not supported by Astro" 然后 exit code 0** —— 看起来成功了，其实什么都没编译。这是最隐蔽的坑，先查版本再干别的。

用 apt 装的 nodejs 是 v12，不能用。需要自己装：

```bash
curl -sSL https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.xz -o /tmp/node22.tar.xz
tar -xJf /tmp/node22.tar.xz -C /opt
mv /opt/node-v22.23.4-linux-x64 /opt/node22
export PATH=/opt/node22/bin:$PATH
```

### 1.2 起项目

```bash
git clone https://github.com/cen-yison/yichang.git
cd yichang
npm install
npm run dev     # http://localhost:4321
```

```bash
npm run build    # 构建到 dist/
npm run preview  # 本地预览构建产物
```

dev 模式改代码会自动热更新。改 Sanity 里的内容，刷新页面即可看到（`useCdn: false`，不走缓存）。

### 1.3 类型检查

```bash
npx tsc --noEmit -p .
```

项目是 `strict` 模式，改了查询或类型后建议跑一次。

---

## 二、目录结构与职责

```
yichang/
├── src/
│   ├── pages/                      ← 路由层（薄壳，只有 4–11 行）
│   │   ├── index.astro                    /
│   │   ├── products/index.astro           /products/
│   │   ├── product/[slug].astro           /product/:slug
│   │   ├── posts/index.astro              /posts/
│   │   ├── posts/[slug].astro             /posts/:slug
│   │   └── en/                            英文路由，结构与上面一一对应
│   │
│   ├── views/                      ← 页面实现（中英共用）
│   │   ├── Home.astro            103 行
│   │   ├── Products.astro         49 行
│   │   ├── ProductDetail.astro   212 行
│   │   ├── Posts.astro            87 行
│   │   └── PostDetail.astro      153 行
│   │
│   ├── layouts/
│   │   └── Base.astro            118 行  全站骨架 + 全局 CSS
│   │
│   ├── components/
│   │   └── PortableText.astro    162 行  富文本渲染器
│   │
│   └── lib/
│       ├── sanity.ts              58 行  client / imgUrl / formatPrice
│       ├── queries.ts            145 行  所有 GROQ 查询
│       └── i18n.ts                62 行  双语取值 + UI 文案
│
├── netlify.toml         构建配置、缓存头、安全头
├── astro.config.mjs     Astro 配置、sitemap、canonical 域名
├── tsconfig.json
└── package.json
```

### 2.1 为什么分 pages 和 views 两层

因为中英文是**两套 URL、一套模板**。

`src/pages/index.astro` 全文就这些：

```astro
---
import Home from '../views/Home.astro'
---
<Home />
```

`src/pages/en/index.astro` 一模一样，只是路径深度不同：

```astro
---
import Home from '../../views/Home.astro'
---
<Home />
```

真正的页面逻辑只在 `views/Home.astro` 里写一遍。改一次，中英文两边同时生效，**不会出现「中文改了英文忘了」**。

语言从 URL 前缀推断，不靠 cookie 或 header：

```ts
// src/lib/i18n.ts
localeFromPath('/en/product/x')  // → 'en'
localeFromPath('/product/x')     // → 'zh'
```

这样 SEO 稳定、分享链接稳定、CDN 可以全量缓存。

### 2.2 相对路径深度（最容易写错）

`src/pages/` 下的 import 深度要数清楚：

| 文件 | 到 `src/views/` 的相对路径 |
|---|---|
| `src/pages/index.astro` | `../views/` |
| `src/pages/product/[slug].astro` | `../../views/` |
| `src/pages/en/index.astro` | `../../views/` |
| `src/pages/en/product/[slug].astro` | `../../../views/` |

写错会报 `UNRESOLVED_IMPORT`，构建直接失败。这个错误信息很明确，好排查。

---

## 三、数据层

所有 Sanity 查询集中在 `src/lib/queries.ts`。页面不直接写 GROQ。

### 3.1 客户端

```ts
// src/lib/sanity.ts
import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: 'vk38187i',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,          // 见下方说明
  perspective: 'published',
})
```

**`useCdn: false` 是刻意的。** 静态构建只在构建时查一次数据，必须读到最新 —— 走 CDN 会拿到分钟级旧缓存，导致刚发布的商品在构建产物里不存在。代价是构建时多花几百毫秒，无所谓。

### 3.2 查询设计原则

**列表页只查卡片字段，不查正文块。**

```ts
const PRODUCT_CARD = `
  _id, title, slug, shortDescription,
  "image": images[0],
  hasVariants, price, compareAtPrice, currency, status, featured,
  "minPrice": math::min(variants[].price),
  "stockSum": math::sum(variants[].stock),
  "variantCount": count(variants),
  "category": category->{ title, slug }
`
```

`description`（富文本详情）和 `variants`（完整变体数组）都不查。列表页 12 个商品的话，这一条能省掉大量传输。

**详情页一次查完所有关联数据**，不要瀑布式发请求：

```ts
export async function getProductBySlug(slug: string) {
  return client.fetch(`*[_type == "product" && slug.current == $slug][0]{
    ...,
    "image": images[0],
    "minPrice": math::min(variants[].price),
    "stockSum": math::sum(variants[].stock),
    "compareAt": coalesce(compareAtPrice, variants[price == math::min(^.variants[].price)][0].compareAtPrice),
    "category": category->{ title, slug },
    "related": *[_type == "product" && status != "archived" && _id != ^._id
                 && category._ref == ^.category._ref] | order(_createdAt desc) [0...3] {${PRODUCT_CARD}}
  }`, { slug })
}
```

一个请求拿到：商品全部字段 + 主图 + 最低价 + 总库存 + 分类展开 + 相关商品。**一次往返，不是四次。**

### 3.3 静态路径枚举

`[slug]` 页面在 `getStaticPaths` 里枚举所有 slug，Astro 构建时逐个预渲染：

```astro
---
// src/pages/product/[slug].astro
import ProductDetail from '../../views/ProductDetail.astro'
import { getAllProductSlugs } from '../../lib/queries'

export async function getStaticPaths() {
  const slugs = await getAllProductSlugs()
  return slugs.map((slug) => ({ params: { slug } }))
}
---
<ProductDetail />
```

**枚举时必须过滤掉不该出现的内容**，否则会生成可访问的页面：

```ts
// 排除 archived，否则下架商品的详情页仍能通过 URL 直接访问
`*[_type == "product" && status != "archived" && defined(slug.current)].slug.current`

// 只构建已到发布时间的文章，未来时间的（定时发布）不预渲染
`*[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()].slug.current`
```

这两处是曾经漏过的 bug，改查询时别退回去。

### 3.4 新增一个查询

```ts
export async function getSomething() {
  return client.fetch(`*[_type == "xxx"]{ ... }`)
}
```

页面里 `import { getSomething } from '../lib/queries'`，在 frontmatter 顶层 `await`：

```astro
---
const items = await getSomething()
---
```

Astro 支持 top-level await。

---

## 四、双语处理

### 4.1 取值函数

```ts
// src/lib/i18n.ts
export const t = (field: Localized, locale: Locale = 'zh'): string => {
  if (!field) return ''
  const primary = field[locale]
  if (primary && primary.trim()) return primary
  return field.zh ?? field.en ?? ''    // 英文为空则回退中文
}
```

Schema 里所有对外文案都是 `{ zh, en }` 对象：

```ts
title: { zh: '陶土马克杯', en: 'Clay Mug' }
```

页面里统一用 `t(product.title, locale)` 取值。**不要写 `product.title.zh`** —— 那样英文站会显示中文，且没有回退。

### 4.2 链接生成

```ts
localePath('/product/clay-mug', 'en')  // → '/en/product/clay-mug'
localePath('/product/clay-mug', 'zh')  // → '/product/clay-mug'
```

所有站内链接都用它包一层，否则英文页点进去会跳到中文页。

### 4.3 UI 文案

`src/lib/i18n.ts` 的 `ui` 对象，`zh` 和 `en` 两份：

```ts
export const ui = {
  zh: { addToCart: '加入购物车', inStock: '现货', ... },
  en: { addToCart: 'Add to cart', inStock: 'In stock', ... },
} as const
```

页面里 `const dict = ui[locale]`，然后 `dict.addToCart`。

**加新文案时两份都要加**，否则 TypeScript 的 `as const` 会报错（这也是好事，强制同步）。

### 4.4 灯带规格（product.ledStripSpec）

商品类型选「灯带」时有 12 个规格字段。它们**不是** `{ zh, en }` 双语对象——存的是型号、枚举、数字，只有标签和枚举文案需要本地化，映射集中在 `src/lib/ledStrip.ts`：

- `buildLedStripRows(spec, locale)` 返回 `{ label, value }[]`，顺序固定 12 项，缺失字段整行跳过，无 spec 返回 `[]`
- `ledType` 必须走 `magic → 幻彩/Magic`、`dotControl → 点控/Dot-control` 映射，不要直接输出枚举值
- `colorTemps` / `certifications` 是数组，聚合成一行（中文顿号、英文逗号）

`src/components/TechSpecs.astro` 只负责排版，判断全在 `ledStrip.ts`。GROQ 侧必须显式投影 `ledStripSpec{...}`——object 类型靠 `...` 扩散在字段改名时会静默丢数据。

---

## 五、图片处理

### 5.1 URL 生成

```ts
import { imgUrl } from '../lib/sanity'

imgUrl(image, { w: 800, h: 800 })   // 裁剪 + 转 webp
imgUrl(image, { w: 1200 })          // 只限宽，保持比例
```

内部固定 `auto('format').quality(78)`。`auto('format')` 让 Sanity 按浏览器 `Accept` 头返回 webp/avif。

实测同一张 1200×1200 JPEG：原图 28KB → `?w=800&auto=format` 且浏览器支持 webp 时 **6KB**。

### 5.2 srcset

列表和详情页都给多档宽度：

```astro
<img
  src={imgUrl(img, { w: 700, h: 700 })}
  srcset={[400, 700, 1000].map((w) => `${imgUrl(img, { w })} ${w}w`).join(', ')}
  sizes="(max-width:520px) 100vw, 33vw"
  alt={t(img.alt, locale) || t(product.title, locale)}
  width="700" height="700"
  loading="lazy" decoding="async"
/>
```

三个要点：

1. **`width` / `height` 必须写死**，否则图片加载会跳版（CLS 指标变差）
2. **`sizes` 要和 CSS 里实际的栅格宽度对上**，写错了浏览器会下载过大或过小的图
3. **`alt` 一定要有**，schema 里 alt 是必填的，但取不到时用标题兜底

详情页主图例外：不 lazy，加 `fetchpriority="high"`，因为它是 LCP 元素。

---

## 六、富文本渲染

`src/components/PortableText.astro`。传入 block 数组和 locale。

### 6.1 支持的块

| block `_type` | 渲染成 |
|---|---|
| `block` + `style: normal` | `<p>` |
| `block` + `style: h2` | `<h2>` |
| `block` + `style: h3` | `<h3>` |
| `block` + `style: blockquote` | `<blockquote>` |
| `block` + `listItem: bullet` | `<ul><li>` |
| `block` + `listItem: number` | `<ol><li>` |
| `imageWithAlt` | `<figure><img>` + 可选 `<figcaption>` |
| `videoEmbed` | 16:9 `<iframe>`（自动识别 YouTube / Bilibili / Vimeo） |
| `callout` | `<aside>`，三种 tone |

### 6.2 两个必须注意的实现细节

**① 连续列表项要聚合成一个列表**

Sanity 里每个列表项是一个独立的 `block`，带 `listItem: 'bullet'`。如果逐个渲染成 `<li>`，会得到一堆没有 `<ul>` 父元素的裸 `<li>` —— 非法 HTML，浏览器各自猜语义，缩进和序号都会乱。

`PortableText.astro` 里先把连续同类型列表项聚合成段落，再整体输出 `<ul>`/`<ol>`。改这个文件时别把这个聚合逻辑去掉。

**② 行内 marks 的顺序**

Sanity 的 `child.marks` 是混合的：`['strong', 'linkKey123']`。其中 `link` 要去 `block.markDefs` 里按 `_key` 找定义。

**必须先套完 decorator（strong/em/underline/…），最后再包 `<a>`。** 反过来的话，内层标签会覆盖掉链接。

`PortableText.astro` 的 frontmatter 里用字符串拼接生成 HTML（Astro frontmatter 不能写 JSX），再 `set:html` 输出。所有文本都经过 `esc()` 转义。

### 6.3 新增一种块类型

1. 在 Studio 仓库的 `schemaTypes/objects/blockContent.ts` 里加 `defineArrayMember`
2. `npx sanity deploy` 重新部署 Studio
3. 在 `PortableText.astro` 里加对应的 `if (block._type === 'xxx')` 分支

---

## 七、样式

### 7.1 全局变量

`src/layouts/Base.astro` 的 `<style is:global>` 顶部：

```css
:root {
  --ink:    #1a1a1a;   /* 主文字 */
  --muted:  #6b6b6b;   /* 次要文字 */
  --line:   #e5e5e5;   /* 分割线 */
  --bg:     #fdfdfb;   /* 背景 */
  --accent: #1a1a1a;   /* 按钮主色 */
}
```

改配色只改这里。

### 7.2 样式作用域

组件底部的 `<style>` 块默认是**作用域隔离**的，Astro 会自动加 `data-astro-cid-xxx` 属性。全局样式只在 `Base.astro` 里用 `is:global`。

需要在组件内穿透到子元素时用 `:global(...)`：

```css
:global(figure img) { width: 100%; }
```

### 7.3 响应式断点

统一的三个断点：

```css
@media (max-width: 900px) { ... }   /* 平板：4 列 → 2 列 */
@media (max-width: 700px) { ... }   /* 手机：横向排列 → 纵向 */
@media (max-width: 520px) { ... }   /* 小屏：单列 */
```

栅格在 `Base.astro` 里定义了 `.grid.cols-3` / `.grid.cols-4`，移动端自动降级。

---

## 八、SEO

### 8.1 每页必备

`Base.astro` 统一输出：

- `<title>` — 取 `seo.metaTitle`，回退到内容标题
- `<meta name="description">` — 取 `seo.metaDescription`，回退到摘要
- `<link rel="canonical">` — 绝对地址
- `<link rel="alternate" hreflang>` — 中英互指

### 8.2 canonical 域名

```js
// astro.config.mjs
const site =
  process.env.SITE_URL ||          // 显式指定，优先级最高
  process.env.URL ||               // Netlify 自动注入，绑自定义域名后自动变
  process.env.DEPLOY_PRIME_URL ||  // 预览部署
  'https://yichang-store.netlify.app'
```

绑域名后**不用改代码** —— Netlify 会把 `URL` 换成新域名。要提前固定就在 Netlify 后台加 `SITE_URL` 环境变量。

### 8.3 结构化数据

文章页输出 JSON-LD：

```astro
<Fragment slot="head">
  <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
</Fragment>
```

`jsonLd` 是 `BlogPosting` 类型，含 headline / description / datePublished / author / image。`Base.astro` 里有 `<slot name="head" />` 用来插这类页面级 head 标签。

### 8.4 sitemap

`@astrojs/sitemap` 自动生成 `sitemap-index.xml`，含 hreflang 标注。不用手动维护。

### 8.5 noIndex

Schema 里 `seo.noIndex` 为 true 时，页面输出 `<meta name="robots" content="noindex,nofollow">`。

---

## 九、构建与部署

### 9.1 输出模式

`output: 'static'`。所有页面在构建时预渲染成 HTML。

**没有任何 `<script src>`** —— 商品页、文章页都是纯 HTML，首屏不需要等 JS。实测 TTFB 1.6ms（本地静态服务），gzip 后首页 2.0K、商品页 2.9K、文章页 3.5K。

以后要加交互（购物车、筛选），用 Astro 的 island 单独挂载，不要整体切到 SSR。

### 9.2 配置

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22.23.4"

[[headers]]
  for = "/_astro/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

`_astro/` 下的文件名带 hash，所以可以永久缓存。

### 9.3 两条自动部署链路

```
① 改代码
   git push origin main
     → Netlify 检测到 push
     → npm ci && npm run build
     → 上线（约 1 分钟）

② 改内容
   Studio 点 Publish
     → Sanity webhook (netlify-rebuild)
     → Netlify Build Hook
     → 同上
```

两条都**不经过任何自有服务器**。

### 9.4 Netlify 构建环境的两个注意点

**① 不要在 Netlify 里设 `NODE_ENV=production`**

设了之后 `npm ci` 会跳过 `devDependencies`，TypeScript 之类的东西装不上。本地也是同理，如果环境里 `NODE_ENV=production`，用：

```bash
npm install --include=dev
```

**② Node 版本在 `netlify.toml` 里锁死**

`NODE_VERSION = "22.23.4"`。Netlify 默认版本可能不够 Astro 7 的要求。

### 9.5 部署失败怎么查

去 Netlify 项目的 deploys 页面，点红色那次看日志。

| 关键词 | 原因 |
|---|---|
| `Node.js vX is not supported by Astro` | `NODE_VERSION` 被改了 |
| `Unable to access repository` | Git 授权断了，重新 Link repository |
| `GROQ query parse error` | `queries.ts` 语法错，看报错指出的行 |
| `Cannot find module` | `package-lock.json` 没同步，本地 `npm install` 后提交 |

**回滚**：deploys 列表找上一个成功的，点 **Publish deploy**，30 秒生效。

### 9.6 紧急手动部署

见 `DEPLOY.md`。里面有恢复 API 直传脚本的步骤。

---

## 十、踩过的坑

按踩到的顺序记录，改相关代码前先读一遍。

### 1. Node 版本不够时 build 静默失败

`astro build` 打印 `Node.js vX is not supported by Astro` 然后 **exit code 0**。CI 里会被当成成功，实际什么都没产出。

→ 构建脚本里先 `node -v` 校验，或依赖 `netlify.toml` 的 `NODE_VERSION`。

### 2. `useCdn: true` 导致构建拿到旧数据

静态构建只查一次，CDN 缓存会导致刚发布的内容不在产物里。症状：Studio 里明明改了，网站没变。

→ `useCdn: false`。

### 3. 不要装 `@sanity/astro`

它是一个 Astro integration，会把整个 `sanity` 包（含 Studio、React）拉进前端依赖 —— 895MB。而我们是纯静态站，Studio 单独部署在 sanity.studio，前端只需要 `@sanity/client`（205MB）。

而且 `@sanity/astro@3.6.0` 的依赖链在新版 npm 上解析失败（找不到 `@sanity/cli@^8.27.0`）。

→ 直接用 `@sanity/client` + `@sanity/image-url`，不经过 integration。

### 4. 列表项被渲染成裸 `<li>`

Sanity 每个列表项是独立的 block。逐个渲染 `<li>` 会得到没有 `<ul>` 父元素的非法 HTML。浏览器渲染结果不可预测，缩进会乱。

→ `PortableText.astro` 里把连续 `listItem` 聚合成一个列表元素再输出。

### 5. 行内 marks 顺序错了会丢链接

先包 `<a>` 再套 `<strong>`，内层标签会覆盖掉链接。必须反过来。

→ 先套 decorator，最后包 `<a>`。

### 6. frontmatter 里不能写 JSX

Astro 的 `---` 之间是纯 TypeScript，写 `<div>` 会报 `PARSE_ERROR: Unterminated regular expression`。

→ frontmatter 里生成 HTML 字符串，模板里用 `<Fragment set:html={...} />`。注意手动转义。

### 7. `getStaticPaths` 忘了过滤 archived

下架商品的详情页仍会被预渲染，能通过 URL 直接访问。文章也一样，未来时间的文章会提前泄露。

→ 枚举 slug 时带上 `status != "archived"` 和 `publishedAt <= now()`。

### 8. GROQ 里没有 `order()` 函数

想取「最低价变体的划线价」，写 `variants[order(price asc)][0]` 会报 `Undefined function "order"`。

→ 用筛选代替排序：`variants[price == math::min(^.variants[].price)][0]`

### 9. `npx sanity dev` 和 `astro dev` 只监听 IPv6

日志说 `http://localhost:3333`，但 `curl 127.0.0.1:3333` 是 connection refused。`ss -ltnp` 会显示 `[::1]:3333`。

→ 用 `http://[::1]:PORT/` 或 `localhost` 访问。

### 10. 相对 import 深度容易数错

`pages/en/product/[slug].astro` 到 `src/views/` 是 `../../../views/`，不是 `../../`。错了报 `UNRESOLVED_IMPORT`。

→ 建新页面时对着表格抄，别凭感觉。

---

## 十一、代码风格约定

- **TypeScript strict**，`any` 只用在 Sanity 返回的富文本 / 图片对象上（它们的类型太啰嗦，性价比低）
- **组件 props 用 `interface Props`** 显式声明
- **CSS 用原生**，不引框架。样式写在使用处，作用域自动隔离
- **文案不进组件**，全部放 `i18n.ts`（双语必须同步）
- **查询不进页面**，全部放 `queries.ts`
- **提交信息用英文**，`feat:` / `fix:` / `docs:` / `chore:` 前缀

---

## 十二、速查

```bash
# 起本地开发
export PATH=/opt/node22/bin:$PATH
npm run dev

# 类型检查
node node_modules/typescript/bin/tsc --noEmit -p .

# 构建 + 本地预览
npm run build
npm run preview

# 发布（自动构建）
git add -A && git commit -m "..." && git push origin main
```

| 我想改… | 改哪个文件 |
|---|---|
| 导航 / 按钮文案 | `src/lib/i18n.ts` |
| 配色 / 全站字体 | `src/layouts/Base.astro` 的 `:root` |
| 首页 | `src/views/Home.astro` |
| 商品列表 | `src/views/Products.astro` |
| 商品详情 | `src/views/ProductDetail.astro` |
| 文章列表 | `src/views/Posts.astro` |
| 文章详情 | `src/views/PostDetail.astro` |
| 富文本渲染 | `src/components/PortableText.astro` |
| 查询字段 | `src/lib/queries.ts` |
| 图片尺寸 / 价格格式 | `src/lib/sanity.ts` |
| canonical 域名 | `astro.config.mjs` 或 Netlify 环境变量 |
| 加新页面 | `src/pages/` + 对应 `src/views/` |
| 加新字段 | 先改 schema（Studio 仓库）→ 再改 `queries.ts` → 再改 view |
