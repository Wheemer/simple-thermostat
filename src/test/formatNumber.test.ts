import formatNumber from '../formatNumber'

test('formatNumber with valid numbers', () => {
  expect(formatNumber(10)).toBe('10.0')
  expect(formatNumber('10')).toBe('10.0')
  expect(formatNumber(10, { decimals: 0 })).toBe('10')
  expect(formatNumber('10.4', { decimals: 0 })).toBe('10')
  expect(formatNumber(10.6, { decimals: 0 })).toBe('11')
  expect(formatNumber(10.6, { decimals: 1 })).toBe('10.6')
})

test('formatNumber with invalid numbers', () => {
  ;[null, false, true, '', undefined].forEach((input) => {
    expect(formatNumber(input)).toBe('N/A')
  })
})

test('formatNumber with multiple decimals', () => {
  expect(formatNumber(1.23, { decimals: 2 })).toBe('1.23')
  expect(formatNumber(1.2, { decimals: 2 })).toBe('1.20')
  expect(formatNumber(1.23, { decimals: 1 })).toBe('1.2')
})

test.each([
  ['comma_decimal', ['en-US', 'en']],
  ['decimal_comma', ['de', 'es', 'it']],
  ['space_comma', ['fr', 'sv', 'cs']],
  ['quote_decimal', ['de-CH']],
] as const)(
  'uses the Home Assistant %s number format',
  (number_format, locale) => {
    const expected = new Intl.NumberFormat([...locale], {
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1234.5)

    expect(
      formatNumber(1234.5, {
        decimals: 2,
        locale: { language: 'en', number_format },
      })
    ).toBe(expected)
  }
)

test('uses the system locale when requested', () => {
  const expected = new Intl.NumberFormat(undefined, {
    useGrouping: true,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(1234.5)

  expect(
    formatNumber(1234.5, {
      decimals: 1,
      locale: { language: 'not-used', number_format: 'system' },
    })
  ).toBe(expected)
})

test('none keeps decimals but disables grouping', () => {
  expect(
    formatNumber(1234.5, {
      decimals: 2,
      locale: { language: 'de', number_format: 'none' },
    })
  ).toBe('1234.50')
})

test('malformed language tags safely fall back to fixed decimals', () => {
  expect(
    formatNumber(1234.5, {
      decimals: 2,
      locale: { language: 'not_a_locale' },
    })
  ).toBe('1234.50')
})

test.each([-1, 101, 1.5, null, '', false])(
  'invalid decimal precision %p falls back safely',
  (decimals) => {
    expect(formatNumber(12.345, { decimals } as any)).toBe('12.3')
  }
)

test('supports the full precision range accepted by Intl', () => {
  expect(formatNumber(1, { decimals: 100 })).toHaveLength(102)
})
