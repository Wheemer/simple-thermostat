import SimpleThermostat from '../main'

const tagName = 'simple-thermostat-main-test'

function createCard() {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SimpleThermostat)
  }

  return document.createElement(tagName) as SimpleThermostat
}

test('does not throw if Home Assistant is assigned before config', () => {
  const card = createCard()

  expect(() => {
    card.hass = {
      states: {},
    }
  }).not.toThrow()
})

test('hydrates when Home Assistant is assigned before config', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  const hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  card.hass = hass
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
  } as any)

  await card.updateComplete

  expect(card.entity?.entity_id).toBe('climate.living_room')
  expect(card.shadowRoot?.textContent).toContain('19.0')
})

test('keeps a card shell before config is assigned', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('ha-card.loading')).not.toBe(null)
})

test('renders a loading shell after config before Home Assistant is assigned', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
  } as any)

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('ha-card.loading')).not.toBe(null)
  expect(card.shadowRoot?.textContent).not.toContain('Entity not available')
})

test('marks embedded cards at the host and card surface', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    embedded: true,
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          temperature: 20,
          current_temperature: 21,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(card.hasAttribute('embedded')).toBe(true)
  expect(card.shadowRoot?.querySelector('ha-card.embedded')).not.toBe(null)
  expect(card.shadowRoot?.querySelector('header')).toBe(null)
  expect(card.shadowRoot?.querySelector('.embedded-header-reserve')).not.toBe(
    null
  )
})

test('resets derived entity state when config changes on a reused card', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  const hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          temperature: 20,
          current_temperature: 21,
          min_temp: 7,
          max_temp: 30,
        },
      },
      'sensor.extra': {
        entity_id: 'sensor.extra',
        state: '12',
        attributes: { friendly_name: 'Extra' },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
  }

  card.hass = hass
  card.setConfig({
    entity: 'climate.living_room',
    entities: [{ entity: 'sensor.extra' }],
  } as any)
  await card.updateComplete

  expect(card.entities).toHaveLength(1)

  card.setConfig({
    entity: 'climate.living_room',
    hide: { state: true },
    layout: { step: 'row' },
    control: { hvac: true },
  } as any)
  await card.updateComplete

  expect(card.entities).toHaveLength(0)
  expect(card.showEntities).toBe(true)
  expect(card.config.hide?.state).toBe(true)
  expect(card.config.layout?.step).toBe('row')
})

test('cleans pending timers and setpoint updates on disconnect', () => {
  jest.useFakeTimers()
  const card = createCard()

  card._updatingValuesTimeout = setTimeout(() => undefined, 1000)
  card._holdTimer = setTimeout(() => undefined, 1000)
  card._clickTimer = setTimeout(() => undefined, 1000)
  ;(card as any)._setpointUpdateTimer = setTimeout(() => undefined, 1000)
  ;(card as any)._pendingSetpointValues = { temperature: 22 }

  card.disconnectedCallback()

  expect(card._updatingValuesTimeout).toBe(null)
  expect(card._holdTimer).toBe(null)
  expect(card._clickTimer).toBe(null)
  expect((card as any)._setpointUpdateTimer).toBe(null)
  expect((card as any)._pendingSetpointValues).toBe(null)

  jest.useRealTimers()
})

test('uses configured setpoint debounce delay', () => {
  const card = createCard()

  card.setConfig({
    entity: 'climate.living_room',
    setpoint_debounce_ms: 750,
  } as any)

  expect((card as any)._setpointDebounce).toBe(750)
})

test('allows immediate setpoint updates when debounce is zero', () => {
  const card = createCard()
  const sendSetpointValues = jest
    .spyOn(card as any, '_sendSetpointValues')
    .mockImplementation(() => undefined)

  card.setConfig({
    entity: 'climate.living_room',
    setpoint_debounce_ms: 0,
  } as any)
  ;(card as any)._scheduleSetpointValues({ temperature: 22 })

  expect((card as any)._setpointDebounce).toBe(0)
  expect(sendSetpointValues).toHaveBeenCalledWith({ temperature: 22 })
})

test('estimates card size from visible sections', async () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    entities: false,
    hide_setpoint: true,
  } as any)

  expect(card.getCardSize()).toBe(1)

  card.header = { name: 'Living Room', icon: false } as any
  card.showEntities = true
  card.entities = [{ entity: 'sensor.one' }, { entity: 'sensor.two' }] as any
  card.modes = [{ type: 'hvac' }, { type: 'preset' }] as any
  card.config.hide_setpoint = false

  expect(card.getCardSize()).toBe(5)
})

test('does not apply card_mod ha-card surface declarations inline on normal cards', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    card_mod: {
      style:
        'ha-card { background: linear-gradient(145deg, red, blue); border-radius: 8px; }',
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          temperature: 20,
          current_temperature: 21,
          min_temp: 7,
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
  }

  await card.updateComplete

  const surface = card.shadowRoot?.querySelector('ha-card') as HTMLElement
  expect(surface.getAttribute('style')).not.toContain(
    'background: linear-gradient(145deg, red, blue)'
  )
  expect(surface.getAttribute('style')).not.toContain('border-radius: 8px')
})

test('applies card_mod ha-card surface declarations inline only for embedded cards', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    embedded: true,
    card_mod: {
      style:
        'ha-card { background: linear-gradient(145deg, red, blue); border-radius: 8px; }',
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          temperature: 20,
          current_temperature: 21,
          min_temp: 7,
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
  }

  await card.updateComplete

  const surface = card.shadowRoot?.querySelector('ha-card') as HTMLElement
  expect(surface.getAttribute('style')).toContain(
    'background: linear-gradient(145deg, red, blue)'
  )
  expect(surface.getAttribute('style')).toContain('border-radius: 8px')
})

test('keeps last rendered entity during transient missing hass updates', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete
  const previousEntity = card.entity

  card.hass = {
    states: {},
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
  }

  await card.updateComplete

  expect(card.entity).toBe(previousEntity)
  expect(card.shadowRoot?.textContent).not.toContain('Entity not available')
  expect(card.shadowRoot?.textContent).toContain('19.0')
})

