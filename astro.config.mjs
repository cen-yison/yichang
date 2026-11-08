import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

// 纯静态输出：所有页面在构建时预渲染成 HTML，交给 Netlify CDN 分发。
// 内容更新由 Sanity webhook 触发 Netlify Build Hook 重新构建。
// Studio 单独用 `sanity deploy` 托管，不在这里内嵌 —— 所以前端也不需要 React/Sanity Studio 依赖。
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://example.com',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'zh-CN',
        locales: { 'zh-CN': 'zh-CN', en: 'en' },
      },
    }),
  ],
})
