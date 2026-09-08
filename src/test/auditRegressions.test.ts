import { render } from 'lit'
import SimpleThermostat from '../main'
import SimpleThermostatGroup from '../group'
import SimpleThermostatEditor from '../editor'
import renderInfoItem from '../components/infoItem'

if (!customElements.get('simple-thermostat'))
  customElements.define('simple-thermostat', SimpleThermostat)
if (!customElements.get('audit-group'))
  customElements.define('audit-group', SimpleThermostatGroup)
if (!customElements.get('audit-editor'))
  customElements.define('audit-editor', SimpleThermostatEditor)

const climate = {
  entity_id: 'climate.room',
  state: 'heat',
  last_changed: '2026-09-01T10:00:00Z',
  attributes: {
    temperature: 20,
    current_temperature: 19,
    min_temp: 7,
    max_temp: 30,
    hvac_modes: ['off', 'heat', 'cool'],
    fan_modes: ['low', 'high'],
    preset_modes: ['none', 'sleep'],
  },
}
function hass() {
  return {
    states: { 'climate.room': climate } as Record<string, any>,
    config: { unit_system: { temperature: 'C' } },
    localize: (key: string) => key.split('.').at(-1),
    callService: jest.fn(),
  }
}
function card(config = {}, state = hass()) {
  const card = document.createElement('simple-thermostat') as SimpleThermostat
  card.setConfig({ entity: 'climate.room', ...config } as any)
  card.hass = state as any
  document.body.append(card)
  return card
}
afterEach(() => {
  document.body.replaceChildren()
  jest.useRealTimers()
  localStorage.clear()
  jest.restoreAllMocks()
})

test.each([null, ['heat', 'cool'], { low: 7 }, undefined])(
  'attribute value %p does not break rendering',
  async (value) => {
    const state = hass()
    state.states['climate.room'] = {
      ...climate,
      attributes: { ...climate.attributes, optional: value },
    }
    const c = card(
      { entities: [{ attribute: 'optional', name: 'Optional' }] },
      state
    )
    await expect(c.updateComplete).resolves.toBe(true)
    expect(c.shadowRoot?.querySelector('ha-card')).not.toBeNull()
  }
)

test.each([
  undefined,
  { entity_id: 'sensor.helper', state: 'on', attributes: {} },
  {
    entity_id: 'select.helper',
    state: 'unavailable',
    attributes: { options: ['off'] },
  },
])('invalid helper never redirects to the thermostat', async (helper) => {
  const h = hass()
  if (helper) h.states['select.helper'] = helper
  const c = card({ control: { hvac: { entity: 'select.helper' } } }, h)
  await c.updateComplete
  c.setMode('hvac', 'off')
  expect(h.callService).not.toHaveBeenCalled()
  expect(c.shadowRoot?.querySelector('ha-alert')).not.toBeNull()
})

test('a valid helper remains authoritative', () => {
  const h = hass()
  h.states['select.helper'] = {
    entity_id: 'select.helper',
    state: 'heat',
    attributes: { options: ['heat', 'off'] },
  }
  const c = card({ control: { hvac: { entity: 'select.helper' } } }, h)
  c.setMode('hvac', 'off')
  expect(h.callService).toHaveBeenCalledWith('select', 'select_option', {
    entity_id: 'select.helper',
    option: 'off',
  })
})

test('detach flushes pending input and reconnect reconciles the actual setpoint', async () => {
  jest.useFakeTimers()
  const h = hass()
  const c = card({}, h)
  c.setTemperature(1, 'temperature')
  c.remove()
  expect(h.callService).toHaveBeenCalledTimes(1)
  document.body.append(c)
  c.hass = {
    ...h,
    states: {
      'climate.room': {
        ...climate,
        attributes: { ...climate.attributes, temperature: 22 },
      },
    },
  } as any
  await c.updateComplete
  expect(c._values.temperature).toBe(22)
  expect(c._updatingValues).toBe(false)
})

test('optimistic timeout reconciles without waiting for another HA event', () => {
  jest.useFakeTimers()
  const c = card()
  c.setTemperature(1, 'temperature')
  jest.advanceTimersByTime(10000)
  expect(c._values.temperature).toBe(20)
})

test('explicit object control order and absent defaults are distinct', () => {
  expect(
    card({ control: { hvac: true, fan: true, preset: true } }).modes.map(
      (m) => m.type
    )
  ).toEqual(['hvac', 'fan', 'preset'])
  expect(card().modes.map((m) => m.type)).toEqual(['preset', 'hvac'])
})