test('renders the main dashboard thermostat config through detach and reattach', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  const config = {
    type: 'custom:simple-thermostat',
    entity: 'climate.thermostat',
    step_size: 0.1,
    hide: {
      state: true,
      temperature: true,
    },
    header: {
      toggle: {
        entity: 'switch.furnace_heat',
        name: 'Furnace',
      },
    },
    entities: [
      {
        entity: 'sensor.average_temperature_group',
        icon: 'mdi:thermometer',
      },
      {
        entity: 'sensor.average_humidity_group',
        icon: 'mdi:water-percent',
      },
      {
        entity: 'fan.furnacerelay_l4',
        icon: 'mdi:fan',
      },
      {
        entity: 'sensor.pid_output',
        icon: 'mdi:calculator-variant-outline',
      },
    ],
    layout: {
      entities: {
        labels: true,
      },
    },
    label: {},
  }
  const hass = {
    states: {
      'climate.thermostat': {
        entity_id: 'climate.thermostat',
        state: 'heat',
        attributes: {
          hvac_modes: ['heat', 'off'],
          min_temp: 7,
          max_temp: 35,
          target_temp_step: 0.1,
          preset_modes: [
            'none',
            'away',
            'eco',
            'boost',
            'comfort',
            'home',
            'sleep',
            'activity',
          ],
          current_temperature: 23.2,
          temperature: 22.4,
          hvac_action: 'idle',
          preset_mode: 'none',
          friendly_name: 'Thermostat',
          supported_features: 401,
        },
      },
      'switch.furnace_heat': {
        entity_id: 'switch.furnace_heat',
        state: 'off',
        attributes: {
          icon: 'mdi:fire',
          friendly_name: 'Furnace Heat',
        },
      },
      'sensor.average_temperature_group': {
        entity_id: 'sensor.average_temperature_group',
        state: '23.1299436102973',
        attributes: {
          unit_of_measurement: '°C',
          device_class: 'temperature',
          friendly_name: 'Average Temperature Group',
        },
      },
      'sensor.average_humidity_group': {
        entity_id: 'sensor.average_humidity_group',
        state: '54.0043373786079',
        attributes: {
          unit_of_measurement: '%',
          device_class: 'humidity',
          friendly_name: 'Average Humidity Group',
        },
      },
      'fan.furnacerelay_l4': {
        entity_id: 'fan.furnacerelay_l4',
        state: 'on',
        attributes: {
          friendly_name: 'CircFan',
          supported_features: 48,
        },
      },
      'sensor.pid_output': {
        entity_id: 'sensor.pid_output',
        state: '0.0',
        attributes: {
          unit_of_measurement: '%',
          friendly_name: 'PID Output',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
    formatEntityName: (entity) => entity.attributes.friendly_name,
    formatEntityState: (entity) => entity.state,
  }

  document.body.appendChild(card)
  expect(() => card.setConfig(config as any)).not.toThrow()
  expect(() => {
    card.hass = hass as any
  }).not.toThrow()
  await card.updateComplete

  expect(card.shadowRoot?.querySelector('ha-card')).not.toBe(null)
  expect(card.shadowRoot?.textContent).toContain('Thermostat')

  card.remove()
  document.body.appendChild(card)
  card.hass = hass as any
  await card.updateComplete

  expect(card.shadowRoot?.querySelector('ha-card')).not.toBe(null)
  expect(card.shadowRoot?.textContent).toContain('Thermostat')
})

test('keeps rendered state across temporary Lovelace detach and reattach', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete
  expect(card.shadowRoot?.textContent).toContain('19.0')

  card.remove()
  document.body.appendChild(card)

  await card.updateComplete

  expect(card.entity?.entity_id).toBe('climate.living_room')
  expect(card.shadowRoot?.querySelector('ha-card')).not.toBe(null)
  expect(card.shadowRoot?.textContent).toContain('19.0')
})

test('renders entity-missing warning inside a card shell', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.missing',
  } as any)
  card.hass = {
    states: {},
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
  }

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('ha-card.missing-entity')).not.toBe(
    null
  )
  expect(card.shadowRoot?.querySelector('ha-card ha-alert')).not.toBe(null)
  expect(card.shadowRoot?.textContent).toContain(
    'Entity not available: climate.missing'
  )
})

