import { getModeLabelPresentation } from '../modeLabelLayout'

test('heat_cool splits slash labels in sparse rows', () => {
  expect(getModeLabelPresentation('heat_cool', 'Heat/Cool', true)).toEqual({
    layout: 'stacked',
    lines: ['Heat', 'Cool'],
  })
})

test('fan_only splits two-word labels in sparse rows', () => {
  expect(getModeLabelPresentation('fan_only', 'Fan only', true)).toEqual({
    layout: 'stacked',
    lines: ['Fan', 'only'],
  })
})

test('long localized labels fall back to column layout', () => {
  expect(
    getModeLabelPresentation('fan_only', 'Ventilation seule', true)
  ).toEqual({
    layout: 'column',
    lines: ['Ventilation seule'],
  })
})

test('short labels stay inline in sparse rows', () => {
  expect(getModeLabelPresentation('heat', 'Heat', true)).toEqual({
    layout: 'inline',
    lines: ['Heat'],
  })
})

test('stacking is disabled outside sparse rows', () => {
  expect(getModeLabelPresentation('heat_cool', 'Heat/Cool', false)).toEqual({
    layout: 'inline',
    lines: ['Heat/Cool'],
  })
})
