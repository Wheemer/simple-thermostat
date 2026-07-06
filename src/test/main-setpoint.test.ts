jest.mock('debounce-fn', () => ({
  __esModule: true,
  default: (fn: unknown) => Object.assign(fn as object, { cancel: jest.fn() }),
}))
jest.mock('../styles.css', () => '')

import SimpleThermostat from '../main'

const tagName = 'simple-thermostat-v3-setpoint-test'

function createCard() {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SimpleThermostat)
  }

  return document.createElement(tagName) as SimpleThermostat
}

test('off climate setpoint disables both setpoint steppers', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.comet_dect',
    header: false,
    control: false,
  } as any)
  card.hass = {
    states: {
      'climate.comet_dect': {
        entity_id: 'climate.comet_dect',
        state: 'off',
        attributes: {
          temperature: null,
          current_temperature: 18,
          min_temp: 4,
          max_temp: 30,
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
    callService: jest.fn(),
  }

  await card.updateComplete

  const steppers = card.shadowRoot?.querySelectorAll(
    'ha-icon-button.thermostat-trigger'
  )

  expect(steppers).toHaveLength(2)
  expect(steppers?.[0].hasAttribute('disabled')).toBe(true)
  expect(steppers?.[1].hasAttribute('disabled')).toBe(true)
})
