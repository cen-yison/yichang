# 前端维护手册

Yi Chang 独立站前端。Astro 静态站 + Sanity 内容后端 + Netlify 托管 + GitHub 版本管理。

---

## 一、入口汇总

日常只会用到这五个地址。全部存书签即可。

| 用途 | 地址 | 说明 |
|---|---|---|
| **官网** | https://yichang-store.netlify.app | 线上站点，用户看到的 |
| **内容后台** | https://yichang.sanity.studio/ | 写文章、加商品。**日常 90% 的操作在这里** |
| **部署后台** | https://app.netlify.com/projects/yichang-store | 看构建日志、回滚版本、绑域名 |
| **代码仓库** | https://github.com/cen-yison/yichang | 改代码、看历史 |
| **Sanity 项目** | https://www.sanity.io/manage/project/vk38187i | 数据集设置、CORS、token 管理 |

### 需要记住的三个 ID

| 名称 | 值 | 在哪用 |
|---|---|---|
| Sanity projectId | `vk38187i` | 代码里，不要改 |
| Sanity dataset | `production` | 代码里，不要改 |
| Netlify Site ID | `e8d67507-e985-4c15-827e-cf31377b2318` | 只在应急脚本里用 |

---

## 二、日常维护：发布内容

### 2.1 登录内容后台

打开 https://yichang.sanity.studio/ ，用 Google / GitHub / 邮箱登录（和创建 Sanity 账号时用的方式一致）。

左侧菜单有四个入口：

```
📄 文章 post      写博客、产品故事
🛍 商品 product    上架商品
🏷 分类 category   文章分类 / 商品分类（用「用途」字段区分）
👤 作者 author     作者信息
```

### 2.2 发一篇文章

1. 左侧点 **文章** → 右上角 **Create new**
2. 填写：

| 字段 | 必填 | 说明 |
|---|---|---|
| 标题 | ✅ | 中文必填，英文可空（英文站会回退显示中文） |
| Slug | ✅ | URL 地址。点右侧 Generate 从标题生成 |
| 摘要 | — | 列表页和搜索结果里显示，建议 80–120 字 |
| 封面图 | — | 点上传。**alt 文本必填**，否则保存报错 |
| 正文 | — | 富文本。支持 h2/h3、引用、列表、图片、视频、提示框 |
| 分类 | — | 下拉选，只显示「用途=文章分类」的项 |
| 标签 | — | 输入后回车，多个 |
| 作者 | — | 下拉选 |
| 发布时间 | ✅ | 默认当前时间。**设成未来时间 = 定时发布**，时间到之前前端不显示 |
| 首页推荐 | — | 打开后出现在首页文章区 |
| 阅读时长 | — | 手填，留空则前端不显示这一行 |
| 相关文章 | — | 最多 4 篇，留空则前端自动按同分类/同标签推荐 |
| SEO | — | 留空会自动回退到标题和摘要，一般不用填 |

3. 点右上角 **Publish** 发布
4. **等 1 分钟左右**，网站自动更新

### 2.3 上架一个商品

1. 左侧点 **商品** → **Create new**
2. 分成四个折叠区，从上往下填：

**基本信息**
| 字段 | 必填 | 说明 |
|---|---|---|
| 商品名 | ✅ | 中英双语 |
| Slug | ✅ | URL |
| 主 SKU | — | 有变体时作前缀用 |
| 卖点一句话 | — | 商品卡片上显示，30–60 字 |
| 分类 | — | 只显示「用途=商品分类」的项 |
| 标签 / 首页推荐 | — | |

**价格与库存**

先决定这个商品**有没有多规格**：

- **单规格**（一件商品一个价）：`启用多规格` 关着，直接填售价、划线原价、库存
- **多规格**（颜色/尺码/容量组合）：打开 `启用多规格`，上面的售价/库存字段会自动隐藏，改为填下面两块：

  > **规格选项**：先定义有哪些维度。比如「颜色」→ 米白 / 炭灰。每个可选值要填「显示值」（用户看到的）和「内部编码」（`cream`，用于生成 SKU，只能是英文数字）
  >
  > **变体列表**：为每个组合建一条，填 SKU、变体名、售价、划线价、库存、变体图