test('does not throw when configured extra entity is transiently missing', async () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    entities: [
      {
        entity: 'sensor.pid_heat',
        attribute: 'output',
        name: 'PID',
      },
    ],
  } as any)

  expect(() => {
    card.hass = {
      states: {
        'climate.living_room': {
          entity_id: 'climate.living_room',
          state: 'heat',
          attributes: {
            temperature: 20,
            current_temperature: 19,
            min_temp: 7,
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
    }
  }).not.toThrow()
})

test('renders main heat card shape with header toggle and extra entities', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.thermostat',
    step_size: 0.1,
    hide: {
      state: true,
      temperature: true,
    },
    header: {
      toggle: {
        entity: 'switch.furnace_heat',
        name: 'Furnace',
      },
    },
    entities: [
      {
        entity: 'sensor.average_temperature_group',
        icon: 'mdi:thermometer',
      },
      {
        entity: 'sensor.average_humidity_group',
        icon: 'mdi:water-percent',
      },
      {
        entity: 'fan.furnacerelay_l4',
        icon: 'mdi:fan',
      },
      {
        entity: 'sensor.pid_output',
        icon: 'mdi:calculator-variant-outline',
      },
    ],
    layout: {
      entities: {
        labels: true,
      },
    },
    label: {},
  } as any)

  expect(() => {
    card.hass = {
      states: {
        'climate.thermostat': {
          entity_id: 'climate.thermostat',
          state: 'heat',
          attributes: {
            friendly_name: 'Thermostat',
            hvac_modes: ['heat', 'off'],
            preset_modes: [
              'none',
              'away',
              'eco',
              'boost',
              'comfort',
              'home',
              'sleep',
              'activity',
            ],
            current_temperature: 20.6,
            temperature: 20.6,
            min_temp: 7,
            max_temp: 35,
            target_temp_step: 0.1,
            preset_mode: 'eco',
          },
        },
        'switch.furnace_heat': {
          entity_id: 'switch.furnace_heat',
          state: 'on',
          attributes: {
            friendly_name: 'Furnace Heat',
            icon: 'mdi:fire',
          },
        },
        'sensor.average_temperature_group': {
          entity_id: 'sensor.average_temperature_group',
          state: '20.6',
          attributes: { friendly_name: 'Average Temperature Group' },
        },
        'sensor.average_humidity_group': {
          entity_id: 'sensor.average_humidity_group',
          state: '50.5',
          attributes: { friendly_name: 'Average Humidity Group' },
        },
        'fan.furnacerelay_l4': {
          entity_id: 'fan.furnacerelay_l4',
          state: 'off',
          attributes: { friendly_name: 'CircFan' },
        },
        'sensor.pid_output': {
          entity_id: 'sensor.pid_output',
          state: '4.0',
          attributes: {
            friendly_name: 'PID Output',
            unit_of_measurement: '%',
          },
        },
      },
      config: {
        unit_system: {
          temperature: '°C',
        },
      },
      localize: (key: string) => key,
      formatEntityName: (entity: any) => entity.attributes.friendly_name,
      formatEntityState: (entity: any) => entity.state,
    }
  }).not.toThrow()

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('ha-card')).not.toBe(null)
  expect(card.shadowRoot?.textContent).toContain('Thermostat')
  expect(card.shadowRoot?.textContent).toContain('Furnace')
  expect(card.shadowRoot?.textContent).toContain('4.0')
})

test('fan controls use fan_mode attribute as active mode', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: ['fan'],
  })
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          fan_modes: ['low', 'high'],
          fan_mode: 'high',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  expect(card.modes).toHaveLength(1)
  expect(card.modes[0].type).toBe('fan')
  expect(card.modes[0].mode).toBe('high')
})

test('climate controls preserve explicit array order', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: ['swing', 'fan', 'hvac'],
  })
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          hvac_modes: ['off', 'cool'],
          fan_modes: ['low', 'high'],
          fan_mode: 'high',
          swing_modes: ['off', 'vertical'],
          swing_mode: 'off',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  expect(card.modes.map(({ type }) => type)).toEqual(['swing', 'fan', 'hvac'])
})

test('climate controls preserve explicit object order', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: {
      hvac: true,
      fan: true,
      swing: true,
      preset: true,
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          hvac_modes: ['off', 'cool'],
          fan_modes: ['low', 'high'],
          fan_mode: 'high',
          swing_modes: ['off', 'vertical'],
          swing_mode: 'off',
          preset_modes: ['eco', 'boost'],
          preset_mode: 'eco',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  expect(card.modes.map(({ type }) => type)).toEqual([
    'hvac',
    'fan',
    'swing',
    'preset',
  ])
})

