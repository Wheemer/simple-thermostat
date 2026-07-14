import renderInfoItem from '../components/infoItem'
import { render } from 'lit'

test('return undefined on hide and no state', () => {
  const firstResult = renderInfoItem({
    hide: true,
    hass: {},
    state: 'foo',
    details: {},
  })
  expect(firstResult).toBe(undefined)

  expect(
    renderInfoItem({
      hide: false,
      hass: {},
      state: undefined,
      details: {},
    })
  ).toBe(undefined)
})

test('render into dom', () => {
  const spec = {
    heading: 'Temperature',
    value: '4℃',
  }
  const result = renderInfoItem({
    hide: false,
    hass: {},
    state: spec.value,
    details: { heading: spec.heading },
  })

  render(result, document.body)
  const heading = document.body.querySelector('div').textContent
  const value = document.body.querySelector('div:last-child').textContent

  expect(heading.trim()).toBe(`${spec.heading}:`)
  expect(value.trim()).toBe(spec.value)
})

test('can render text headings without the label separator', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {},
    state: '73',
    details: {
      heading: 'Currently',
      separator: false,
    },
  })

  const container = document.createElement('div')
  render(result, container)

  const heading = container.querySelector('.entity-heading')?.textContent
  expect(heading?.trim()).toBe('Currently')
  expect(heading).not.toContain(':')
})

test('render with icon', () => {
  const spec = {
    heading: 'Temperature',
    value: '4℃',
  }
  const result = renderInfoItem({
    hide: false,
    hass: {},
    state: spec.value,
    details: { heading: spec.heading, icon: 'test' },
  })

  render(result, document.body)
  const heading = document.body.querySelector('div').innerHTML
  const value = document.body.querySelector('div:last-child').textContent

  expect(heading).toContain('<ha-icon icon="test"')
  expect(value.trim()).toBe(spec.value)
})

test('appends entity unit after Home Assistant formatted state', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      formatEntityState: () => '48.64',
    },
    state: {
      entity_id: 'sensor.average_humidity',
      state: '48.64',
      attributes: {
        unit_of_measurement: '%',
      },
    },
    details: { heading: false },
    openEntityPopover: () => undefined,
  })

  render(result, document.body)
  const valueElement = document.body.querySelector('div')
  const value = valueElement.textContent

  expect(value.trim()).toBe('48.64%')
  expect(valueElement.getAttribute('title')).toBe('sensor.average_humidity')
})

test('does not duplicate entity unit from Home Assistant formatted state', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      formatEntityState: () => '20.44 °C',
    },
    state: {
      entity_id: 'sensor.average_temperature',
      state: '20.44',
      attributes: {
        unit_of_measurement: '°C',
      },
    },
    details: { heading: false },
    openEntityPopover: () => undefined,
  })

  render(result, document.body)
  const value = document.body.querySelector('div').textContent

  expect(value.trim()).toBe('20.44 °C')
})

test('falls back to percent for humidity rows without an entity unit', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      formatEntityState: () => '48.11',
    },
    state: {
      entity_id: 'sensor.average_humidity',
      state: '48.11',
      attributes: {},
    },
    details: { heading: false, icon: 'mdi:water-percent' },
    openEntityPopover: () => undefined,
  })

  render(result, document.body)
  const value = document.body.querySelector('div').textContent

  expect(value.trim()).toBe('48.11%')
})

test('does not render undefined when entity unit is missing', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      formatEntityState: () => '123',
    },
    state: {
      entity_id: 'sensor.no_unit',
      state: '123',
      attributes: {},
    },
    details: { heading: false },
    openEntityPopover: () => undefined,
  })

  render(result, document.body)
  const value = document.body.querySelector('div').textContent

  expect(value.trim()).toBe('123')
})

test('entity row template can format state.raw like v3 sensors', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      locale: { language: 'en' },
      formatEntityState: () => '20.44',
    },
    state: {
      entity_id: 'sensor.guest_room_temperature',
      state: '20.44',
      attributes: {
        friendly_name: 'Guest Room Temperature',
      },
    },
    details: {
      heading: 'Guest',
      template: '{{state.raw|formatNumber}}',
      config: { decimals: 0 },
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  const value = container.querySelector('.entity-value')?.textContent
  expect(value?.trim()).toBe('20')
})

