import { render } from 'lit'
import renderModeType from '../components/modeType'
import { fanAdapter } from '../adapters/fan'

const baseOptions = {
  state: 'on',
  entity: {
    entity_id: 'fan.range_hood',
    state: 'off',
    attributes: {},
  },
  hass: {},
  adapter: fanAdapter,
  modeOptions: {},
  localize: (key: string) => key,
  setMode: () => undefined,
}

test('preset heading is hidden by default', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'preset',
      mode: 'off',
      list: [{ value: 'off', icon: 'mdi:power', name: 'off' }],
    },
  })

  render(result, document.body)

  expect(document.body.querySelector('.mode-title')).toBe(null)
})

test('preset heading shows fallback label when explicitly enabled', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'preset',
      mode: 'off',
      heading: true,
      list: [{ value: 'off', icon: 'mdi:power', name: 'off' }],
    },
  })

  render(result, document.body)

  expect(document.body.querySelector('.mode-title')?.textContent?.trim()).toBe(
    'Preset'
  )
})

test('hvac heading is hidden by default', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'hvac',
      mode: 'off',
      list: [{ value: 'off', icon: 'mdi:power', name: 'off' }],
    },
  })

  render(result, document.body)

  expect(document.body.querySelector('.mode-title')).toBe(null)
})

test('four hvac controls keep the enhanced sparse row layout', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'hvac',
      mode: 'off',
      list: [
        { value: 'off', icon: 'mdi:power', name: 'Off' },
        { value: 'cool', icon: 'mdi:snowflake', name: 'Cool' },
        { value: 'dry', icon: 'mdi:water-percent', name: 'Dry' },
        { value: 'fan_only', icon: 'mdi:fan', name: 'Fan' },
      ],
    },
  })

  render(result, document.body)

  const classList = document.body.querySelector('.modes.hvac')?.classList
  expect(classList).toContain('sparse')
  expect(classList).not.toContain('dense')
})

test('three visible hvac controls stay sparse for portrait mobile layout', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'hvac',
      mode: 'off',
      list: [
        { value: 'heat', icon: 'mdi:fire', name: 'Heat' },
        { value: 'cool', icon: 'mdi:snowflake', name: 'Cool' },
        { value: 'off', icon: 'mdi:power', name: 'Off' },
      ],
    },
  })

  render(result, document.body)

  const classList = document.body.querySelector('.modes.hvac')?.classList
  expect(classList).toContain('sparse')
  expect(classList).not.toContain('dense')
})

test('five hvac controls use the compact dense layout', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'hvac',
      mode: 'off',
      list: [
        { value: 'off', icon: 'mdi:power', name: 'Off' },
        { value: 'heat', icon: 'mdi:fire', name: 'Heat' },
        { value: 'cool', icon: 'mdi:snowflake', name: 'Cool' },
        { value: 'dry', icon: 'mdi:water-percent', name: 'Dry' },
        { value: 'fan_only', icon: 'mdi:fan', name: 'Fan' },
      ],
    },
  })

  render(result, document.body)

  const classList = document.body.querySelector('.modes.hvac')?.classList
  expect(classList).toContain('dense')
  expect(classList).not.toContain('sparse')
})

test('four fan controls keep the enhanced sparse row layout', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'fan',
      mode: 'auto',
      list: [
        { value: 'auto', icon: 'mdi:fan-auto', name: 'Auto' },
        { value: 'low', icon: 'mdi:fan-speed-1', name: 'Low' },
        { value: 'medium', icon: 'mdi:fan-speed-2', name: 'Mid' },
        { value: 'high', icon: 'mdi:fan-speed-3', name: 'High' },
      ],
    },
  })

  render(result, document.body)

  const classList = document.body.querySelector('.modes.fan')?.classList
  expect(classList).toContain('sparse')
  expect(classList).not.toContain('dense')
})

test('five fan controls use the compact dense layout', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'fan',
      mode: 'auto',
      list: [
        { value: 'auto', icon: 'mdi:fan-auto', name: 'Auto' },
        { value: 'low', icon: 'mdi:fan-speed-1', name: 'Low' },
        { value: 'medium', icon: 'mdi:fan-speed-2', name: 'Mid' },
        { value: 'high', icon: 'mdi:fan-speed-3', name: 'High' },
        { value: 'full', icon: 'mdi:fan-chevron-up', name: 'Full' },
      ],
    },
  })

  render(result, document.body)

  const classList = document.body.querySelector('.modes.fan')?.classList
  expect(classList).toContain('dense')
  expect(classList).not.toContain('sparse')
})

