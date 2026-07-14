import SimpleThermostat from '../main'

const tagName = 'simple-thermostat-real-debounce-test'

function createCard() {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SimpleThermostat)
  }

  return document.createElement(tagName) as SimpleThermostat
}

function createHass(callService: jest.Mock) {
  return {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 68,
          current_temperature: 68,
          min_temp: 45,
          max_temp: 90,
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°F',
      },
    },
    localize: (key: string) => key,
    callService,
  }
}

test('rapid setpoint changes are collapsed into one final service call', async () => {
  jest.useFakeTimers()
  document.body.innerHTML = ''
  const callService = jest.fn()
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    step_size: 1,
    decimals: 0,
  } as any)
  card.hass = createHass(callService)

  await card.updateComplete

  card.setTemperature(1, 'temperature')
  jest.advanceTimersByTime(50)
  card.setTemperature(1, 'temperature')
  jest.advanceTimersByTime(50)
  card.setTemperature(1, 'temperature')
  jest.advanceTimersByTime(50)
  card.setTemperature(1, 'temperature')

  jest.advanceTimersByTime(499)
  expect(callService).not.toHaveBeenCalled()

  jest.advanceTimersByTime(1)
  expect(callService).toHaveBeenCalledTimes(1)
  expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
    entity_id: 'climate.living_room',
    temperature: 72,
  })

  jest.useRealTimers()
})
