import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'

const projectId = 'vk38187i'
const dataset = 'production'

/**
 * 直接连 Sanity，不经过 @sanity/astro。
 * 纯静态站只在构建时查询，用不到 Studio / 可视化编辑那套浏览器端代码。
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  // 构建时必须读到最新内容：走 CDN 会拿到分钟级旧缓存，导致刚发布的商品不出现
  useCdn: false,
  perspective: 'published',
})

const builder = createImageUrlBuilder({ projectId, dataset })

/**
 * 图片 URL 生成。auto('format') 让 Sanity 按 Accept 头返回 webp/avif，
 * 质量压到 78 —— 实测比原图小一个数量级，肉眼看不出差别。
 */
export const imgUrl = (
  source: any,
  opts: { w?: number; h?: number; fit?: 'crop' | 'max' | 'clip'; q?: number } = {},
): string => {
  if (!source?.asset) return ''
  let b = builder.image(source).auto('format').quality(opts.q ?? 78)
  if (opts.w) b = b.width(opts.w)
  if (opts.h) b = b.height(opts.h)
  if (opts.fit) b = b.fit(opts.fit)
  return b.url()
}

/** 生成 srcset 字符串，给 <img srcset> 用 */
export const srcset = (source: any, widths: number[] = [400, 800, 1200, 1600]): string =>
  widths.map((w) => `${imgUrl(source, { w })} ${w}w`).join(', ')

export const formatPrice = (amount: number | null | undefined, currency = 'USD'): string => {
  if (typeof amount !== 'number') return '—'
  const symbol =
    currency === 'USD' ? '$' : currency === 'HKD' ? 'HK$' : currency === 'EUR' ? '€' : '¥'
  // 美元区用英文千分位，人民币用中文，避免 $1,234.50 被格式化成 $1,234.5
  const locale = currency === 'CNY' ? 'zh-CN' : 'en-US'
  return `${symbol}${amount.toLocaleString(locale, { maximumFractionDigits: 2 })}`
}

export const minVariantPrice = (variants: any[] | null | undefined): number | null => {
  if (!variants?.length) return null
  const prices = variants.map((v) => v?.price).filter((p): p is number => typeof p === 'number')
  return prices.length ? Math.min(...prices) : null
}

export const totalStock = (variants: any[] | null | undefined): number =>
  (variants ?? []).reduce((sum, v) => sum + (typeof v?.stock === 'number' ? v.stock : 0), 0)
