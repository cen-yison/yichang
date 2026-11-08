import { client, imgUrl, minVariantPrice, totalStock } from './sanity'

/** 列表页只取必要字段 —— 正文块不查，省带宽 */
const PRODUCT_CARD = /* groq */ `
  _id,
  title,
  slug,
  shortDescription,
  "image": images[0],
  hasVariants,
  price,
  compareAtPrice,
  currency,
  status,
  featured,
  "minPrice": math::min(variants[].price),
  "stockSum": math::sum(variants[].stock),
  "variantCount": count(variants),
  "category": category->{ title, slug }
`

export type ProductCard = {
  _id: string
  title: { zh?: string; en?: string }
  slug: { current: string }
  shortDescription?: { zh?: string; en?: string }
  image?: any
  hasVariants?: boolean
  price?: number
  compareAtPrice?: number
  currency?: string
  status?: string
  featured?: boolean
  minPrice?: number | null
  stockSum?: number
  variantCount?: number
  category?: { title: { zh?: string; en?: string }; slug: { current: string } } | null
}

export async function getProducts(): Promise<ProductCard[]> {
  return client.fetch(
    `*[_type == "product" && status != "archived"] | order(featured desc, _createdAt desc) {${PRODUCT_CARD}}`,
  )
}

export async function getFeaturedProducts(limit = 4): Promise<ProductCard[]> {
  return client.fetch(
    `*[_type == "product" && status != "archived" && featured == true] | order(_createdAt desc) [0...$limit] {${PRODUCT_CARD}}`,
    { limit },
  )
}

/** 详情页：一次查完商品 + 变体 + 分类 + 相关商品，避免瀑布式请求 */
export async function getProductBySlug(slug: string) {
  return client.fetch(
    `*[_type == "product" && slug.current == $slug][0]{
      ...,
      // 灯带规格是 object，显式投影 12 个字段：靠 "..." 扩散容易在字段改名时静默丢数据
      productFamily,
      ledStripSpec{
        chipModel,
        ledType,
        ledsPerMeter,
        voltage,
        powerPerMeter,
        maxRunMeters,
        colorTemps,
        cri,
        ipRating,
        boardWidthMm,
        cutLengthMm,
        certifications
      },
      "image": images[0],
      "minPrice": math::min(variants[].price),
      "stockSum": math::sum(variants[].stock),
      "compareAt": coalesce(compareAtPrice, variants[price == math::min(^.variants[].price)][0].compareAtPrice),
      "category": category->{ title, slug },
      "related": *[_type == "product" && status != "archived" && _id != ^._id
                   && category._ref == ^.category._ref] | order(_createdAt desc) [0...3] {${PRODUCT_CARD}}
    }`,
    { slug },
  )
}

export async function getAllProductSlugs(): Promise<string[]> {
  // 必须排除 archived，否则下架商品仍然会被预渲染出一个可访问的详情页
  const rows = await client.fetch(
    `*[_type == "product" && status != "archived" && defined(slug.current)].slug.current`,
  )
  return rows ?? []
}

/* ---------------- 文章 ---------------- */

const POST_CARD = /* groq */ `
  _id,
  title,
  slug,
  excerpt,
  "image": coverImage,
  publishedAt,
  featured,
  readingMinutes,
  tags,
  "category": category->{ title, slug },
  "author": author->{ name, "avatar": avatar }
`

export type PostCard = {
  _id: string
  title: { zh?: string; en?: string }
  slug: { current: string }
  excerpt?: { zh?: string; en?: string }
  image?: any
  publishedAt: string
  featured?: boolean
  readingMinutes?: number
  tags?: string[]
  category?: { title: { zh?: string; en?: string }; slug: { current: string } } | null
  author?: { name: string; avatar?: any } | null
}

export async function getPosts(): Promise<PostCard[]> {
  return client.fetch(
    `*[_type == "post" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {${POST_CARD}}`,
  )
}

export async function getFeaturedPosts(limit = 3): Promise<PostCard[]> {
  return client.fetch(
    `*[_type == "post" && defined(publishedAt) && publishedAt <= now() && featured == true]
      | order(publishedAt desc) [0...$limit] {${POST_CARD}}`,
    { limit },
  )
}

export async function getPostBySlug(slug: string) {
  return client.fetch(
    `*[_type == "post" && slug.current == $slug][0]{
      ...,
      "image": coverImage,
      "category": category->{ title, slug },
      "author": author->{ name, "avatar": avatar, role, bio },
      "related": *[_type == "post" && _id != ^._id && publishedAt <= now()
                   && (category._ref == ^.category._ref || count((tags[])[@ in ^.tags]) > 0)]
                   | order(publishedAt desc) [0...3] {${POST_CARD}}
    }`,
    { slug },
  )
}

export async function getAllPostSlugs(): Promise<string[]> {
  // 只构建已到发布时间的文章；设为未来时间的文章不预渲染，到点后下次构建才出现
  const rows = await client.fetch(
    `*[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()].slug.current`,
  )
  return rows ?? []
}

export { minVariantPrice, totalStock, imgUrl }