test('climate control options preserve explicit YAML order', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: {
      fan: {
        quiet: true,
        low: true,
        medium: true,
        high: true,
        auto: true,
      },
      preset: {
        none: true,
        sleep: true,
        boost: true,
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          fan_modes: ['auto', 'low', 'medium', 'high', 'quiet'],
          fan_mode: 'auto',
          preset_modes: ['boost', 'none', 'sleep'],
          preset_mode: 'none',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  expect(card.modes.find(({ type }) => type === 'fan')?.list.map(({ value }) => value)).toEqual([
    'quiet',
    'low',
    'medium',
    'high',
    'auto',
  ])
  expect(
    card.modes.find(({ type }) => type === 'preset')?.list.map(({ value }) => value)
  ).toEqual(['none', 'sleep', 'boost'])
})

test('configured control options append unconfigured integration options', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: {
      fan: {
        quiet: true,
        auto: true,
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          fan_modes: ['auto', 'low', 'medium', 'high', 'quiet'],
          fan_mode: 'auto',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  expect(card.modes[0].list.map(({ value }) => value)).toEqual([
    'quiet',
    'auto',
    'low',
    'medium',
    'high',
  ])
})

test('configured mode order can be supplied explicitly for numeric options', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: {
      fan: {
        _order: ['auto', 'quiet', '1', '2', '3', '4', '5'],
        '1': {
          name: false,
        },
        '2': {
          name: false,
        },
        '3': {
          name: false,
        },
        '4': {
          name: false,
        },
        '5': {
          name: false,
        },
        auto: {
          name: false,
          icon: 'mdi:fan-auto',
        },
        quiet: {
          name: false,
          icon: 'mdi:volume-off',
        },
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          fan_modes: ['1', '2', '3', '4', '5', 'auto', 'quiet'],
          fan_mode: 'auto',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  const fan = card.modes.find(({ type }) => type === 'fan')
  expect(fan?.list.map(({ value }) => value)).toEqual([
    'auto',
    'quiet',
    '1',
    '2',
    '3',
    '4',
    '5',
  ])
  expect(fan?.list.map(({ icon }) => icon)).toEqual([
    'mdi:fan-auto',
    'mdi:volume-off',
    'mdi:fan-speed-1',
    'mdi:fan-speed-2',
    'mdi:fan-speed-3',
    'st:fan-speed-4',
    'st:fan-speed-5',
  ])
})

test('swing controls preserve explicit icon config without enabling default swing icons', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: {
      swing: {
        vertical: {
          name: false,
          icon: 'mdi:air-purifier',
        },
        Vertical_1: {
          name: false,
          icon: 'mdi:arrow-top-right',
        },
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          hvac_modes: ['off', 'cool'],
          swing_modes: ['vertical', 'vertical_1'],
          swing_mode: 'vertical',
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(card.modes).toHaveLength(1)
  expect(card.modes[0].list).toEqual([
    {
      value: 'vertical',
      name: false,
      icon: 'mdi:air-purifier',
      iconConfigured: true,
    },
    {
      value: 'vertical_1',
      name: false,
      icon: 'mdi:arrow-top-right',
      iconConfigured: true,
    },
  ])
  expect(
    Array.from(
      card.shadowRoot?.querySelectorAll('ha-icon.mode-icon') ?? []
    ).map((icon) => (icon as any).icon)
  ).toEqual(['mdi:air-purifier', 'mdi:arrow-top-right'])
})

test('swing controls can use an explicitly configured select entity', async () => {
  const callService = jest.fn()
  const card = createCard()

  card.setConfig({
    entity: 'climate.hus_varmepumpe',
    header: false,
    control: {
      swing_vertical: {
        entity: 'select.hus_varmepumpe_vertical_swing_mode',
        auto: true,
        up: true,
        center: true,
        down: true,
      },
      swing_horizontal: {
        entity: 'select.hus_varmepumpe_horizontal_swing_mode',
      },
    },
  } as any)
  card.hass = {
    callService,
    states: {
      'climate.hus_varmepumpe': {
        entity_id: 'climate.hus_varmepumpe',
        state: 'heat',
        attributes: {
          hvac_modes: ['off', 'heat'],
          temperature: 22,
          current_temperature: 21,
        },
      },
      'select.hus_varmepumpe_vertical_swing_mode': {
        entity_id: 'select.hus_varmepumpe_vertical_swing_mode',
        state: 'center',
        attributes: {
          options: ['swing', 'auto', 'up', 'center', 'down'],
        },
      },
      'select.hus_varmepumpe_horizontal_swing_mode': {
        entity_id: 'select.hus_varmepumpe_horizontal_swing_mode',
        state: 'left',
        attributes: {
          options: ['auto', 'left', 'center', 'right'],
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
  }

  const vertical = card.modes.find(({ type }) => type === 'swing_vertical')
  const horizontal = card.modes.find(({ type }) => type === 'swing_horizontal')

  expect(vertical?.entity).toBe('select.hus_varmepumpe_vertical_swing_mode')
  expect(vertical?.mode).toBe('center')
  expect(vertical?.list.map(({ value }) => value)).toEqual([
    'auto',
    'up',
    'center',
    'down',
    'swing',
  ])
  expect(horizontal?.entity).toBe(
    'select.hus_varmepumpe_horizontal_swing_mode'
  )
  expect(horizontal?.mode).toBe('left')
  expect(horizontal?.list.map(({ value }) => value)).toEqual([
    'auto',
    'left',
    'center',
    'right',
  ])

  card.setMode('swing_vertical', 'down')

  expect(callService).toHaveBeenCalledWith('select', 'select_option', {
    entity_id: 'select.hus_varmepumpe_vertical_swing_mode',
    option: 'down',
  })
})

test('mode controls preserve explicit hidden names', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    layout: {
      mode: {
        headings: false,
        icons: true,
        names: true,
      },
    },
    control: {
      hvac: {
        off: {
          name: false,
        },
        heat: {
          name: false,
        },
        cool: {
          name: false,
        },
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          hvac_modes: ['off', 'heat', 'cool'],
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
    formatEntityState: (entity: any) => entity.state,
  }

  await card.updateComplete

  expect(card.modes[0].list.map(({ name }) => name)).toEqual([
    false,
    false,
    false,
  ])
  expect(card.shadowRoot?.querySelectorAll('.hvac .mode-item')).toHaveLength(3)
  expect(card.shadowRoot?.querySelector('.hvac .mode-label')).toBe(null)
})

test('mode options can hide when the entity is off from card config', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    layout: {
      mode: {
        headings: false,
        icons: true,
        names: true,
      },
    },
    control: {
      hvac: {
        off: {
          hide_when_off: true,
        },
        heat: true,
        cool: true,
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'off',
        attributes: {
          hvac_modes: ['off', 'heat', 'cool'],
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
    formatEntityState: (entity: any) => entity.state,
  }

  await card.updateComplete

  expect(card.modes[0].list.map(({ value, hide_when_off }) => ({
    value,
    hide_when_off,
  }))).toEqual([
    { value: 'off', hide_when_off: true },
    { value: 'heat', hide_when_off: undefined },
    { value: 'cool', hide_when_off: undefined },
  ])
  const modeItems = Array.from(
    card.shadowRoot?.querySelectorAll('.hvac .mode-item') ?? []
  )

  expect(modeItems).toHaveLength(2)
  expect(modeItems.map((item) => item.textContent?.trim())).toEqual([
    'heat',
    'cool',
  ])
})

test('hvac off option can hide while off with shortcut config', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    layout: {
      mode: {
        headings: false,
        icons: true,
        names: true,
      },
    },
    control: {
      hvac: {
        hide_off_when_off: true,
        off: true,
        heat: true,
        cool: true,
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'off',
        attributes: {
          hvac_modes: ['off', 'heat', 'cool'],
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
    formatEntityState: (entity: any) => entity.state,
  }

  await card.updateComplete

  const modeItems = Array.from(
    card.shadowRoot?.querySelectorAll('.hvac .mode-item') ?? []
  )

  expect(card.modes[0].list.map(({ value, hide_when_off }) => ({
    value,
    hide_when_off,
  }))).toEqual([
    { value: 'off', hide_when_off: true },
    { value: 'heat', hide_when_off: undefined },
    { value: 'cool', hide_when_off: undefined },
  ])
  expect(modeItems.map((item) => item.textContent?.trim())).toEqual([
    'heat',
    'cool',
  ])
})

test('control rows can hide when the entity is off from card config', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: {
      hvac: {
        hide_when_off: true,
        off: true,
        heat: true,
        cool: true,
      },
    },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'off',
        attributes: {
          hvac_modes: ['off', 'heat', 'cool'],
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
    formatEntityState: (entity: any) => entity.state,
  }

  await card.updateComplete

  expect(card.modes[0].hide_when_off).toBe(true)
  expect(card.shadowRoot?.querySelector('.hvac')).toBe(null)
})

test('fan card does not fall back to climate current value or headings', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'fan.range_hood',
    header: { name: 'Range Hood Fan' },
    layout: {
      mode: {
        headings: false,
        names: true,
        icons: true,
      },
    },
  } as any)
  card.hass = {
    states: {
      'fan.range_hood': {
        entity_id: 'fan.range_hood',
        state: 'off',
        attributes: {
          friendly_name: 'Range Hood Fan',
          preset_modes: ['off', 'low', 'medium', 'high', 'max'],
          preset_mode: 'off',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
  }

  await card.updateComplete

  const text = card.shadowRoot?.textContent ?? ''
  expect(text).not.toContain('Currently')
  expect(text).not.toContain('N/A')
  expect(text).not.toContain('°C')
  expect(text).not.toContain('ui.card.climate.preset_mode')
  expect(card.shadowRoot?.querySelector('.mode-title')).toBe(null)
  expect(
    (card.shadowRoot?.querySelector('ha-icon.header__icon') as any)?.icon
  ).toBe('mdi:fan-off')
})

test('fan card shows current temperature when the fan exposes one', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'fan.living_room_ac',
    header: { name: 'Living Room AC' },
  } as any)
  card.hass = {
    states: {
      'fan.living_room_ac': {
        entity_id: 'fan.living_room_ac',
        state: 'on',
        attributes: {
          friendly_name: 'Living Room AC',
          current_temperature: 22.4,
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) =>
      key === 'ui.card.climate.currently' ? 'Currently' : key,
    formatEntityState: (entity: any) => entity.state,
  }

  await card.updateComplete

  const text = card.shadowRoot?.textContent ?? ''
  expect(text).toContain('Currently')
  expect(text).toContain('22.4 °C')
})

test('off climate setpoint allows setpoint changes by default', async () => {
  document.body.innerHTML = ''
  const callService = jest.fn()
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.comet_dect',
    header: false,
    control: false,
    setpoint_debounce_ms: 0,
  } as any)
  card.hass = {
    states: {
      'climate.comet_dect': {
        entity_id: 'climate.comet_dect',
        state: 'off',
        attributes: {
          temperature: null,
          current_temperature: 18,
          min_temp: 7,
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
    callService,
  }

  await card.updateComplete

  const decrease = card.shadowRoot?.querySelector(
    'button.decrease'
  ) as HTMLButtonElement
  const increase = card.shadowRoot?.querySelector(
    'button.increase'
  ) as HTMLButtonElement

  expect(decrease.disabled).toBe(true)
  expect(increase.disabled).toBe(false)

  increase.click()

  expect(card._values.temperature).toBe(7)
  expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
    entity_id: 'climate.comet_dect',
    temperature: 7,
  })
})

test('off climate setpoint disables steppers when configured', async () => {
  document.body.innerHTML = ''
  const callService = jest.fn()
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.comet_dect',
    header: false,
    control: false,
    disable_setpoint_change_when_off: true,
  } as any)
  card.hass = {
    states: {
      'climate.comet_dect': {
        entity_id: 'climate.comet_dect',
        state: 'off',
        attributes: {
          temperature: null,
          current_temperature: 18,
          min_temp: 7,
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
    callService,
  }

  await card.updateComplete

  const decrease = card.shadowRoot?.querySelector(
    'button.decrease'
  ) as HTMLButtonElement
  const increase = card.shadowRoot?.querySelector(
    'button.increase'
  ) as HTMLButtonElement

  expect(decrease.disabled).toBe(true)
  expect(increase.disabled).toBe(true)

  increase.click()

  expect(callService).not.toHaveBeenCalled()
})

test('off climate setpoint can be hidden without disabling control by default', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.comet_dect',
    header: false,
    control: false,
    hide_setpoint_when_off: true,
  } as any)
  card.hass = {
    states: {
      'climate.comet_dect': {
        entity_id: 'climate.comet_dect',
        state: 'off',
        attributes: {
          temperature: null,
          current_temperature: 18,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('.current-wrapper')).toBe(null)
  expect(card.getCardSize()).toBe(1)
})

test('off climate setpoint accepts nested prerelease hide alias', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.comet_dect',
    header: false,
    control: false,
    hide: {
      setpoint_when_off: true,
    },
  } as any)
  card.hass = {
    states: {
      'climate.comet_dect': {
        entity_id: 'climate.comet_dect',
        state: 'off',
        attributes: {
          temperature: null,
          current_temperature: 18,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('.current-wrapper')).toBe(null)
  expect(card.getCardSize()).toBe(1)
})

test('non-off null climate setpoint seeds min temp on increase', async () => {
  document.body.innerHTML = ''
  const callService = jest.fn()
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.comet_dect',
    header: false,
    control: false,
    setpoint_debounce_ms: 0,
  } as any)
  card.hass = {
    states: {
      'climate.comet_dect': {
        entity_id: 'climate.comet_dect',
        state: 'heat',
        attributes: {
          temperature: null,
          current_temperature: 18,
          min_temp: 7,
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
    callService,
  }

  await card.updateComplete

  const decrease = card.shadowRoot?.querySelector(
    'button.decrease'
  ) as HTMLButtonElement
  const increase = card.shadowRoot?.querySelector(
    'button.increase'
  ) as HTMLButtonElement

  expect(decrease.disabled).toBe(true)
  expect(increase.disabled).toBe(false)

  increase.click()

  expect(card._values.temperature).toBe(7)
  expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
    entity_id: 'climate.comet_dect',
    temperature: 7,
  })
})

test('enhanced visuals off keeps legacy column setpoint layout by default', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    enhanced_visuals: false,
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(
    card.shadowRoot
      ?.querySelector('ha-card')
      ?.classList.contains('standard-visuals')
  ).toBe(true)
  expect(
    card.shadowRoot
      ?.querySelector('.current-wrapper')
      ?.classList.contains('column')
  ).toBe(true)
  expect(
    (card.shadowRoot?.querySelector('button.increase ha-icon') as any)?.icon
  ).toBe('hass:chevron-up')
  expect(
    (card.shadowRoot?.querySelector('button.decrease ha-icon') as any)?.icon
  ).toBe('hass:chevron-down')
})

test('unset step layout uses column steppers by default', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(
    card.shadowRoot
      ?.querySelector('.current-wrapper')
      ?.classList.contains('column')
  ).toBe(true)
  expect(
    (card.shadowRoot?.querySelector('button.increase ha-icon') as any)?.icon
  ).toBe('hass:chevron-up')
})

test('enhanced visuals off preserves explicitly configured row step layout', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    enhanced_visuals: false,
    layout: { step: 'row' },
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete

  expect(
    card.shadowRoot
      ?.querySelector('.current-wrapper')
      ?.classList.contains('row')
  ).toBe(true)
  expect(
    (card.shadowRoot?.querySelector('button.increase ha-icon') as any)?.icon
  ).toBe('mdi:plus')
  expect(
    (card.shadowRoot?.querySelector('button.decrease ha-icon') as any)?.icon
  ).toBe('mdi:minus')
  const children = Array.from(
    card.shadowRoot?.querySelector('.current-wrapper')?.children ?? []
  )
  expect(children.map((child) => child.className)).toEqual([
    expect.stringContaining('decrease'),
    expect.stringContaining('current--value'),
    expect.stringContaining('increase'),
    'current--label',
  ])
})

test('dual setpoints with entity rows default to compact column steppers', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    entities: [{ entity: 'sensor.living_room_humidity', name: 'Humidity' }],
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat_cool',
        attributes: {
          current_temperature: 70,
          target_temp_low: 68,
          target_temp_high: 70,
          min_temp: 45,
          max_temp: 95,
          hvac_modes: ['off', 'heat', 'cool', 'heat_cool'],
          supported_features: 3,
        },
      },
      'sensor.living_room_humidity': {
        entity_id: 'sensor.living_room_humidity',
        state: '55',
        attributes: { unit_of_measurement: '%' },
      },
    },
    config: {
      unit_system: {
        temperature: '°F',
      },
    },
    localize: (key: string) => key,
    formatEntityState: (stateObj) => stateObj.state,
  }

  await card.updateComplete

  const wrappers = Array.from(
    card.shadowRoot?.querySelectorAll('.current-wrapper') ?? []
  )
  expect(wrappers).toHaveLength(2)
  expect(
    wrappers.every((wrapper) => wrapper.classList.contains('column'))
  ).toBe(true)
  expect(
    (card.shadowRoot?.querySelector('button.increase ha-icon') as any)?.icon
  ).toBe('hass:chevron-up')
})

