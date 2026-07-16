import SimpleThermostatEditor, { buildSchema } from '../editor'

const performAction = () => undefined

function schemaNames(schema: Array<Record<string, any>>): Array<string> {
  return schema
    .flatMap((item) => [
      item.name,
      ...(Array.isArray(item.schema) ? schemaNames(item.schema) : []),
    ])
    .filter(Boolean)
}

function sectionTitles(schema: Array<Record<string, any>>): Array<string> {
  return schema.map((item) => item.title).filter(Boolean)
}

function findSection(
  schema: Array<Record<string, any>>,
  title: string
): Record<string, any> {
  const section = schema.find((item) => item.title === title)
  if (!section) throw new Error(`Missing schema section: ${title}`)
  return section
}

test('fan editor does not show current value entity picker', () => {
  const names = schemaNames(
    buildSchema({ entity: 'fan.range_hood' } as any, {
      performAction,
      states: {
        'fan.range_hood': {
          entity_id: 'fan.range_hood',
          state: 'off',
          attributes: { percentage: 0, preset_modes: ['low', 'high'] },
        },
      },
    })
  )

  expect(names).not.toContain('current_value_entity')
})

test('visual editor exposes only simple card-owned action selectors', () => {
  const schema = buildSchema({ entity: 'climate.living_room' } as any, {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  })
  const names = schemaNames(schema)

  expect(names).toEqual(
    expect.arrayContaining([
      'tap_action.action',
      'hold_action.action',
      'double_tap_action.action',
      'enhanced_visuals',
    ])
  )
  expect(names).not.toContain('styles')
})

test('visual editor keeps common setup before advanced options', () => {
  const schema = buildSchema({ entity: 'climate.living_room' } as any, {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  })

  expect(sectionTitles(schema)).toEqual([
    'Card header',
    'Controls',
    'Target',
    'Extra entity rows',
    'Appearance',
    'Advanced',
  ])
})

test('advanced fields are grouped away from the common appearance workflow', () => {
  const schema = buildSchema({ entity: 'climate.living_room' } as any, {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  })
  const appearanceNames = schemaNames([findSection(schema, 'Appearance')])
  const advancedNames = schemaNames([findSection(schema, 'Advanced')])

  expect(appearanceNames).toEqual(
    expect.arrayContaining([
      'enhanced_visuals',
      'hide.temperature',
      'hide_current_value_when_off',
      'hide.state',
    ])
  )
  expect(appearanceNames).not.toEqual(
    expect.arrayContaining(['decimals', 'unit', 'fallback'])
  )
  expect(advancedNames).toEqual(
    expect.arrayContaining([
      'current_value_entity',
      'decimals',
      'unit',
      'fallback',
      'label.temperature',
      'label.state',
      'label.setpoint',
      'layout.mode.names',
      'layout.mode.icons',
      'layout.mode.headings',
      'tap_action.action',
      'hold_action.action',
      'double_tap_action.action',
    ])
  )
})

test('fan editor only shows controls supported by the selected fan', () => {
  const names = schemaNames(
    buildSchema({ entity: 'fan.range_hood' } as any, {
      performAction,
      states: {
        'fan.range_hood': {
          entity_id: 'fan.range_hood',
          state: 'off',
          attributes: { preset_modes: ['low', 'high'] },
        },
      },
    })
  )

  expect(names).toEqual(
    expect.arrayContaining(['control.preset', 'control.state'])
  )
  expect(names).not.toEqual(
    expect.arrayContaining(['control.direction', 'control.oscillating'])
  )
})

test('editor preserves custom control order when changing enabled controls', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
    control: {
      swing: {},
      fan: {},
      hvac: {},
    },
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'cool',
        attributes: {
          hvac_modes: ['off', 'cool'],
          preset_modes: ['eco'],
          fan_modes: ['auto'],
          swing_modes: ['off', 'both'],
        },
      },
    },
  } as any

  const updated = editor._applyFormChange({
    'control.preset': true,
  } as any)

  expect(Object.keys(updated.control as Record<string, unknown>)).toEqual([
    '_order',
    'swing',
    'fan',
    'hvac',
    'preset',
  ])
  expect((updated.control as Record<string, unknown>)._order).toEqual([
    'swing',
    'fan',
    'hvac',
    'preset',
  ])
})

