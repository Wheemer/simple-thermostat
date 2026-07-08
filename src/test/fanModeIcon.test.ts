import getFanModeIcon from '../fanModeIcon'

test('assigns five speed icons when five clear speed levels are present', () => {
  const modes = ['low', 'medium', 'medium_high', 'high', 'full']

  expect(getFanModeIcon('low', modes)).toBe('mdi:fan-speed-1')
  expect(getFanModeIcon('medium', modes)).toBe('mdi:fan-speed-2')
  expect(getFanModeIcon('medium_high', modes)).toBe('mdi:fan-speed-3')
  expect(getFanModeIcon('high', modes)).toBe('st:fan-speed-4')
  expect(getFanModeIcon('full', modes)).toBe('st:fan-speed-5')
})

test('keeps low as speed one on simple three speed fans', () => {
  const modes = ['low', 'medium', 'high']

  expect(getFanModeIcon('low', modes)).toBe('mdi:fan-speed-1')
  expect(getFanModeIcon('medium', modes)).toBe('mdi:fan-speed-2')
  expect(getFanModeIcon('high', modes)).toBe('mdi:fan-speed-3')
})

test('assigns the fourth speed icon when medium high is present', () => {
  const modes = ['auto', 'low', 'medium', 'medium_high', 'high']

  expect(getFanModeIcon('low', modes)).toBe('mdi:fan-speed-1')
  expect(getFanModeIcon('medium', modes)).toBe('mdi:fan-speed-2')
  expect(getFanModeIcon('medium_high', modes)).toBe('mdi:fan-speed-3')
  expect(getFanModeIcon('high', modes)).toBe('st:fan-speed-4')
})

test('assigns numeric fan speeds directly', () => {
  const modes = ['auto', 'quiet', '1', '2', '3', '4', '5']

  expect(getFanModeIcon('1', modes)).toBe('mdi:fan-speed-1')
  expect(getFanModeIcon('2', modes)).toBe('mdi:fan-speed-2')
  expect(getFanModeIcon('3', modes)).toBe('mdi:fan-speed-3')
  expect(getFanModeIcon('4', modes)).toBe('st:fan-speed-4')
  expect(getFanModeIcon('5', modes)).toBe('st:fan-speed-5')
})

test('leaves non-speed fan modes to the default icon map', () => {
  expect(getFanModeIcon('auto', ['auto', 'low', 'high'])).toBeUndefined()
  expect(getFanModeIcon('quiet', ['auto', 'quiet', '1', '2'])).toBeUndefined()
  expect(getFanModeIcon('silent', ['auto', 'silent', 'low'])).toBeUndefined()
})