⚠️ **变体 SKU 不能重复**，重复会被拦下。
⚠️ 单规格商品的价格币种默认 **USD**，售价填 `28` 就显示 `$28`，不要填 `2800`。

销售状态四选一：现货 / 预售 / 售罄 / 下架。
- 选「下架」→ 前端**完全不显示**这个商品
- 选「预售」→ 会多出一个「预售说明」字段

**图片与详情**
| 字段 | 说明 |
|---|---|
| 商品图 | 第一张是主图。建议至少 3 张，比例统一 1:1 或 4:5，最多 12 张。**每张的 alt 必填** |
| 商品详情 | 富文本，和文章正文同一套编辑器 |
| 参数表 | 键值对，前端渲染成表格（容量 / 350ml） |
| 运费/发货说明 | 前端显示在「配送」区块 |

3. 点 **Publish**
4. 等 1 分钟

### 2.4 改已有内容

左侧列表点进去，改完点 **Publish**。**只保存不发布（Save）不会上线** —— 草稿态对前端不可见。

### 2.5 删除

打开文档 → 右上角 `⋮` → Delete。等 1 分钟，前端相关页面消失。

> 如果商品被文章或别的商品引用着，删掉后会留下空引用。前端已有兜底（不显示空块），不会报错。

### 2.6 发布后没更新？排查顺序

| 检查 | 怎么做 |
|---|---|
| ① 真的点 Publish 了吗 | Studio 里文档右上角应显示 **Published**，不是 **Draft** |
| ② 等够时间了吗 | 链路是 webhook → Netlify 构建 → CDN，正常 40–90 秒。高峰期可能 2 分钟 |
| ③ 构建失败了吗 | 去 https://app.netlify.com/projects/yichang-store/deploys 看最新一次是不是红色 Failed，点进去看日志 |
| ④ 浏览器缓存 | 强制刷新 `Ctrl+Shift+R` / `Cmd+Shift+R` |
| ⑤ 发布时间设到未来了 | 回 Studio 检查 `发布时间` 字段 |

---

## 三、发布链路是怎么跑的

理解这条链路，出问题才知道去哪个后台看。

```
┌──────────────────┐
│ 你在 Studio 编辑  │
│ 点 Publish       │
└────────┬─────────┘
         │ 内容写入 Sanity 数据集
         ▼
┌──────────────────┐
│ Sanity webhook   │  document create/update/delete
│ netlify-rebuild  │  排除 drafts.*
└────────┬─────────┘
         │ POST
         ▼
┌──────────────────┐
│ Netlify Build    │  https://api.netlify.com/build_hooks/6aeffde6baa9f46ec4bfd57b
│ Hook             │
└────────┬─────────┘
         │ 拉取 GitHub 仓库 cen-yison/yichang main 分支
         ▼
┌──────────────────┐
│ Netlify 构建容器  │  npm ci && npm run build
│ Node 22.23.4     │  产出 dist/
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Netlify CDN      │  全球分发，用户访问
└──────────────────┘
```

**关键点：整个过程不经过任何自有服务器。** 你现在这台机器关机、断网、重装，网站照常更新。

### 代码更新也一样

```
本地改代码 → git push main → Netlify 自动构建 → 上线
```

### 两条链路的关系

- 改**内容** → webhook 触发
- 改**代码** → push 触发
- 两者互不冲突。如果同时发生，Netlify 会按顺序排队，最后完成的版本生效

---

## 四、代码维护

### 4.1 目录结构