test('target labels can be hidden without changing setpoint controls', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    hide: {
      setpoint_label: true,
    },
  } as any)
  card.hass = {
    locale: { language: 'en' },
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          hvac_modes: ['off', 'heat'],
          temperature: 21,
          current_temperature: 20,
          min_temp: 5,
          max_temp: 30,
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) =>
      key === 'ui.card.climate.target_temperature' ? 'Target' : key,
  } as any

  await card.updateComplete

  expect(card.shadowRoot?.querySelector('.current-wrapper')).not.toBeNull()
  expect(card.shadowRoot?.querySelector('.current--label')).toBeNull()
  expect(card.shadowRoot?.textContent).not.toContain('Target')
})

test('dual setpoints with entity rows preserve explicit row steppers', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
    layout: { step: 'row' },
    entities: [{ entity: 'sensor.living_room_humidity', name: 'Humidity' }],
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat_cool',
        attributes: {
          current_temperature: 70,
          target_temp_low: 68,
          target_temp_high: 70,
          min_temp: 45,
          max_temp: 95,
          hvac_modes: ['off', 'heat', 'cool', 'heat_cool'],
          supported_features: 3,
        },
      },
      'sensor.living_room_humidity': {
        entity_id: 'sensor.living_room_humidity',
        state: '55',
        attributes: { unit_of_measurement: '%' },
      },
    },
    config: {
      unit_system: {
        temperature: '°F',
      },
    },
    localize: (key: string) => key,
    formatEntityState: (stateObj) => stateObj.state,
  }

  await card.updateComplete

  const wrappers = Array.from(
    card.shadowRoot?.querySelectorAll('.current-wrapper') ?? []
  )
  expect(wrappers).toHaveLength(2)
  expect(wrappers.every((wrapper) => wrapper.classList.contains('row'))).toBe(
    true
  )
  expect(
    (card.shadowRoot?.querySelector('button.increase ha-icon') as any)?.icon
  ).toBe('mdi:plus')
})