test('entity row template can use an attribute value as a top-level variable', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      locale: { language: 'en' },
      formatEntityState: () => 'Partly cloudy',
      formatEntityAttributeValue: () => '73 °F',
    },
    state: {
      entity_id: 'sensor.outside_temperature_source',
      state: 'partlycloudy',
      attributes: {
        friendly_name: 'Outside',
        temperature: 73,
      },
    },
    details: {
      heading: 'Outside',
      attribute: 'temperature',
      template: '{{((temperature - 32) * 5 / 9)|formatNumber({decimals: 1})}} °C',
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  const value = container.querySelector('.entity-value')?.textContent
  expect(value?.trim()).toBe('22.8 °C')
})

test('entity row icon can be rendered from a state_attr template', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      states: {
        'sensor.status_window': {
          entity_id: 'sensor.status_window',
          state: 'open',
          attributes: {
            friendly_name: 'Bedroom window',
            icon: 'mdi:window-open',
          },
        },
      },
    },
    state: {
      entity_id: 'sensor.status_window',
      state: 'open',
      attributes: {
        friendly_name: 'Bedroom window',
        icon: 'mdi:window-open',
      },
    },
    details: {
      heading: 'Window',
      icon: "{{ state_attr('sensor.status_window', 'icon') }}",
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  expect(container.querySelector('ha-icon')?.getAttribute('icon')).toBe(
    'mdi:window-open'
  )
})

test('entity row templates escape entity-derived HTML', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      locale: { language: 'en' },
    },
    state: {
      entity_id: 'sensor.cloud_value',
      state: '<img src=x onerror=alert(1)>',
      attributes: {
        friendly_name: '<b>Cloud value</b>',
        unsafe_attr: '<svg onload=alert(1)>',
      },
    },
    details: {
      heading: 'Cloud',
      template: '{{state.raw}} {{unsafe_attr}} {{friendly_name}}',
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('svg')).toBeNull()
  expect(container.querySelector('b')).toBeNull()
  expect(container.querySelector('.entity-value')?.textContent).toContain(
    '<img src=x onerror=alert(1)>'
  )
  expect(container.querySelector('.entity-value')?.textContent).toContain(
    '<svg onload=alert(1)>'
  )
  expect(container.querySelector('.entity-value')?.textContent).toContain(
    '<b>Cloud value</b>'
  )
})

test('state_attr template values are escaped before unsafeHTML rendering', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      states: {
        'sensor.external_status': {
          entity_id: 'sensor.external_status',
          state: 'ok',
          attributes: {
            message: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
          },
        },
      },
    },
    state: {
      entity_id: 'sensor.external_status',
      state: 'ok',
      attributes: {
        friendly_name: 'External status',
      },
    },
    details: {
      heading: 'Status',
      template: "{{ state_attr('sensor.external_status', 'message') }}",
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  expect(container.querySelector('iframe')).toBeNull()
  expect(container.querySelector('.entity-value')?.textContent).toContain(
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
  )
})

test('legacy label icon template renders as an entity row heading icon', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      locale: { language: 'en' },
    },
    state: {
      entity_id: 'sensor.status_window',
      state: 'open',
      attributes: {
        friendly_name: 'Bedroom window',
        icon: 'mdi:window-open',
      },
    },
    details: {
      heading: '{{icon|icon}}',
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  expect(container.querySelector('ha-icon')?.getAttribute('icon')).toBe(
    'mdi:window-open'
  )
  expect(container.querySelector('.entity-heading')?.textContent).not.toContain(
    ':'
  )
})

test('icon filter escapes the icon attribute before unsafeHTML rendering', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      locale: { language: 'en' },
    },
    state: {
      entity_id: 'sensor.status_window',
      state: 'open',
      attributes: {
        friendly_name: 'Bedroom window',
        icon: 'mdi:window-open" onclick="alert(1)',
      },
    },
    details: {
      heading: '{{icon|icon}}',
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  const icon = container.querySelector('ha-icon') as HTMLElement
  expect(icon.getAttribute('icon')).toBe(
    'mdi:window-open&quot; onclick=&quot;alert(1)'
  )
  expect(icon.getAttribute('onclick')).toBe(null)
})