```
yichang/
├── src/
│   ├── pages/            ← 路由。每个文件对应一个 URL
│   │   ├── index.astro                   /
│   │   ├── products/index.astro           /products/
│   │   ├── product/[slug].astro           /product/xxx/ （构建时枚举所有商品）
│   │   ├── posts/index.astro              /posts/
│   │   ├── posts/[slug].astro             /posts/xxx/
│   │   └── en/…                          所有英文路由，结构和上面完全对应
│   │
│   ├── views/            ← 页面真正的实现。中英文共用同一份
│   │   ├── Home.astro
│   │   ├── Products.astro
│   │   ├── ProductDetail.astro
│   │   ├── Posts.astro
│   │   └── PostDetail.astro
│   │
│   ├── layouts/
│   │   └── Base.astro    ← 全站骨架：<head>、导航、页脚、全局 CSS
│   │
│   ├── components/
│   │   └── PortableText.astro  ← 富文本渲染器
│   │
│   └── lib/
│       ├── sanity.ts     ← Sanity 客户端、图片 URL、价格格式化
│       ├── queries.ts    ← 所有 GROQ 查询
│       └── i18n.ts       ← 双语取值、UI 文案表
│
├── netlify.toml          ← 构建配置、缓存头、安全头
├── astro.config.mjs      ← Astro 配置、sitemap、canonical 域名
├── package.json
├── README.md
└── DEPLOY.md             ← 应急手动部署说明
```

**为什么要 `pages` + `views` 两层？** 因为中英文是两套 URL、一套模板。`pages` 只是三行的薄壳（import view 然后渲染），真正逻辑在 `views` 里，改一次两边都生效，不会漂移。

### 4.2 本地开发

需要 **Node ≥ 22.23.4**（Astro 7 硬要求，低了会静默失败）。

```bash
git clone https://github.com/cen-yison/yichang.git
cd yichang
npm install
npm run dev      # http://localhost:4321
```

改代码后浏览器自动刷新。改 Sanity 里的内容，刷新页面也能看到（开发时 `useCdn: false`，不走缓存）。

```bash
npm run build    # 构建到 dist/，线上就是这个产物
npm run preview  # 本地预览构建结果
```

### 4.3 常见改动

**改导航文字 / 按钮文案**

`src/lib/i18n.ts` 里的 `ui` 对象，`zh` 和 `en` 两份都要改。

```ts
export const ui = {
  zh: { addToCart: '加入购物车', ... },
  en: { addToCart: 'Add to cart', ... },
}
```

**改全站样式**

`src/layouts/Base.astro` 里的 `<style is:global>`。设计变量在顶部：

```css
:root {
  --ink: #1a1a1a;     /* 主文字色 */
  --muted: #6b6b6b;   /* 次要文字 */
  --line: #e5e5e5;    /* 分割线 */
  --bg: #fdfdfb;      /* 背景 */
  --accent: #1a1a1a;  /* 按钮主色 */
}
```

**改某个页面的布局**

改 `src/views/` 里对应的文件。页面级样式写在该文件底部的 `<style>` 块（Astro 会自动作用域隔离，不会影响其他页面）。

**加一个新字段并显示出来**

1. 在 `/root/sanity-studio/schemaTypes/` 里改 schema，然后 `npx sanity deploy` 重新部署 Studio
2. 在 `src/lib/queries.ts` 对应查询里加上字段名
3. 在 `src/views/` 对应页面里渲染它

**加一个新页面**

在 `src/pages/` 下建文件。要做英文版就在 `src/pages/en/` 下建同样的路径。

**改 canonical 域名（绑域名之后）**

不用改代码。Netlify 会自动注入 `URL` 环境变量，`astro.config.mjs` 优先读 `SITE_URL`，其次 `URL`。绑好域名后 Netlify 会自动把 `URL` 变成新域名。

如果要在域名生效前就固定 canonical，去 Netlify 后台加环境变量 `SITE_URL=https://你的域名`。

### 4.4 提交代码

```bash
git add -A
git commit -m "描述你改了什么"
git push origin main
```

推上去后 Netlify 自动构建，约 1 分钟上线。

**不需要在本机手动部署。**

---

## 五、故障处理

### 5.1 构建失败

去 https://app.netlify.com/projects/yichang-store/deploys ，点最新一次红色的部署，看日志。

常见原因：