test('legacy config names are normalized to v4 names', () => {
  document.body.innerHTML = ''
  const card = createCard()

  card.setConfig({
    entity: 'climate.living_room',
    current_temperature_entity: 'sensor.living_room_temperature',
    sensors: [
      { id: 'temperature', label: 'Currently' },
      { id: 'state', label: 'State', show: false },
      { entity: 'sensor.living_room_humidity', label: 'Humidity' },
    ],
    layout: {
      sensors: { type: 'table', labels: true },
    },
    version: 3,
  } as any)

  expect(card.config.current_value_entity).toBe(
    'sensor.living_room_temperature'
  )
  expect((card.config as any).current_temperature_entity).toBeUndefined()
  expect(card.config.entities).toEqual([
    { entity: 'sensor.living_room_humidity', name: 'Humidity' },
  ])
  expect((card.config as any).sensors).toBeUndefined()
  expect(card.config.layout?.entities).toEqual({ type: 'table', labels: true })
  expect(card.config.layout?.step).toBe('column')
  expect(card.config.enhanced_visuals).toBe(false)
  expect((card.config.layout as any)?.sensors).toBeUndefined()
  expect(card.config.label?.temperature).toBe('Currently')
  expect(card.config.label?.state).toBe('State')
  expect(card.config.hide?.state).toBe(true)
  expect((card.config as any).version).toBeUndefined()
})

