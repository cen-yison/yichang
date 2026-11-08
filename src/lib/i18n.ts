/**
 * 双语取值。en 为空时回退中文 —— 英文站不至于出现空白标题。
 */
export type Locale = 'zh' | 'en'

export type Localized = { zh?: string | null; en?: string | null } | null | undefined

export const t = (field: Localized, locale: Locale = 'zh'): string => {
  if (!field) return ''
  const primary = field[locale]
  if (primary && primary.trim()) return primary
  return field.zh ?? field.en ?? ''
}

/** 从 URL 前缀判断语言：/en/... → en，其余 → zh */
export const localeFromPath = (pathname: string): Locale =>
  /^\/en(\/|$)/.test(pathname) ? 'en' : 'zh'

/** 生成带语言前缀的链接：/en/product/xxx 或 /product/xxx */
export const localePath = (path: string, locale: Locale): string => {
  const clean = path.startsWith('/') ? path : `/${path}`
  return locale === 'en' ? `/en${clean}` : clean
}

export const ui = {
  zh: {
    siteName: 'Yi Chang',
    nav: { home: '首页', products: '商品', posts: '文章' },
    addToCart: '加入购物车',
    inStock: '现货',
    preorder: '预售',
    soldOut: '售罄',
    archived: '下架',
    from: '起',
    variants: '个规格',
    specs: '参数',
    techSpecs: '技术参数',
    shipping: '配送',
    related: '相关商品',
    readMore: '阅读全文',
    noProducts: '暂无商品',
    noPosts: '暂无文章',
    currency: '$',
  },
  en: {
    siteName: 'Yi Chang',
    nav: { home: 'Home', products: 'Products', posts: 'Journal' },
    addToCart: 'Add to cart',
    inStock: 'In stock',
    preorder: 'Pre-order',
    soldOut: 'Sold out',
    archived: 'Archived',
    from: 'from',
    variants: 'variants',
    specs: 'Specs',
    techSpecs: 'Technical specifications',
    shipping: 'Shipping',
    related: 'You may also like',
    readMore: 'Read more',
    noProducts: 'No products yet',
    noPosts: 'No posts yet',
    currency: '$',
  },
} as const
