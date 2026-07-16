import { render } from 'lit'
import renderEntities from '../components/entities'
import { climateAdapter } from '../adapters/climate'
import { humidifierAdapter } from '../adapters/humidifier'
import { fanAdapter } from '../adapters/fan'

function freshContainer() {
  const container = document.createElement('div')
  document.body.replaceChildren(container)
  return container
}

test('state row shows hvac action without repeating hvac mode', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: false },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'heat',
      attributes: {
        hvac_action: 'heating',
        current_temperature: 19,
      },
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Heat',
      formatEntityAttributeValue: () => 'Heating',
    },
    entities: [],
    config: {},
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const text = container.textContent
  expect(text).toContain('Heating')
  expect(text).not.toContain('Heating (Heat)')
})

test('humidifier state row shows active drying action', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: false },
    entity: {
      entity_id: 'humidifier.basement_dehumidifier',
      state: 'on',
      attributes: {
        action: 'drying',
        device_class: 'dehumidifier',
        current_humidity: 64,
      },
    },
    unit: '%',
    hass: {
      formatEntityState: () => 'On',
      formatEntityAttributeValue: () => 'Drying',
    },
    entities: [],
    config: { entity: 'humidifier.basement_dehumidifier' },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: humidifierAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const text = container.textContent
  expect(text).toContain('Drying')
  expect(text).not.toContain('On')
})

test('fan state row prefers preset mode over on state', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: false },
    entity: {
      entity_id: 'fan.living_room',
      state: 'on',
      attributes: {
        preset_mode: 'auto',
        percentage: 42,
      },
    },
    unit: false,
    hass: {
      formatEntityState: () => 'On',
      formatEntityAttributeValue: () => 'Auto',
    },
    entities: [],
    config: { entity: 'fan.living_room' },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: fanAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const text = container.textContent
  expect(text).toContain('Auto')
  expect(text).not.toContain('On')
})

test('fan state row falls back to percentage speed', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: false },
    entity: {
      entity_id: 'fan.living_room',
      state: 'on',
      attributes: {
        percentage: 42,
      },
    },
    unit: false,
    hass: {
      formatEntityState: () => 'On',
    },
    entities: [],
    config: { entity: 'fan.living_room' },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: fanAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const text = container.textContent
  expect(text).toContain('42%')
  expect(text).not.toContain('On')
})

test('built-in currently and state rows open their entities', () => {
  const openEntityPopover = jest.fn()
  const result = renderEntities({
    _hide: { temperature: false, state: false },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {
        current_temperature: 20.4,
      },
    },
    unit: '°C',
    hass: {
      states: {
        'climate.garage_heat': {
          entity_id: 'climate.garage_heat',
          state: 'off',
          attributes: { current_temperature: 20.4 },
        },
      },
      formatEntityState: () => 'Off',
    },
    entities: [],
    config: { entity: 'climate.garage_heat' },
    localize: (value: string) => value,
    openEntityPopover,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const headings = container.querySelectorAll('.entity-heading')
  const values = container.querySelectorAll('.entity-value')

  ;(headings[0] as HTMLElement).click()
  ;(values[0] as HTMLElement).click()
  ;(headings[1] as HTMLElement).click()
  ;(values[1] as HTMLElement).click()

  expect(openEntityPopover).toHaveBeenCalledTimes(4)
  expect(openEntityPopover).toHaveBeenNthCalledWith(1, 'climate.garage_heat')
  expect(openEntityPopover).toHaveBeenNthCalledWith(2, 'climate.garage_heat')
  expect(openEntityPopover).toHaveBeenNthCalledWith(3, 'climate.garage_heat')
  expect(openEntityPopover).toHaveBeenNthCalledWith(4, 'climate.garage_heat')
})

test('entity row labels can hide the separator', () => {
  const result = renderEntities({
    _hide: { temperature: false, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {
        current_temperature: 20.4,
      },
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Off',
    },
    entities: [
      {
        name: 'Humidity',
        state: '48%',
      },
    ],
    config: {
      entity: 'climate.garage_heat',
      layout: {
        entities: {
          separator: false,
        },
      },
    },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const headings = [...container.querySelectorAll('.entity-heading')].map(
    (heading) => heading.textContent?.trim()
  )

  expect(headings).toEqual(['ui.card.climate.currently', 'Humidity'])
  expect(headings.join(' ')).not.toContain(':')
})

test('extra entity rows can hide when the main entity is off', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {},
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Off',
    },
    entities: [
      {
        name: 'Hidden while off',
        state: 'On',
        _hide_when_off: true,
      },
      {
        name: 'Always visible',
        state: '42 W',
      },
    ],
    config: { entity: 'climate.garage_heat' },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const text = container.textContent
  expect(text).not.toContain('Hidden while off')
  expect(text).toContain('Always visible')
})

test('extra entity rows with hide-when-off stay visible when the main entity is on', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'heat',
      attributes: {},
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Heat',
    },
    entities: [
      {
        name: 'Visible while on',
        state: 'On',
        _hide_when_off: true,
      },
    ],
    config: { entity: 'climate.garage_heat' },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  expect(container.textContent).toContain('Visible while on')
})