test.each([
  { hide_setpoint: true },
  { setpoints: false },
  { hide_setpoint_when_off: true },
])('hidden setpoints leave no setpoint container: %p', async (config) => {
  const h = hass()
  h.states['climate.room'] = { ...climate, state: 'off' }
  const c = card({ ...config, layout: { step: 'column' } }, h)
  await c.updateComplete
  expect(c.shadowRoot?.querySelector('.setpoints')).toBeNull()
  expect(c.shadowRoot?.querySelector('.body')?.className).toContain(
    'setpoint-count-0'
  )
})

test('editor preserves explicit enhanced visuals on unrelated edits and when enabling', () => {
  const e = document.createElement('audit-editor') as SimpleThermostatEditor
  e.setConfig({ entity: 'climate.room', enhanced_visuals: true } as any)
  expect(e._applyFormChange({ decimals: 2 } as any).enhanced_visuals).toBe(true)
  e.setConfig({ entity: 'climate.room', enhanced_visuals: false } as any)
  expect(
    e._applyFormChange({ enhanced_visuals: true } as any).enhanced_visuals
  ).toBe(true)
})

test('editor clears only corresponding legacy hide aliases', () => {
  const e = document.createElement('audit-editor') as SimpleThermostatEditor
  e.setConfig({
    entity: 'climate.room',
    hide: {
      setpoint_when_off: true,
      temperature_when_off: true,
      current_value_when_off: true,
      state: true,
    },
  } as any)
  const result = e._applyFormChange({
    hide_setpoint_when_off: false,
    hide_current_value_when_off: false,
  } as any)
  expect(result.hide).toEqual({ state: true })
  expect(result.hide_setpoint_when_off).toBe(false)
  expect(result.hide_current_value_when_off).toBe(false)
})

test.each(['chip', 'toggle', 'button', 'auto'])(
  'display %s composes with attributes, templates, and one label',
  (display) => {
    const container = document.createElement('div')
    const state = {
      entity_id: 'sensor.outside',
      state: 'cloudy',
      attributes: { temperature: 22.345 },
    }
    const options: any = {
      state,
      hass: hass(),
      details: {
        display,
        heading: 'Outside',
        attribute: 'temperature',
        decimals: 1,
        unit: 'C',
      },
    }
    render(renderInfoItem(options), container)
    expect(container.querySelectorAll('.entity-action')).toHaveLength(1)
    expect(container.querySelectorAll('.entity-heading')).toHaveLength(0)
    if (display !== 'button') expect(container.textContent).toContain('22.3 C')
    render(
      renderInfoItem({
        ...options,
        details: {
          ...options.details,
          template: '{{state.raw|formatNumber({decimals: 0})}}',
        },
      }),
      container
    )
    expect(container.querySelectorAll('.entity-action')).toHaveLength(1)
    if (display !== 'button') expect(container.textContent).toContain('22 C')
  }
)

test('relative-time template hydrates HA properties', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const h = hass()
  render(
    renderInfoItem({
      state: {
        entity_id: 'sensor.date',
        state: '2026-09-01T10:00:00Z',
        attributes: {},
      },
      hass: h,
      details: { heading: 'Date', template: '{{state.raw|relativetime}}' },
    }),
    container
  )
  await (container.querySelector('simple-thermostat-template-content') as any)
    .updateComplete
  const relative = container.querySelector('ha-relative-time') as any
  expect(relative.datetime).toBe('2026-09-01T10:00:00Z')
  expect(relative.hass).toBe(h)
})

test('default fan labels use HA translations but explicit labels remain unchanged', async () => {
  const h = {
    ...hass(),
    formatEntityAttributeValue: (_state, _attribute, value) =>
      `${value} translated`,
  }
  const c = card({ control: { fan: { high: { name: 'Custom' } } } }, h)
  await c.updateComplete
  expect(c.shadowRoot?.textContent).toContain('low translated')
  expect(c.shadowRoot?.textContent).toContain('Custom')
  expect(c.shadowRoot?.textContent).not.toContain('Custom translated')
})

test('embedded CSS keeps conditional rules in a stylesheet, not inline', async () => {
  const css = '@media (max-width: 100px) { ha-card { background: red; } }'
  const c = card({ embedded: true, card_mod: { style: css } })
  await c.updateComplete
  expect(
    c.shadowRoot?.querySelector('ha-card')?.getAttribute('style')
  ).not.toContain('red')
  expect(c.shadowRoot?.querySelector('ha-card style')?.textContent).toContain(
    css
  )
})