test('editor materializes configured control and option order', () => {
  const editor = new SimpleThermostatEditor()

  editor.setConfig({
    entity: 'climate.living_room',
    control: {
      fan: {
        auto: {},
        quiet: {},
        '1': {},
      },
      preset: {
        none: {},
        boost: {},
      },
    },
  } as any)

  expect((editor.config.control as Record<string, unknown>)._order).toEqual([
    'fan',
    'preset',
  ])
  expect(
    (
      (editor.config.control as Record<string, any>).fan as Record<
        string,
        unknown
      >
    )._order
  ).toEqual(['1', 'auto', 'quiet'])
})

test('editor emits materialized order as a saveable config change', async () => {
  const editor = new SimpleThermostatEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    entity: 'climate.living_room',
    control: {
      fan: {
        auto: {},
        quiet: {},
      },
      preset: {
        none: {},
        boost: {},
      },
    },
  } as any)

  await new Promise<void>((resolve) => queueMicrotask(() => resolve()))

  expect(configChanged).toHaveBeenCalledTimes(1)
  expect(configChanged.mock.calls[0][0].detail.config.control).toMatchObject({
    _order: ['fan', 'preset'],
    fan: { _order: ['auto', 'quiet'] },
    preset: { _order: ['none', 'boost'] },
  })
})

test('setpoint controls are hidden when the selected fan has no percentage support', () => {
  const names = schemaNames(
    buildSchema({ entity: 'fan.basic' } as any, {
      performAction,
      states: {
        'fan.basic': {
          entity_id: 'fan.basic',
          state: 'off',
          attributes: {},
        },
      },
    })
  )

  expect(names).not.toContain('hide_setpoint')
  expect(names).not.toContain('layout.step')
  expect(names).not.toContain('step_size')
})

test('target section exposes off-mode setpoint lock', () => {
  const schema = buildSchema({ entity: 'climate.living_room' } as any, {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'off',
        attributes: { hvac_modes: ['off', 'heat'], temperature: null },
      },
    },
  })

  expect(schemaNames([findSection(schema, 'Target')])).toContain(
    'disable_setpoint_change_when_off'
  )
  expect(schemaNames([findSection(schema, 'Target')])).toContain(
    'hide_setpoint_when_off'
  )
})

test('vane controls only show when the selected entity exposes vane attributes', () => {
  const baseHass = {
    performAction,
    states: {
      'climate.basic': {
        entity_id: 'climate.basic',
        state: 'cool',
        attributes: { hvac_modes: ['off', 'cool'] },
      },
      'climate.vanes': {
        entity_id: 'climate.vanes',
        state: 'cool',
        attributes: {
          hvac_modes: ['off', 'cool'],
          vane_horizontal_positions: ['left', 'right'],
          vane_vertical_positions: ['top', 'bottom'],
        },
      },
    },
  }

  expect(
    schemaNames(buildSchema({ entity: 'climate.basic' } as any, baseHass))
  ).not.toEqual(
    expect.arrayContaining(['control.vane_horizontal', 'control.vane_vertical'])
  )

  expect(
    schemaNames(buildSchema({ entity: 'climate.vanes' } as any, baseHass))
  ).toEqual(
    expect.arrayContaining(['control.vane_horizontal', 'control.vane_vertical'])
  )
})

test('extra entity row layout controls are prominent in their own section', () => {
  const hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  }

  const schema = buildSchema({ entity: 'climate.living_room' } as any, hass)

  expect(sectionTitles(schema)).toContain('Extra entity rows')
  expect(schemaNames([findSection(schema, 'Extra entity rows')])).toEqual(
    expect.arrayContaining([
      'layout.entities.type',
      'layout.entities.labels',
      'layout.entities.separator',
      'layout.entities.alignment',
    ])
  )
})

test('toggle icon control only shows after a header toggle entity is configured', () => {
  const hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  }

  expect(
    schemaNames(buildSchema({ entity: 'climate.living_room' } as any, hass))
  ).not.toContain('toggle.icon')

  expect(
    schemaNames(
      buildSchema(
        {
          entity: 'climate.living_room',
          header: { toggle: { entity: 'switch.living_room' } },
        } as any,
        hass
      )
    )
  ).toContain('toggle.icon')
})