| 日志关键词 | 原因 | 处理 |
|---|---|---|
| `Node.js vX is not supported by Astro` | Node 版本不够 | 检查 `netlify.toml` 里 `NODE_VERSION = "22.23.4"` 是否还在 |
| `Unable to access repository` | Git 连接断了 | 去 Project configuration → Developer settings → Continuous deployment 重新授权 |
| `GROQ query parse error` | 查询写错了 | 是 `queries.ts` 的语法问题，需要改代码 |
| `Cannot find module` | `package.json` 和 `package-lock.json` 不同步 | 本地跑 `npm install` 后提交 `package-lock.json` |

**回滚**：deploys 列表里找上一个成功的部署，点 **Publish deploy**，30 秒生效。

### 5.2 网页 404

| 情况 | 原因 |
|---|---|
| 首页 404 | 部署失败，去 Netlify 看日志 |
| 某个商品页 404 | 该商品状态是「下架」，或 slug 改了但旧链接还在 |
| 英文页 404 | `src/pages/en/` 下缺少对应文件 |

### 5.3 内容改了但网站不变

按「2.6 发布后没更新」的顺序排查。

如果 Netlify 那边根本没收到构建请求，检查 Sanity webhook 是否还在：
https://www.sanity.io/manage/project/vk38187i/api/webhooks

应该有 `netlify-rebuild`，状态 enabled，指向 `https://api.netlify.com/build_hooks/6aeffde6baa9f46ec4bfd57b`。

### 5.4 图片不显示

- **Studio 里能看到图，网页上没有** → 检查该图片的 alt 是否为空（alt 必填，为空会导致校验失败）
- **图片裂开** → 打开浏览器控制台看 `cdn.sanity.io` 的请求状态码。403 说明数据集权限变了

### 5.5 需要紧急发布（Netlify Git 集成故障）

见 `DEPLOY.md`。里面有恢复手动 API 部署的完整步骤。

---

## 六、安全与凭据

### 6.1 绝对不要做的事

- ❌ 不要把任何 token 写进代码、提交到 Git
- ❌ 不要把 Sanity write token 放进前端（前端只用匿名读）
- ❌ 不要在聊天工具、文档里明文贴 token

### 6.2 现有凭据分布

| 凭据 | 存在哪 | 谁能拿到 |
|---|---|---|
| Sanity Studio 登录态 | 浏览器 cookie | 只有你 |
| Sanity write token | — | **不需要长期存在**。Studio 不依赖它 |
| Netlify 账号 | 浏览器登录态 | 只有你 |
| GitHub 账号 | 浏览器登录态 | 只有你 |
| Netlify PAT | **已吊销** | — |

**现在没有任何长期有效的 API token 存在任何地方。** 这是最安全的状态。

### 6.3 前端读数据不需要 token

Sanity 数据集 `production` 的 ACL 是 `public`，任何人可以匿名**读**。

写入只能通过 Studio 的登录态。所以：
- 如果有人抄走前端代码，也拿不到后台
- 前端能读到的数据，本来就是公开内容

### 6.4 历史遗留

Git 历史里有两个旧提交曾经包含一个 Netlify PAT（提交 `530720a`、`2681669`）。该 token 已于 2026-11-08 吊销，无法再使用。

不需要改写历史 —— token 已失效，force push 的风险大于收益。

---

## 七、快速参考

| 我想… | 去哪 |
|---|---|
| 发文章 | https://yichang.sanity.studio/ → 文章 |
| 上架商品 | https://yichang.sanity.studio/ → 商品 |
| 看网站 | https://yichang-store.netlify.app |
| 看部署失败原因 | https://app.netlify.com/projects/yichang-store/deploys |
| 回滚到旧版本 | 同上，找绿色部署点 Publish deploy |
| 改代码 | `git push origin main` |
| 绑域名 | Netlify → Domain management |
| 改字段结构 | 改 `schemaTypes/` → `npx sanity deploy` |
| 紧急手动部署 | 见 `DEPLOY.md` |
