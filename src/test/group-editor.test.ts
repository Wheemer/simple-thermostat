import SimpleThermostatGroupEditor from '../group-editor'

class TestSimpleThermostatEditor extends HTMLElement {
  config: any
  hass: any

  setConfig(config: any) {
    this.config = config
  }
}

const editorTag = 'simple-thermostat-group-editor-test'
const innerEditorTag = 'simple-thermostat-editor'

function defineElements() {
  if (!customElements.get(innerEditorTag)) {
    customElements.define(innerEditorTag, TestSimpleThermostatEditor)
  }

  if (!customElements.get(editorTag)) {
    customElements.define(editorTag, SimpleThermostatGroupEditor)
  }
}

function createEditor() {
  defineElements()
  const editor = document.createElement(
    editorTag
  ) as SimpleThermostatGroupEditor
  document.body.appendChild(editor)
  return editor
}

beforeEach(() => {
  document.body.innerHTML = ''
})

test('moving a group card keeps its configuration and expanded editor together', async () => {
  const editor = createEditor()
  const changed = jest.fn()
  editor.addEventListener('config-changed', changed)
  editor.setConfig({
    card: { enhanced_visuals: false },
    cards: [
      {
        entity: 'climate.first',
        header: { icon: false },
        hide: { state: true },
      },
      { entity: 'climate.second', layout: { step: 'column' } },
    ],
  } as any)
  await editor.updateComplete
  ;(
    editor.shadowRoot!.querySelector('.target-actions ha-button') as HTMLElement
  ).click()
  await editor.updateComplete
  ;(
    editor.shadowRoot!.querySelector(
      'ha-icon-button[label="Move down"]'
    ) as HTMLElement
  ).click()
  await editor.updateComplete
  const saved = changed.mock.calls.at(-1)[0].detail.config
  expect(saved.card).toEqual({ enhanced_visuals: false })
  expect(saved.cards.map((target: any) => target.entity)).toEqual([
    'climate.second',
    'climate.first',
  ])
  expect(saved.cards[1]).toMatchObject({
    header: { icon: false },
    hide: { state: true },
  })
  const targets = editor.shadowRoot!.querySelectorAll('.target')
  expect(targets[0].querySelector(innerEditorTag)).toBeNull()
  expect(
    (targets[1].querySelector(innerEditorTag) as TestSimpleThermostatEditor)
      .config.entity
  ).toBe('climate.first')
})

test('removing an earlier card preserves the expanded target', async () => {
  const editor = createEditor()
  editor.setConfig({ cards: ['climate.first', 'climate.second'] })
  await editor.updateComplete
  ;(
    editor.shadowRoot!.querySelectorAll(
      '.target-actions ha-button'
    )[1] as HTMLElement
  ).click()
  await editor.updateComplete
  ;(
    editor.shadowRoot!.querySelector(
      'ha-icon-button[label="Remove"]'
    ) as HTMLElement
  ).click()
  await editor.updateComplete
  expect(
    (
      editor.shadowRoot!.querySelector(
        innerEditorTag
      ) as TestSimpleThermostatEditor
    ).config.entity
  ).toBe('climate.second')
})

test('group behavior switches and selector buttons expose accessible labels and selection', async () => {
  const editor = createEditor()
  editor.setConfig({ cards: ['climate.pool'], selector: { style: 'tabs' } })
  await editor.updateComplete
  const switches = Array.from(editor.shadowRoot!.querySelectorAll('ha-switch'))
  expect(switches.map((element) => element.getAttribute('aria-label'))).toEqual(
    [
      'Follow active device',
      'Remember selection',
      'Show icons',
      'Show names',
      'Show states',
    ]
  )
  const buttons = Array.from(
    editor.shadowRoot!.querySelectorAll('.selector-style-actions ha-button')
  )
  expect(
    buttons.map((element) => element.getAttribute('aria-pressed'))
  ).toEqual(['false', 'true'])
})

test.each(['name', 'icon'])(
  'group edits preserve header %s: false',
  async (field) => {
    const editor = createEditor()
    const changed = jest.fn()
    editor.addEventListener('config-changed', changed)
    editor.setConfig({
      cards: [{ entity: 'climate.pool', header: { [field]: false } }],
    } as any)
    await editor.updateComplete
    const add = Array.from(
      editor.shadowRoot!.querySelectorAll('ha-button')
    ).find((button) => button.textContent?.includes('Add card')) as HTMLElement
    add.click()
    await editor.updateComplete
    expect(changed).toHaveBeenCalled()
    expect(
      changed.mock.calls.at(-1)[0].detail.config.cards[0].header[field]
    ).toBe(false)
  }
)