test('enhanced visuals toggle stays off from a partial form update', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
    header: { name: 'Living Room' },
    layout: {
      step: 'row',
      mode: { names: true, icons: true, headings: false },
    },
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  } as any

  const updated = editor._applyFormChange({
    enhanced_visuals: false,
  } as any)

  expect(updated.enhanced_visuals).toBe(false)
  expect(updated.entity).toBe('climate.living_room')
  expect(updated.header).toEqual({ name: 'Living Room' })
  expect(updated.layout?.step).toBe('row')
})

test('extra entity row editor adds and updates common row fields', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)
  editor.setConfig({ entity: 'climate.living_room' } as any)

  editor._addEntityRow()
  editor._updateEntityRow(0, 'entity', 'sensor.living_room_humidity')
  editor._updateEntityRow(0, 'name', 'Humidity')
  editor._updateEntityRow(0, 'icon', 'mdi:water-percent')

  expect(editor.config.entities).toEqual([
    {
      entity: 'sensor.living_room_humidity',
      name: 'Humidity',
      icon: 'mdi:water-percent',
    },
  ])
  expect(configChanged).toHaveBeenCalled()
})

test('extra entity row editor removes the config when the last row is removed', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
    entities: [{ entity: 'sensor.living_room_humidity' }],
  } as any)

  editor._removeEntityRow(0)

  expect(editor.config.entities).toBeUndefined()
})

test('editor updates its local form data when enhanced visuals changes', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)
  editor.setConfig({
    entity: 'climate.living_room',
    header: { name: 'Living Room' },
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  } as any

  editor._valueChanged({
    detail: { value: { enhanced_visuals: false } },
  } as CustomEvent)

  expect(editor.config.enhanced_visuals).toBe(false)
  expect(editor.config.layout?.step).toBeUndefined()
  expect(editor._buildFormData().enhanced_visuals).toBe(false)
  expect(editor._buildFormData()['layout.step']).toBe('column')
  expect(configChanged).toHaveBeenCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: expect.objectContaining({ enhanced_visuals: false }),
      }),
    })
  )
})

test('enhanced visuals on returns to column default when step layout was never explicit', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
    header: { name: 'Living Room' },
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  } as any

  editor.config = editor._applyFormChange({ enhanced_visuals: false } as any)
  expect(editor.config.layout?.step).toBeUndefined()
  expect(editor._buildFormData()['layout.step']).toBe('column')

  editor.config = editor._applyFormChange({ enhanced_visuals: true } as any)
  expect(editor.config.enhanced_visuals).toBeUndefined()
  expect(editor.config.layout?.step).toBeUndefined()
  expect(editor._buildFormData()['layout.step']).toBe('column')
})

test('enhanced visuals toggle does not save unrelated displayed defaults', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  } as any

  const updated = editor._applyFormChange({ enhanced_visuals: false } as any)

  expect(updated).toEqual({
    entity: 'climate.living_room',
    enhanced_visuals: false,
  })
})

test('enhanced visuals toggle ignores full-form step default changes', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  } as any

  const offForm = {
    ...editor._buildFormData(),
    enhanced_visuals: false,
    'layout.step': 'column',
  }
  const offConfig = editor._applyFormChange(offForm as any)
  expect(offConfig).toEqual({
    entity: 'climate.living_room',
    enhanced_visuals: false,
  })

  editor.config = offConfig
  const onForm = {
    ...editor._buildFormData(),
    enhanced_visuals: true,
    'layout.step': 'column',
  }
  const onConfig = editor._applyFormChange(onForm as any)
  expect(onConfig).toEqual({
    entity: 'climate.living_room',
  })
})

test('enhanced visuals toggle preserves explicit step layout', () => {
  if (!customElements.get('simple-thermostat-editor-test')) {
    customElements.define(
      'simple-thermostat-editor-test',
      SimpleThermostatEditor
    )
  }
  const editor = new SimpleThermostatEditor()
  editor.setConfig({
    entity: 'climate.living_room',
    layout: { step: 'row' },
  } as any)
  editor.hass = {
    performAction,
    states: {
      'climate.living_room': {
        entity_id: 'climate.living_room',
        state: 'heat',
        attributes: { hvac_modes: ['off', 'heat'], temperature: 20 },
      },
    },
  } as any

  const updated = editor._applyFormChange({
    ...editor._buildFormData(),
    enhanced_visuals: false,
    'layout.step': 'row',
  } as any)

  expect(updated.layout?.step).toBe('row')
  expect(updated.enhanced_visuals).toBe(false)
})