test('mode options can hide when the main entity is off', () => {
  const result = renderModeType({
    ...baseOptions,
    state: 'off',
    mode: {
      type: 'hvac',
      mode: 'off',
      list: [
        {
          value: 'off',
          icon: 'mdi:power',
          name: 'Off',
          hide_when_off: true,
        },
        { value: 'heat', icon: 'mdi:fire', name: 'Heat' },
      ],
    },
  })

  render(result, document.body)

  expect(document.body.textContent).not.toContain('Off')
  expect(document.body.textContent).toContain('Heat')
  expect(document.body.querySelectorAll('.mode-item')).toHaveLength(1)
})

test('mode options hidden while off stay visible when on', () => {
  const result = renderModeType({
    ...baseOptions,
    state: 'heat',
    mode: {
      type: 'hvac',
      mode: 'heat',
      list: [
        {
          value: 'off',
          icon: 'mdi:power',
          name: 'Off',
          hide_when_off: true,
        },
        { value: 'heat', icon: 'mdi:fire', name: 'Heat' },
      ],
    },
  })

  render(result, document.body)

  expect(document.body.textContent).toContain('Off')
  expect(document.body.textContent).toContain('Heat')
  expect(document.body.querySelectorAll('.mode-item')).toHaveLength(2)
})

test('renders card-local fan speed icons', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'preset',
      mode: 'max',
      list: [{ value: 'max', icon: 'st:fan-speed-4', name: 'max' }],
    },
  })

  render(result, document.body)

  expect((document.body.querySelector('ha-icon.mode-icon') as any)?.icon).toBe(
    'st:fan-speed-4'
  )
  expect(window.customIconsets?.st).toBeDefined()
})

test('renders card-local fan speed 5 through Home Assistant icon pipeline', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'preset',
      mode: 'boost',
      list: [{ value: 'boost', icon: 'st:fan-speed-5', name: 'boost' }],
    },
  })

  render(result, document.body)

  expect((document.body.querySelector('ha-icon.mode-icon') as any)?.icon).toBe(
    'st:fan-speed-5'
  )
  expect(window.customIconsets?.st).toBeDefined()
})

test('fan preset tooltips describe the control purpose', () => {
  const result = renderModeType({
    ...baseOptions,
    entity: {
      ...baseOptions.entity,
      attributes: { friendly_name: 'Range Hood Fan' },
    },
    mode: {
      type: 'preset',
      mode: 'low',
      list: [{ value: 'low', icon: 'st:fan-speed-1', name: 'Low' }],
    },
  })

  render(result, document.body)

  expect(document.body.querySelector('.modes')?.getAttribute('title')).toBe(
    null
  )
  expect(
    document.body.querySelector('.modes')?.classList.contains('fan-preset')
  ).toBe(true)
  expect(document.body.querySelector('.mode-item')?.getAttribute('title')).toBe(
    null
  )
})

test('vane tooltips describe the control purpose', () => {
  const result = renderModeType({
    ...baseOptions,
    mode: {
      type: 'vane_horizontal',
      mode: 'center',
      list: [{ value: 'center', icon: '', name: 'Center' }],
    },
  })

  render(result, document.body)

  expect(document.body.querySelector('.modes')?.getAttribute('title')).toBe(
    null
  )
  expect(document.body.querySelector('.mode-item')?.getAttribute('title')).toBe(
    null
  )
})

test('default swing icons stay hidden unless swing icons are enabled', () => {
  render(
    renderModeType({
      ...baseOptions,
      mode: {
        type: 'swing',
        mode: 'vertical',
        list: [{ value: 'vertical', icon: 'mdi:arrow-up-down', name: false }],
      },
    }),
    document.body
  )

  expect(document.body.querySelector('ha-icon.mode-icon')).toBe(null)
})

test('explicit swing icons render without enabling all default swing icons', () => {
  render(
    renderModeType({
      ...baseOptions,
      mode: {
        type: 'swing',
        mode: 'Vertical_1',
        list: [
          {
            value: 'Vertical_1',
            icon: 'mdi:arrow-top-right',
            iconConfigured: true,
            name: false,
          },
        ],
      },
    }),
    document.body
  )

  expect((document.body.querySelector('ha-icon.mode-icon') as any)?.icon).toBe(
    'mdi:arrow-top-right'
  )
})

test('explicit disabled swing icons remain hidden', () => {
  render(
    renderModeType({
      ...baseOptions,
      mode: {
        type: 'swing',
        mode: 'vertical',
        list: [
          {
            value: 'vertical',
            icon: false,
            iconConfigured: true,
            name: false,
          },
        ],
      },
    }),
    document.body
  )

  expect(document.body.querySelector('ha-icon.mode-icon')).toBe(null)
})