test.each(['name', 'icon'])(
  'group editor clears inherited header %s',
  async (field) => {
    const editor = createEditor()
    const changed = jest.fn()
    editor.addEventListener('config-changed', changed)
    editor.setConfig({
      cards: [
        {
          entity: 'climate.pool',
          header: { name: 'Old title', icon: 'mdi:fan' },
        },
      ],
    })
    await editor.updateComplete
    const input = editor.shadowRoot!.querySelector(
      field === 'name' ? 'ha-textfield[label="Name"]' : 'ha-icon-picker'
    ) as HTMLInputElement
    if (field === 'name') {
      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      input.dispatchEvent(
        new CustomEvent('value-changed', { detail: { value: '' } })
      )
    }
    await editor.updateComplete
    const saved = changed.mock.calls.at(-1)[0].detail.config
    expect(saved.cards[0].header).not.toHaveProperty(field)
    editor.setConfig(saved)
    await editor.updateComplete
    const reloaded = editor.shadowRoot!.querySelector(
      field === 'name' ? 'ha-textfield[label="Name"]' : 'ha-icon-picker'
    ) as HTMLInputElement
    expect(reloaded.value).toBe('')
  }
)

test('group editor opens the normal card editor for a selected target', async () => {
  const editor = createEditor()

  editor.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC', icon: 'mdi:air-conditioner' },
        control: false,
      },
    ],
  })

  await editor.updateComplete
  const configureButton = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-button') ?? []
  ).find((button) => button.textContent?.includes('Configure')) as HTMLElement
  configureButton.click()
  await editor.updateComplete

  const nested = editor.shadowRoot?.querySelector(
    innerEditorTag
  ) as TestSimpleThermostatEditor
  expect(nested.config).toMatchObject({
    entity: 'climate.living_room',
    header: { name: 'Living AC', icon: 'mdi:air-conditioner' },
    control: false,
  })
})

test('group editor preserves detailed card config from the nested editor', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC' },
      },
    ],
  })

  await editor.updateComplete
  const configureButton = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-button') ?? []
  ).find((button) => button.textContent?.includes('Configure')) as HTMLElement
  configureButton.click()
  await editor.updateComplete

  const nested = editor.shadowRoot?.querySelector(
    innerEditorTag
  ) as TestSimpleThermostatEditor
  nested.dispatchEvent(
    new CustomEvent('config-changed', {
      bubbles: true,
      composed: true,
      detail: {
        config: {
          type: 'custom:simple-thermostat',
          entity: 'climate.living_room',
          header: { name: 'Living AC' },
          hide: { state: true },
          layout: { step: 'row' },
        },
      },
    })
  )

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: expect.objectContaining({
          cards: [
            expect.objectContaining({
              entity: 'climate.living_room',
              hide: { state: true },
              layout: { step: 'row' },
            }),
          ],
        }),
      }),
    })
  )
})

test('nested editor receives shared card settings and target overrides', async () => {
  const editor = createEditor()
  editor.setConfig({
    card: {
      enhanced_visuals: false,
      hide: { state: true },
      layout: { step: 'column' },
    } as any,
    cards: [
      {
        entity: 'climate.living_room',
        layout: { step: 'row' },
      },
    ],
  })

  await editor.updateComplete
  const configureButton = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-button') ?? []
  ).find((button) => button.textContent?.includes('Configure')) as HTMLElement
  configureButton.click()
  await editor.updateComplete

  const nested = editor.shadowRoot?.querySelector(
    innerEditorTag
  ) as TestSimpleThermostatEditor
  expect(nested.config).toMatchObject({
    entity: 'climate.living_room',
    enhanced_visuals: false,
    hide: { state: true },
    layout: { step: 'row' },
  })
})

test('nested editor saves only values that differ from shared card settings', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)
  editor.setConfig({
    card: {
      enhanced_visuals: false,
      hide: { state: true },
    },
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete
  const configureButton = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-button') ?? []
  ).find((button) => button.textContent?.includes('Configure')) as HTMLElement
  configureButton.click()
  await editor.updateComplete

  const nested = editor.shadowRoot?.querySelector(
    innerEditorTag
  ) as TestSimpleThermostatEditor
  nested.dispatchEvent(
    new CustomEvent('config-changed', {
      bubbles: true,
      composed: true,
      detail: {
        config: {
          type: 'custom:simple-thermostat',
          entity: 'climate.living_room',
          enhanced_visuals: false,
          hide: { state: true },
          decimals: 0,
        },
      },
    })
  )

  const emitted = configChanged.mock.calls.at(-1)?.[0].detail.config
  expect(emitted.card).toEqual({
    enhanced_visuals: false,
    hide: { state: true },
  })
  expect(emitted.cards[0]).toEqual({
    type: 'custom:simple-thermostat',
    entity: 'climate.living_room',
    decimals: 0,
  })
})