test('current value row can hide when the main entity is off', () => {
  const result = renderEntities({
    _hide: { temperature: false, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {
        current_temperature: 20.4,
      },
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Off',
    },
    entities: [],
    config: {
      entity: 'climate.garage_heat',
      hide_current_value_when_off: true,
    },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  expect(container.textContent).not.toContain('20.4')
  expect(container.querySelector('.entity-row')).toBe(null)
})

test('current value row accepts nested current_value_when_off alias', () => {
  const result = renderEntities({
    _hide: { temperature: false, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {
        current_temperature: 20.4,
      },
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Off',
    },
    entities: [],
    config: {
      entity: 'climate.garage_heat',
      hide: {
        current_value_when_off: true,
      },
    },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  expect(container.textContent).not.toContain('20.4')
  expect(container.querySelector('.entity-row')).toBe(null)
})

test('current value row accepts legacy temperature_when_off alias', () => {
  const result = renderEntities({
    _hide: { temperature: false, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {
        current_temperature: 20.4,
      },
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Off',
    },
    entities: [],
    config: {
      entity: 'climate.garage_heat',
      hide: {
        temperature_when_off: true,
      },
    },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  expect(container.textContent).not.toContain('20.4')
  expect(container.querySelector('.entity-row')).toBe(null)
})

test('entity rows can opt into left aligned labels', () => {
  const result = renderEntities({
    _hide: { temperature: false, state: true },
    entity: {
      entity_id: 'climate.garage_heat',
      state: 'off',
      attributes: {
        current_temperature: 20.4,
      },
    },
    unit: '°C',
    hass: {
      formatEntityState: () => 'Off',
    },
    entities: [],
    config: {
      entity: 'climate.garage_heat',
      layout: {
        entities: {
          alignment: 'left',
        },
      },
    },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  expect(container.querySelector('.entities')?.className).toContain(
    'align-left'
  )
  expect(container.querySelector('.entities')?.className).toContain(
    'with-labels'
  )
  expect(container.querySelector('.entities')?.className).not.toContain(
    'without-labels'
  )
})

test('separator-free left-aligned entity rows keep labels and values paired', () => {
  const result = renderEntities({
    _hide: { temperature: true, state: true },
    entity: {
      entity_id: 'climate.upstairs',
      state: 'heat_cool',
      attributes: {},
    },
    unit: '°F',
    hass: {
      formatEntityState: () => 'Heat/Cool',
    },
    entities: [
      { name: 'Guest', state: '72' },
      { name: 'Motion', state: 'Clear' },
      { name: 'Office', state: '74' },
    ],
    config: {
      entity: 'climate.upstairs',
      layout: {
        entities: {
          separator: false,
          alignment: 'left',
        },
      },
    },
    localize: (value: string) => value,
    openEntityPopover: () => undefined,
    adapter: climateAdapter,
  })

  const container = freshContainer()
  render(result, container)

  const entities = container.querySelector('.entities')
  const layoutChildren = [...(entities?.childNodes ?? [])].filter(
    (node) =>
      node.nodeType !== Node.COMMENT_NODE &&
      (node.nodeType !== Node.TEXT_NODE || node.textContent?.trim())
  )

  expect(layoutChildren).toHaveLength(6)
  expect(
    [...entities!.children].map((child) => child.textContent?.trim())
  ).toEqual(['Guest', '72', 'Motion', 'Clear', 'Office', '74'])
})