test('css filter escapes content and strips unsafe style syntax', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {},
    state: {
      entity_id: 'sensor.status',
      state: 'ok',
      attributes: {
        friendly_name: 'Status',
      },
    },
    details: {
      template:
        "{{ '<img src=x onerror=alert(1)>' | css({ color: 'red; background:url(javascript:alert(1))' }) }}",
    },
    openEntityPopover: () => undefined,
    localize: (value: string) => value,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  const value = container.querySelector('.entity-value') as HTMLElement
  const span = value.querySelector('span') as HTMLElement
  expect(value.querySelector('img')).toBe(null)
  expect(value.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(span.getAttribute('style')).not.toContain('javascript')
  expect(span.getAttribute('style')).not.toContain('url(')
})

test('plain text rows with an entity id open more info from label and value', () => {
  const openEntityPopover = jest.fn()
  const result = renderInfoItem({
    hide: false,
    hass: {
      states: {
        'sensor.average_humidity': {
          attributes: { friendly_name: 'Average Humidity' },
        },
      },
    },
    state: '48.71%',
    details: {
      heading: 'Humidity',
      entity: 'sensor.average_humidity',
    },
    openEntityPopover,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  const heading = container.querySelector('.entity-heading') as HTMLElement
  const value = container.querySelector('.entity-value') as HTMLElement

  heading.click()
  value.click()

  expect(openEntityPopover).toHaveBeenNthCalledWith(
    1,
    'sensor.average_humidity'
  )
  expect(openEntityPopover).toHaveBeenNthCalledWith(
    2,
    'sensor.average_humidity'
  )
})

test('toggle entity rows expose domain, state, and icon classes for styling', () => {
  const result = renderInfoItem({
    hide: false,
    hass: {},
    state: {
      entity_id: 'light.desk_lamp',
      state: 'on',
      attributes: {
        icon: 'mdi:lightbulb',
      },
    },
    details: {
      icon: 'mdi:lightbulb',
    },
    openEntityPopover: () => undefined,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)

  const heading = container.querySelector('.entity-heading') as HTMLElement
  const value = container.querySelector('.entity-value') as HTMLElement

  expect(heading.classList.contains('toggle-entity')).toBe(true)
  expect(heading.classList.contains('domain-light')).toBe(true)
  expect(heading.classList.contains('state-on')).toBe(true)
  expect(heading.classList.contains('toggle-lightbulb')).toBe(true)
  expect(value.classList.contains('toggle-entity')).toBe(true)
  expect(value.classList.contains('domain-light')).toBe(true)
  expect(value.classList.contains('state-on')).toBe(true)
  expect(value.querySelector('ha-switch')).not.toBeNull()
})

test('active timer entity rows render a live remaining countdown', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-07-04T12:00:00Z'))

  const result = renderInfoItem({
    hide: false,
    hass: {
      formatEntityState: () => 'Active',
    },
    state: {
      entity_id: 'timer.turn_fan_off',
      state: 'active',
      attributes: {
        finishes_at: '2026-07-04T12:01:05Z',
        remaining: '0:10:00',
      },
    },
    details: { heading: 'Fan timer' },
    openEntityPopover: () => undefined,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)
  await customElements.whenDefined('simple-thermostat-timer-remaining')
  await Promise.resolve()

  expect(
    container.querySelector('simple-thermostat-timer-remaining')?.textContent
  ).toBe('1:05')

  jest.useRealTimers()
})

test('paused timer entity rows render the remaining attribute', async () => {
  const result = renderInfoItem({
    hide: false,
    hass: {
      formatEntityState: () => 'Paused',
    },
    state: {
      entity_id: 'timer.turn_fan_off',
      state: 'paused',
      attributes: {
        remaining: '0:03:21',
      },
    },
    details: { heading: 'Fan timer' },
    openEntityPopover: () => undefined,
  })

  const container = document.createElement('div')
  document.body.replaceChildren(container)
  render(result, container)
  await customElements.whenDefined('simple-thermostat-timer-remaining')
  await Promise.resolve()

  expect(
    container.querySelector('simple-thermostat-timer-remaining')?.textContent
  ).toBe('0:03:21')
})
