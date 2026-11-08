/**
 * 灯带规格（product.ledStripSpec）→ 详情页「技术参数」表的数据行。
 *
 * 契约来自后端：12 个字段，顺序固定，只出现在 productFamily === 'ledStrip'。
 * 三条硬规则写在这里，页面不用再判断：
 *   1. 缺失字段整行跳过（没有 ledStripSpec 就返回空数组，老商品不受影响）
 *   2. colorTemps / certifications 是数组，聚合成一行（顿号 / 逗号）
 *   3. ledType 枚举值映射成中文「幻彩 / 点控」、英文 Magic / Dot-control，
 *      绝不把 magic / dotControl 原样打到页面上
 */
import type { Locale } from './i18n'

export type LedStripSpec = {
  chipModel?: string | null
  ledType?: string | null
  ledsPerMeter?: number | null
  voltage?: string | null
  powerPerMeter?: number | null
  maxRunMeters?: number | null
  colorTemps?: string[] | null
  cri?: number | null
  ipRating?: string | null
  boardWidthMm?: number | null
  cutLengthMm?: number | null
  certifications?: string[] | null
}

export type SpecRow = { label: string; value: string }

/** ledType 枚举 → 展示文案 */
const LED_TYPE: Record<string, Record<Locale, string>> = {
  magic: { zh: '幻彩', en: 'Magic' },
  dotControl: { zh: '点控', en: 'Dot-control' },
}

/** 每一行的标签文案（英文站必须有英文，不回退中文） */
const LABELS = {
  chipModel: { zh: '灯珠型号', en: 'Chip model' },
  ledType: { zh: '类型', en: 'Type' },
  ledsPerMeter: { zh: '灯带密度', en: 'LED density' },
  voltage: { zh: '电压', en: 'Voltage' },
  powerPerMeter: { zh: '功率', en: 'Power' },
  maxRunMeters: { zh: '最大连接长度', en: 'Max run length' },
  colorTemps: { zh: '颜色（色温）', en: 'Color / CCT' },
  cri: { zh: '显色指数', en: 'Color rendering' },
  ipRating: { zh: '防水等级', en: 'IP rating' },
  boardWidthMm: { zh: '板宽', en: 'Board width' },
  cutLengthMm: { zh: '剪切长度', en: 'Cut length' },
  certifications: { zh: '认证', en: 'Certifications' },
} as const

/** 值是否是「有内容」—— 0 和空字符串要区分开，所以不能只写 if (v) */
const present = (v: unknown): boolean => {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (typeof v === 'number') return Number.isFinite(v)
  if (Array.isArray(v)) return v.filter((i) => itemText(i) !== '').length > 0
  return true
}

const itemText = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : v === null || v === undefined ? '' : String(v)

/** 数字展示：整数不带小数，4.8 保持 4.8，最多两位小数 */
const num = (v: number): string =>
  String(Number.isInteger(v) ? v : Number(v.toFixed(2)))

/** DC12V → DC 12V，AC220V → AC 220V；其他原样 */
const volt = (v: string): string => v.trim().replace(/^(DC|AC)\s*(?=\d)/i, (m) => `${m.toUpperCase()} `)

/** 数组字段聚合成一行：中文顿号，英文逗号 */
const join = (arr: unknown[], locale: Locale): string => {
  const sep = locale === 'zh' ? '、' : ', '
  return arr
    .map((i) => itemText(i))
    .filter((s) => s !== '')
    .join(sep)
}

export const buildLedStripRows = (spec: LedStripSpec | null | undefined, locale: Locale = 'zh'): SpecRow[] => {
  if (!spec) return []

  const rows: (SpecRow | null)[] = [
    // 1 灯珠型号
    present(spec.chipModel)
      ? { label: LABELS.chipModel[locale], value: itemText(spec.chipModel) }
      : null,
    // 2 类型（枚举 → 文案）
    present(spec.ledType)
      ? {
          label: LABELS.ledType[locale],
          value: LED_TYPE[itemText(spec.ledType)]?.[locale] ?? itemText(spec.ledType),
        }
      : null,
    // 3 灯带密度
    present(spec.ledsPerMeter)
      ? {
          label: LABELS.ledsPerMeter[locale],
          value: locale === 'zh'
            ? `${num(spec.ledsPerMeter as number)} 珠/米`
            : `${num(spec.ledsPerMeter as number)} LEDs/m`,
        }
      : null,
    // 4 电压
    present(spec.voltage)
      ? { label: LABELS.voltage[locale], value: volt(itemText(spec.voltage)) }
      : null,
    // 5 功率
    present(spec.powerPerMeter)
      ? {
          label: LABELS.powerPerMeter[locale],
          value: locale === 'zh'
            ? `${num(spec.powerPerMeter as number)} W/米`
            : `${num(spec.powerPerMeter as number)} W/m`,
        }
      : null,
    // 6 最大连接长度
    present(spec.maxRunMeters)
      ? {
          label: LABELS.maxRunMeters[locale],
          value: `${num(spec.maxRunMeters as number)} ${locale === 'zh' ? '米' : 'm'}`,
        }
      : null,
    // 7 颜色（色温）—— 数组聚合成一行
    present(spec.colorTemps)
      ? { label: LABELS.colorTemps[locale], value: join(spec.colorTemps as unknown[], locale) }
      : null,
    // 8 显指
    present(spec.cri)
      ? { label: LABELS.cri[locale], value: `Ra ${num(spec.cri as number)}` }
      : null,
    // 9 防水等级
    present(spec.ipRating)
      ? { label: LABELS.ipRating[locale], value: itemText(spec.ipRating).toUpperCase() }
      : null,
    // 10 板宽
    present(spec.boardWidthMm)
      ? {
          label: LABELS.boardWidthMm[locale],
          value: `${num(spec.boardWidthMm as number)} mm`,
        }
      : null,
    // 11 剪切长度
    present(spec.cutLengthMm)
      ? {
          label: LABELS.cutLengthMm[locale],
          value: `${num(spec.cutLengthMm as number)} mm`,
        }
      : null,
    // 12 认证 —— 数组聚合成一行
    present(spec.certifications)
      ? {
          label: LABELS.certifications[locale],
          value: join(spec.certifications as unknown[], locale),
        }
      : null,
  ]

  return rows.filter((r): r is SpecRow => r !== null)
}