test('nested editor persists clearing inherited step size and entity rows', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)
  editor.setConfig({
    card: {
      step_size: 0.5,
      entities: [{ entity: 'sensor.living_room_temperature' }],
    } as any,
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete
  const configureButton = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-button') ?? []
  ).find((button) => button.textContent?.includes('Configure')) as HTMLElement
  configureButton.click()
  await editor.updateComplete

  const nested = editor.shadowRoot?.querySelector(
    innerEditorTag
  ) as TestSimpleThermostatEditor
  nested.dispatchEvent(
    new CustomEvent('config-changed', {
      bubbles: true,
      composed: true,
      detail: {
        config: {
          type: 'custom:simple-thermostat',
          entity: 'climate.living_room',
        },
      },
    })
  )

  const saved = configChanged.mock.calls.at(-1)?.[0].detail.config
  expect(saved.cards[0]).toMatchObject({
    entity: 'climate.living_room',
    step_size: null,
    entities: false,
  })

  editor.setConfig(saved)
  await editor.updateComplete
  const reloaded = editor.shadowRoot?.querySelector(
    innerEditorTag
  ) as TestSimpleThermostatEditor
  expect(reloaded.config).toMatchObject({
    step_size: null,
    entities: false,
  })
})

test('group editor toggles recent activity auto-select', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete

  const autoSelectRow = Array.from(
    editor.shadowRoot?.querySelectorAll('.option-row') ?? []
  ).find((row) => row.textContent?.includes('Follow active device'))
  const autoSelectSwitch = autoSelectRow?.querySelector(
    'ha-switch'
  ) as HTMLInputElement

  Object.defineProperty(autoSelectSwitch, 'checked', {
    configurable: true,
    value: true,
  })
  autoSelectSwitch.dispatchEvent(new Event('change', { bubbles: true }))

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: expect.objectContaining({
          auto_select: { mode: 'recent_activity' },
        }),
      }),
    })
  )
})

test('group editor does not write default selector options', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete

  const showIconsRow = Array.from(
    editor.shadowRoot?.querySelectorAll('.option-row') ?? []
  ).find((row) => row.textContent?.includes('Show icons'))
  const showIconsSwitch = showIconsRow?.querySelector(
    'ha-switch'
  ) as HTMLInputElement

  Object.defineProperty(showIconsSwitch, 'checked', {
    configurable: true,
    value: true,
  })
  showIconsSwitch.dispatchEvent(new Event('change', { bubbles: true }))

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: { cards: [{ entity: 'climate.living_room' }] },
      }),
    })
  )
})

test('group editor only writes selector options that differ from defaults', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete

  const statesRow = Array.from(
    editor.shadowRoot?.querySelectorAll('.option-row') ?? []
  ).find((row) => row.textContent?.includes('Show states'))
  const statesSwitch = statesRow?.querySelector('ha-switch') as HTMLInputElement

  Object.defineProperty(statesSwitch, 'checked', {
    configurable: true,
    value: true,
  })
  statesSwitch.dispatchEvent(new Event('change', { bubbles: true }))

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: {
          cards: [{ entity: 'climate.living_room' }],
          selector: { states: true },
        },
      }),
    })
  )
})

test('group editor writes optional tab selector style', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete

  expect(editor.shadowRoot?.textContent).toContain('Selector style')

  const tabButton = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-button') ?? []
  ).find((button) =>
    button.textContent?.includes('Tabbed buttons')
  ) as HTMLElement

  tabButton.click()

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: {
          cards: [{ entity: 'climate.living_room' }],
          selector: { style: 'tabs' },
        },
      }),
    })
  )
})

test('group editor exposes remember selection and storage key', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete

  const rememberRow = Array.from(
    editor.shadowRoot?.querySelectorAll('.option-row') ?? []
  ).find((row) => row.textContent?.includes('Remember selection'))
  const rememberSwitch = rememberRow?.querySelector(
    'ha-switch'
  ) as HTMLInputElement

  Object.defineProperty(rememberSwitch, 'checked', {
    configurable: true,
    value: false,
  })
  rememberSwitch.dispatchEvent(new Event('change', { bubbles: true }))

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: expect.objectContaining({
          remember_selection: false,
        }),
      }),
    })
  )

  const storageKey = editor.shadowRoot?.querySelector(
    'ha-textfield[label="Storage key"]'
  ) as HTMLInputElement
  Object.defineProperty(storageKey, 'value', {
    configurable: true,
    value: 'garage-climates',
  })
  storageKey.dispatchEvent(new Event('input', { bubbles: true }))

  expect(configChanged).toHaveBeenLastCalledWith(
    expect.objectContaining({
      detail: expect.objectContaining({
        config: expect.objectContaining({
          storage_key: 'garage-climates',
        }),
      }),
    })
  )
})
