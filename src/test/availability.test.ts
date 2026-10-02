import { render } from 'lit'
import SimpleThermostat from '../main'
import SimpleThermostatGroup from '../group'
import renderInfoItem from '../components/infoItem'
import { isEntityAvailable } from '../entityAvailability'

customElements.define('availability-card', SimpleThermostat)
customElements.define('availability-group', SimpleThermostatGroup)
const entity = (id: string, state: string, attributes = {}) => ({
  entity_id: id,
  state,
  attributes,
})
function hass(state = 'unavailable', relay = 'off') {
  return {
    states: {
      'climate.pool': entity('climate.pool', state, {
        temperature: 25,
        current_temperature: 20,
        min_temp: 7,
        max_temp: 35,
        hvac_modes: ['off', 'heat'],
        fan_modes: ['low', 'high'],
      }),
      'switch.power': entity('switch.power', relay),
      'select.fan': entity('select.fan', 'low', { options: ['low', 'high'] }),
    } as Record<string, any>,
    config: { unit_system: { temperature: 'C' } },
    localize: (key: string) => key,
    callService: jest.fn(),
  }
}
function makeCard(h: ReturnType<typeof hass>) {
  const c = document.createElement('availability-card') as SimpleThermostat
  c.setConfig({
    entity: 'climate.pool',
    header: { toggle: { entity: 'switch.power' } },
    footer: [{ entity: 'switch.power' }],
    control: { hvac: true, fan: { entity: 'select.fan' } },
  } as any)
  c.hass = h as any
  document.body.append(c)
  return c
}
afterEach(() => {
  document.body.replaceChildren()
  jest.useRealTimers()
  localStorage.clear()
})

test.each(['unavailable', 'unknown'])(
  'available relay and helper remain usable with %s thermostat',
  async (state) => {
    const h = hass(state)
    const c = makeCard(h)
    await c.updateComplete
    const toggle = c.shadowRoot!.querySelector('ha-switch') as any
    expect(toggle.disabled).toBe(false)
    toggle.checked = true
    toggle.dispatchEvent(new Event('change'))
    expect(h.callService).toHaveBeenCalledWith('homeassistant', 'turn_on', {
      entity_id: 'switch.power',
    })
    const footer = c.shadowRoot!.querySelector('.footer-toggle') as HTMLElement
    expect(footer.getAttribute('aria-disabled')).toBe('false')
    footer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    const fan = c.shadowRoot!.querySelector(
      '.modes.fan .mode-item'
    ) as HTMLElement
    expect(fan.getAttribute('aria-disabled')).toBe('false')
    fan.click()
    expect(h.callService).toHaveBeenCalledWith('select', 'select_option', {
      entity_id: 'select.fan',
      option: 'low',
    })
    h.callService.mockClear()
    const mode = c.shadowRoot!.querySelector(
      '.modes.hvac .mode-item'
    ) as HTMLElement
    expect(mode.getAttribute('aria-disabled')).toBe('true')
    expect(mode.tabIndex).toBe(-1)
    mode.click()
    mode.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    c.setMode('hvac', 'heat')
    c.setTemperature(1, 'temperature')
    expect(c._stepSetpoint('temperature', 1, 7, 35)).toBe(false)
    expect(h.callService).not.toHaveBeenCalled()
    expect(
      [
        ...c.shadowRoot!.querySelectorAll<HTMLButtonElement>(
          '.thermostat-trigger'
        ),
      ].every((b) => b.disabled)
    ).toBe(true)
    h.states['climate.pool'] = { ...h.states['climate.pool'], state: 'heat' }
    c.hass = { ...h } as any
    await c.updateComplete
    expect(
      c
        .shadowRoot!.querySelector('.modes.hvac .mode-item')!
        .getAttribute('aria-disabled')
    ).toBe('false')
    c.setMode('hvac', 'off')
    expect(h.callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.pool',
      hvac_mode: 'off',
    })
  }
)

test.each(['unavailable', 'unknown'])(
  'relay %s is disabled independently',
  async (state) => {
    const h = hass('heat', state)
    const c = makeCard(h)
    await c.updateComplete
    const toggle = c.shadowRoot!.querySelector('ha-switch') as any
    expect(toggle.disabled).toBe(true)
    toggle.checked = true
    toggle.dispatchEvent(new Event('change'))
    const footer = c.shadowRoot!.querySelector('.footer-toggle') as HTMLElement
    expect(footer.getAttribute('aria-disabled')).toBe('true')
    footer.click()
    footer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    c.toggleFooterEntity('switch.power', true)
    expect(h.callService).not.toHaveBeenCalled()
  }
)

test('queued setpoint is not sent after thermostat becomes unavailable', async () => {
  jest.useFakeTimers()
  const h = hass('heat')
  const c = makeCard(h)
  await c.updateComplete
  c.setTemperature(1, 'temperature')
  h.states['climate.pool'] = {
    ...h.states['climate.pool'],
    state: 'unavailable',
  }
  c.hass = { ...h } as any
  jest.advanceTimersByTime(600)
  expect(h.callService).not.toHaveBeenCalled()
})

test.each(['off', 'unknown', 'unavailable', 'missing'])(
  'group omits an unavailable thermostat even when its header relay is %s',
  async (state) => {
    const h = hass('unavailable', state)
    if (state === 'missing') delete h.states['switch.power']
    const group = document.createElement(
      'availability-group'
    ) as SimpleThermostatGroup
    group.setConfig({
      cards: [
        {
          entity: 'climate.pool',
          header: { toggle: { entity: 'switch.power' } },
        },
      ],
    } as any)
    group.hass = h as any
    document.body.append(group)
    await group.updateComplete
    expect(group.shadowRoot!.querySelector('.group-card')).toBeNull()
    expect(group.shadowRoot!.querySelector('.group-toggle')).toBeNull()
    expect(h.callService).not.toHaveBeenCalled()
  }
)

test.each(['row', 'toggle', 'button', 'chip'])(
  'extra entity %s display follows its own availability',
  (display) => {
    for (const state of ['off', 'unavailable']) {
      const h = hass('unavailable', state)
      const container = document.createElement('div')
      render(
        renderInfoItem({
          hass: h,
          state: h.states['switch.power'],
          details: { display: display as any, heading: 'Power' },
        }),
        container
      )
      const control = container.querySelector('ha-switch, button') as any
      expect(control.disabled).toBe(state === 'unavailable')
      if (display === 'row') {
        control.checked = true
        control.dispatchEvent(new Event('change'))
      } else control.click()
      expect(h.callService).toHaveBeenCalledTimes(state === 'off' ? 1 : 0)
    }
  }
)

test.each(['button', 'input_button', 'scene'])(
  '%s remains usable before first activation',
  (domain) => {
    expect(isEntityAvailable(entity(`${domain}.action`, 'unknown'))).toBe(true)
    expect(isEntityAvailable(entity(`${domain}.action`, 'unavailable'))).toBe(
      false
    )
    expect(isEntityAvailable(undefined)).toBe(false)
  }
)