test('legacy version 3 import uses classic visuals unless explicitly opted in', () => {
  document.body.innerHTML = ''
  const card = createCard()

  card.setConfig({
    entity: 'climate.living_room',
    version: 3,
  } as any)

  expect(card.config.enhanced_visuals).toBe(false)
  expect((card.config as any).version).toBeUndefined()

  card.setConfig({
    entity: 'climate.living_room',
    version: 3,
    enhanced_visuals: true,
  } as any)

  expect(card.config.enhanced_visuals).toBe(true)
  expect((card.config as any).version).toBeUndefined()
})

test('legacy version 3 import preserves explicit row step layout', () => {
  document.body.innerHTML = ''
  const card = createCard()

  card.setConfig({
    entity: 'climate.living_room',
    version: 3,
    layout: {
      step: 'row',
    },
  } as any)

  expect(card.config.layout?.step).toBe('row')
  expect((card.config as any).version).toBeUndefined()
})

test('legacy sensors render cleanly with heat_cool dual setpoints', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.upstairs',
    version: 3,
    step_size: 1,
    decimals: 0,
    sensors: [
      { id: 'temperature', label: 'Currently' },
      { id: 'state', label: 'State', show: false },
      {
        entity: 'sensor.guest_room_sensor_temperature',
        label: 'Guest',
      },
      {
        entity: 'binary_sensor.upstairs_motion',
        label: 'Motion',
      },
      {
        entity: 'sensor.office',
        label: 'Office',
      },
    ],
    unit: ' ',
    fallback: 'Off',
    control: ['hvac'],
    layout: {
      mode: {
        headings: false,
      },
    },
  } as any)

  card.hass = {
    states: {
      'climate.upstairs': {
        entity_id: 'climate.upstairs',
        state: 'heat_cool',
        attributes: {
          current_temperature: 73,
          target_temp_low: 67,
          target_temp_high: 73,
          min_temp: 45,
          max_temp: 95,
          hvac_modes: ['off', 'heat', 'cool', 'heat_cool'],
          supported_features: 3,
          friendly_name: 'Upstairs',
        },
      },
      'sensor.guest_room_sensor_temperature': {
        entity_id: 'sensor.guest_room_sensor_temperature',
        state: '73',
        attributes: {
          friendly_name: 'Guest Room Sensor Temperature',
        },
      },
      'binary_sensor.upstairs_motion': {
        entity_id: 'binary_sensor.upstairs_motion',
        state: 'off',
        attributes: {
          friendly_name: 'Upstairs Motion',
        },
      },
      'sensor.office': {
        entity_id: 'sensor.office',
        state: '74',
        attributes: {
          friendly_name: 'Office Temperature',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°F',
      },
    },
    localize: (key: string) => key,
    formatEntityState: (stateObj) =>
      stateObj.entity_id === 'binary_sensor.upstairs_motion'
        ? 'Clear'
        : stateObj.state,
  }

  await card.updateComplete

  const body = card.shadowRoot?.querySelector('.body')
  expect(body?.classList.contains('has-entities')).toBe(true)
  expect(body?.classList.contains('setpoint-count-2')).toBe(true)
  expect(
    Array.from(
      card.shadowRoot?.querySelectorAll('.current-wrapper') ?? []
    ).every((wrapper) => wrapper.classList.contains('column'))
  ).toBe(true)
  expect(card.shadowRoot?.textContent).toContain('Guest')
  expect(card.shadowRoot?.textContent).toContain('Motion')
  expect(card.shadowRoot?.textContent).toContain('Office')
  expect(card.shadowRoot?.textContent).not.toContain(
    'Guest Room Sensor Temperature'
  )
  expect(card.shadowRoot?.textContent).not.toContain('Office Temperature')
  expect(card.shadowRoot?.textContent).not.toContain('State')
})

