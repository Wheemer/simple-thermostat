type Input = number | null | undefined | boolean | string
type LocaleOptions = {
  language?: string
  number_format?: string
}
type Options = {
  decimals?: number
  fallback?: string
  locale?: LocaleOptions
}

const MAX_DECIMALS = 100

function normalizeDecimals(value: unknown) {
  if (value === null || value === '' || typeof value === 'boolean') return 1
  const decimals = Number(value)
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= MAX_DECIMALS
    ? decimals
    : 1
}

function numberFormatToLocale({
  language,
  number_format,
}: LocaleOptions): string | string[] | undefined {
  switch (number_format) {
    case 'comma_decimal':
      return ['en-US', 'en']
    case 'decimal_comma':
      return ['de', 'es', 'it']
    case 'space_comma':
      return ['fr', 'sv', 'cs']
    case 'quote_decimal':
      return ['de-CH']
    case 'system':
      return undefined
    default:
      return language
  }
}

function formatNumber(
  number: Input,
  { decimals = 1, fallback = 'N/A', locale }: Options = {}
): string {
  const type = typeof number
  if (
    number === null ||
    number === '' ||
    ['boolean', 'undefined'].includes(type)
  ) {
    return fallback
  }

  const value = Number(number)
  if (Number.isNaN(value)) return fallback
  const precision = normalizeDecimals(decimals)

  if (!locale) {
    return value.toFixed(precision)
  }

  try {
    return new Intl.NumberFormat(
      locale.number_format === 'none' ? 'en-US' : numberFormatToLocale(locale),
      {
        useGrouping: locale.number_format !== 'none',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }
    ).format(value)
  } catch {
    return value.toFixed(precision)
  }
}

export default formatNumber