test('group resumes by meaningful transitions, not subsequent measurement updates', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-01T12:00:00Z'))
  const group = document.createElement('audit-group') as any
  const config = {
    auto_select: { mode: 'recent_activity', manual_pause_ms: 30000 },
    cards: ['climate.room', 'climate.other'],
  }
  group.setConfig(config)
  const h = hass()
  h.states['climate.other'] = {
    ...climate,
    entity_id: 'climate.other',
    state: 'off',
  }
  group.hass = h
  document.body.append(group)
  await group.updateComplete
  group.hass = {
    ...h,
    states: {
      ...h.states,
      'climate.other': {
        ...h.states['climate.other'],
        state: 'cool',
        attributes: { ...climate.attributes, hvac_action: 'cooling' },
      },
    },
  }
  await group.updateComplete
  group.selectEntity('climate.room')
  group.hass = {
    ...group.hass,
    states: {
      ...group.hass.states,
      'climate.room': {
        ...climate,
        last_updated: '2026-09-01T12:01:00Z',
        attributes: { ...climate.attributes, current_temperature: 20 },
      },
    },
  }
  await group.updateComplete
  jest.advanceTimersByTime(30000)
  expect(group.selectedEntity).toBe('climate.other')
  const reloaded = document.createElement('audit-group') as any
  reloaded.setConfig(config)
  reloaded.hass = group.hass
  document.body.append(reloaded)
  await reloaded.updateComplete
  expect(reloaded.getMostRecentStateActivityCandidate().target.entity).toBe(
    'climate.other'
  )
})

test('startup uses state changes, not newer measurement timestamps', async () => {
  const group = document.createElement('audit-group') as any
  group.setConfig({
    auto_select: 'recent_activity',
    remember_selection: false,
    cards: ['climate.room', 'climate.other'],
  })
  const h = hass()
  h.states['climate.room'] = {
    ...climate,
    last_updated: '2026-09-01T15:00:00Z',
  }
  h.states['climate.other'] = {
    ...climate,
    entity_id: 'climate.other',
    last_changed: '2026-09-01T12:00:00Z',
  }
  group.hass = h
  document.body.append(group)
  await group.updateComplete
  expect(group.selectedEntity).toBe('climate.other')
  const write = jest.spyOn(Storage.prototype, 'setItem')
  group.hass = {
    ...h,
    states: {
      ...h.states,
      'climate.room': {
        ...h.states['climate.room'],
        attributes: { ...climate.attributes, current_temperature: 23 },
      },
    },
  }
  await group.updateComplete
  expect(write).not.toHaveBeenCalled()
  expect(group.selectedEntity).toBe('climate.other')
})

test('group applies order-only edits to both control rows and options', async () => {
  const group = document.createElement('audit-group') as any
  group.setConfig({
    cards: [
      {
        entity: 'climate.room',
        control: { fan: { low: {}, high: {} }, hvac: true },
      },
    ],
  })
  group.hass = hass()
  document.body.append(group)
  await group.updateComplete
  await group.embeddedCard.updateComplete
  expect(group.embeddedCard.modes.map((mode) => mode.type)).toEqual([
    'fan',
    'hvac',
  ])

  group.setConfig({
    cards: [
      {
        entity: 'climate.room',
        control: { hvac: true, fan: { high: {}, low: {} } },
      },
    ],
  })
  await group.updateComplete
  await group.embeddedCard.updateComplete
  expect(group.embeddedCard.modes.map((mode) => mode.type)).toEqual([
    'hvac',
    'fan',
  ])
  expect(
    group.embeddedCard.modes
      .find((mode) => mode.type === 'fan')
      .list.map((mode) => mode.value)
  ).toEqual(['high', 'low'])
})

test('activity selection still works with browser storage blocked', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const group = document.createElement('audit-group') as any
  group.setConfig({
    auto_select: 'recent_activity',
    cards: ['climate.room', 'climate.other'],
  })
  const h = hass()
  h.states['climate.other'] = {
    ...climate,
    entity_id: 'climate.other',
    state: 'off',
  }
  group.hass = h
  document.body.append(group)
  await group.updateComplete
  group.hass = {
    ...h,
    states: {
      ...h.states,
      'climate.other': { ...h.states['climate.other'], state: 'cool' },
    },
  }
  await group.updateComplete
  expect(group.selectedEntity).toBe('climate.other')
})
