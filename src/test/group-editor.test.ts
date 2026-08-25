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