test('legacy left-aligned sensor tables keep compact label/value columns', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'water_heater.aquarea_main_dhw_target_temp',
    control: true,
    hide: {
      temperature: true,
      state: false,
    },
    header: {
      toggle: {
        entity: 'switch.panasonic_aquarea_main_force_dhw_state',
        name: 'Force DHW',
      },
    },
    sensors: [
      {
        entity: 'select.panasonic_aquarea_main_operating_mode_state',
        name: 'Aquarea Mode',
      },
      {
        entity: 'sensor.panasonic_aquarea_main_threeway_valve_state',
        name: '3-way valve',
      },
      {
        entity: 'binary_sensor.panasonic_aquarea_main_defrosting_state',
        name: 'Defrost status',
      },
      {
        entity: 'sensor.panasonic_aquarea_main_dhw_temp',
        name: 'DHW tank temp',
      },
      {
        entity: 'sensor.panasonic_aquarea_main_fan1_motor_speed',
        name: 'Fan 1 speed',
      },
      {
        entity: 'sensor.panasonic_aquarea_main_fan2_motor_speed',
        name: 'Fan 2 speed',
      },
    ],
    show_header: true,
    name: 'Aquarea',
    decimals: 1,
    layout: {
      mode: {
        headings: true,
        names: true,
        icons: true,
      },
      step: 'column',
      entities: {
        alignment: 'left',
      },
    },
  } as any)

  card.hass = {
    locale: { language: 'en' },
    states: {
      'water_heater.aquarea_main_dhw_target_temp': {
        entity_id: 'water_heater.aquarea_main_dhw_target_temp',
        state: 'eco',
        attributes: {
          current_temperature: 40,
          target_temp_low: 40,
          target_temp_high: 47,
          min_temp: 35,
          max_temp: 65,
          friendly_name: 'Aquarea Domestic Water Heater',
        },
      },
      'switch.panasonic_aquarea_main_force_dhw_state': {
        entity_id: 'switch.panasonic_aquarea_main_force_dhw_state',
        state: 'off',
        attributes: { friendly_name: 'Force DHW' },
      },
      'select.panasonic_aquarea_main_operating_mode_state': {
        entity_id: 'select.panasonic_aquarea_main_operating_mode_state',
        state: 'heat_dhw',
        attributes: { friendly_name: 'Operating mode' },
      },
      'sensor.panasonic_aquarea_main_threeway_valve_state': {
        entity_id: 'sensor.panasonic_aquarea_main_threeway_valve_state',
        state: 'room',
        attributes: { friendly_name: 'Three-way valve' },
      },
      'binary_sensor.panasonic_aquarea_main_defrosting_state': {
        entity_id: 'binary_sensor.panasonic_aquarea_main_defrosting_state',
        state: 'off',
        attributes: { friendly_name: 'Defrosting' },
      },
      'sensor.panasonic_aquarea_main_dhw_temp': {
        entity_id: 'sensor.panasonic_aquarea_main_dhw_temp',
        state: '40.0',
        attributes: {
          friendly_name: 'DHW temperature',
          unit_of_measurement: '°C',
        },
      },
      'sensor.panasonic_aquarea_main_fan1_motor_speed': {
        entity_id: 'sensor.panasonic_aquarea_main_fan1_motor_speed',
        state: '0',
        attributes: {
          friendly_name: 'Fan 1 motor speed',
          unit_of_measurement: 'R/min',
        },
      },
      'sensor.panasonic_aquarea_main_fan2_motor_speed': {
        entity_id: 'sensor.panasonic_aquarea_main_fan2_motor_speed',
        state: '0',
        attributes: {
          friendly_name: 'Fan 2 motor speed',
          unit_of_measurement: 'R/min',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    formatEntityState: (stateObj: any) => {
      const values = {
        'water_heater.aquarea_main_dhw_target_temp': 'Super Eco',
        'select.panasonic_aquarea_main_operating_mode_state': 'Heat+DHW',
        'sensor.panasonic_aquarea_main_threeway_valve_state': 'Room',
        'binary_sensor.panasonic_aquarea_main_defrosting_state': 'Normal',
      }
      return values[stateObj.entity_id] ?? stateObj.state
    },
    localize: (key: string) => key,
  } as any

  await card.updateComplete

  const body = card.shadowRoot?.querySelector('.body')
  const entityTable = card.shadowRoot?.querySelector('.entities')
  const headings = Array.from(
    card.shadowRoot?.querySelectorAll('.entity-heading') ?? []
  )

  expect(body?.classList.contains('has-entities')).toBe(true)
  expect(body?.classList.contains('step-column')).toBe(true)
  expect(body?.classList.contains('setpoint-count-2')).toBe(true)
  expect(entityTable?.classList.contains('align-left')).toBe(true)
  expect(entityTable?.classList.contains('as-table')).toBe(true)
  expect(headings.map((heading) => heading.textContent?.trim())).toContain(
    'Fan 1 speed:'
  )
  expect(card.shadowRoot?.textContent).toContain('Heat+DHW')
  expect(card.shadowRoot?.textContent).toContain('0 R/min')
})

test('column step layout exposes a body class for compact entity rows', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    layout: {
      step: 'column',
    },
    entities: [
      {
        entity: 'sensor.long_temperature_label',
        name: 'Fireplace Lightswitch Temperature',
        decimals: 1,
      },
    ],
    hide: {
      setpoint_label: true,
    },
  } as any)

  card.hass = {
    locale: { language: 'en' },
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          hvac_modes: ['off', 'heat'],
          temperature: 21,
          current_temperature: 20,
          min_temp: 5,
          max_temp: 30,
        },
      },
      'sensor.long_temperature_label': {
        entity_id: 'sensor.long_temperature_label',
        state: '20.5',
        attributes: {
          unit_of_measurement: '°C',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    formatEntityState: (entity: any) => entity.state,
    localize: (key: string) => key,
  } as any

  await card.updateComplete

  const body = card.shadowRoot?.querySelector('.body')
  expect(body?.classList.contains('has-entities')).toBe(true)
  expect(body?.classList.contains('step-column')).toBe(true)
  expect(body?.classList.contains('setpoint-count-1')).toBe(true)
})

test('object control config respects false entries', async () => {
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)

  card.setConfig({
    entity: 'climate.living_room',
    control: {
      hvac: false,
      preset: true,
    },
  } as any)

  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          current_temperature: 20,
          temperature: 21,
          hvac_modes: ['off', 'heat', 'cool'],
          preset_modes: ['eco', 'comfort'],
          friendly_name: 'Living Room',
        },
      },
    },
    config: {
      unit_system: {
        temperature: '°C',
      },
    },
    localize: (key: string) => key,
  } as any
  await card.updateComplete

  const text = card.shadowRoot?.textContent ?? ''
  expect(text).toContain('eco')
  expect(text).toContain('comfort')
  expect(text).not.toContain('cool')
})

test('hass setter rebuilds even when state object references are unchanged', () => {
  const card = createCard()
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
  } as any)
  const hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  card.hass = hass
  expect(card.entity?.entity_id).toBe('climate.living_room')

  card.entity = undefined as any
  card.hass = hass

  expect(card.entity?.entity_id).toBe('climate.living_room')
})

test('setpoint tap opens the configured entity more-info by default', async () => {
  jest.useFakeTimers()
  document.body.innerHTML = ''
  const card = createCard()
  document.body.appendChild(card)
  const moreInfo = jest.fn()
  card.addEventListener('hass-more-info', moreInfo)
  card.setConfig({
    entity: 'climate.living_room',
    header: false,
    control: false,
  } as any)
  card.hass = {
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: {
          temperature: 20,
          current_temperature: 19,
          min_temp: 7,
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
  }

  await card.updateComplete
  ;(card.shadowRoot?.querySelector('.current--value') as HTMLElement).click()
  jest.advanceTimersByTime(SimpleThermostat.DOUBLE_TAP_MS)

  expect(moreInfo).toHaveBeenCalledTimes(1)
  expect(moreInfo.mock.calls[0][0].detail).toEqual({
    entityId: 'climate.living_room',
  })
  jest.useRealTimers()
})
