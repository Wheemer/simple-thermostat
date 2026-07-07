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

test('group editor toggles recent activity auto-select', async () => {
  const editor = createEditor()
  const configChanged = jest.fn()
  editor.addEventListener('config-changed', configChanged)

  editor.setConfig({
    cards: [{ entity: 'climate.living_room' }],
  })

  await editor.updateComplete

  const autoSelectField = Array.from(
    editor.shadowRoot?.querySelectorAll('ha-formfield') ?? []
  ).find((field) => field.getAttribute('label') === 'Follow active device')
  const autoSelectSwitch = autoSelectField?.querySelector(
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
