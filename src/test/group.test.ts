import { name as CARD_NAME } from '../../package.json'
import SimpleThermostatGroup from '../group'

const groupTag = 'simple-thermostat-group-test'

const embeddedSetConfig = jest.fn()
const embeddedHass = jest.fn()
const callService = jest.fn()

class EmbeddedSimpleThermostatStub extends HTMLElement {
  private root = this.attachShadow({ mode: 'open' })

  connectedCallback() {
    this.root.innerHTML = `
      <ha-card style="background: linear-gradient(145deg, red, blue)">
        <header style="height: 24px"></header>
        <section class="body"></section>
      </ha-card>
    `
  }

  setConfig(config: any) {
    embeddedSetConfig(config)
    this.dataset.entity = config.entity

    const card = this.root.querySelector('ha-card') as HTMLElement | null
    if (card) {
      card.style.background =
        config.entity === 'climate.transparent'
          ? 'transparent'
          : 'linear-gradient(145deg, red, blue)'
    }
  }

  set hass(hass: any) {
    embeddedHass(hass)
  }
}

function defineElements() {
  if (!customElements.get(CARD_NAME)) {
    customElements.define(CARD_NAME, EmbeddedSimpleThermostatStub)
  }

  if (!customElements.get(groupTag)) {
    customElements.define(groupTag, SimpleThermostatGroup)
  }
}

function createGroup() {
  defineElements()
  const group = document.createElement(groupTag) as SimpleThermostatGroup
  document.body.appendChild(group)
  return group
}

function domRect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    toJSON: () => ({}),
  } as DOMRect
}

const hass = {
  callService,
  states: {
    'climate.living_room': {
      entity_id: 'climate.living_room',
      state: 'cool',
      attributes: {
        friendly_name: 'Living Room',
        icon: 'mdi:air-conditioner',
        current_temperature: 22.4,
      },
    },
    'climate.bedroom': {
      entity_id: 'climate.bedroom',
      state: 'off',
      attributes: {
        friendly_name: 'Bedroom',
      },
    },
  },
  formatEntityName: (entity: any) => entity.attributes.friendly_name,
  formatEntityState: (entity: any) => entity.state,
  localize: (key: string) => key,
  config: { unit_system: { temperature: '°C' } },
}

beforeEach(() => {
  document.body.innerHTML = ''
  window.localStorage.clear()
  embeddedSetConfig.mockClear()
  embeddedHass.mockClear()
  callService.mockClear()
})

test('renders only a selector and an embedded simple thermostat card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC', icon: 'mdi:air-conditioner' },
        layout: { step: 'row' },
      },
      {
        entity: 'climate.bedroom',
        header: { name: 'Bedroom AC' },
      },
    ],
  })
  group.hass = hass as any

  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-selector')).not.toBe(null)
  expect(group.shadowRoot?.querySelector('.group-card')).not.toBe(null)
  expect(group.shadowRoot?.querySelector('.embedded-card-host')).not.toBe(null)
  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Living AC'
  )
  expect(group.shadowRoot?.querySelector('.group-count')).toBe(null)
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      entity: 'climate.living_room',
      embedded: true,
      header: { name: 'Living AC', icon: 'mdi:air-conditioner' },
      layout: { step: 'row' },
    })
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.not.objectContaining({
      header: false,
    })
  )
  expect(embeddedHass).toHaveBeenLastCalledWith(hass)
})

test('switches the embedded card without rewriting the selected card config', async () => {
  const group = createGroup()

  group.setConfig({
    card: { decimals: 0 },
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      {
        entity: 'climate.bedroom',
        header: { name: 'Bedroom AC' },
        control: { hvac: false },
      },
    ],
  })
  group.hass = hass as any
  await group.updateComplete
  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
  expect(group.shadowRoot?.querySelector('.group-count')).toBe(null)
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      entity: 'climate.bedroom',
      header: { name: 'Bedroom AC' },
      decimals: 0,
      control: { hvac: false },
    })
  )
  expect(
    group.shadowRoot
      ?.querySelector('.embedded-card-host simple-thermostat')
      ?.getAttribute('data-entity')
  ).toBe('climate.bedroom')
})

test('keeps nested fan controls on grouped climate cards', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC' },
        control: ['hvac', 'fan'],
      },
    ],
  })
  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.living_room': {
        ...hass.states['climate.living_room'],
        attributes: {
          ...hass.states['climate.living_room'].attributes,
          fan_modes: ['auto', 'low', 'medium', 'high'],
          fan_mode: 'auto',
        },
      },
    },
  } as any
  await group.updateComplete

  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      entity: 'climate.living_room',
      control: ['hvac', 'fan'],
    })
  )
})

test('passes full object target config to the embedded card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        type: 'custom:simple-thermostat',
        entity: 'climate.living_room',
        hide: { temperature: false, state: true },
        layout: {
          mode: { headings: false, icons: true, names: true },
          step: 'row',
        },
        header: {},
        step_size: 0.1,
        control: { hvac: true },
        card_mod: {
          style: 'ha-card { background: red; }',
        },
      },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      type: 'custom:simple-thermostat',
      entity: 'climate.living_room',
      embedded: true,
      hide: { temperature: false, state: true },
      layout: {
        mode: { headings: false, icons: true, names: true },
        step: 'row',
      },
      header: {},
      step_size: 0.1,
      control: { hvac: true },
      card_mod: {
        style: 'ha-card { background: red; }',
      },
    })
  )
})

test('moves header toggles into the group selector and marks the embedded card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: {
          name: 'Living AC',
          icon: 'mdi:air-conditioner',
          toggle: { entity: 'switch.furnace', name: 'Furnace' },
        },
      },
    ],
  })
  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'switch.furnace': {
        entity_id: 'switch.furnace',
        state: 'off',
        attributes: { friendly_name: 'Furnace' },
      },
    },
  } as any
  await group.updateComplete

  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      entity: 'climate.living_room',
      header: {
        name: 'Living AC',
        icon: 'mdi:air-conditioner',
        toggle: { entity: 'switch.furnace', name: 'Furnace' },
      },
    })
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.not.objectContaining({
      embedded: true,
      header: false,
    })
  )
  expect(group.shadowRoot?.querySelector('.group-toggles')).not.toBe(null)

  const toggle = group.shadowRoot?.querySelector(
    '.group-toggle ha-switch'
  ) as HTMLElement & { checked: boolean }
  toggle.checked = true
  toggle.dispatchEvent(new Event('change'))

  expect(callService).toHaveBeenCalledWith('homeassistant', 'turn_on', {
    entity_id: 'switch.furnace',
  })
})

test('uses the same resolved header icon as the embedded stock card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: {
          name: 'Living AC',
          icon: {
            cooling: 'mdi:snowflake',
            idle: 'mdi:air-conditioner',
            off: 'mdi:air-conditioner-off',
          },
        },
      },
    ],
  })
  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.living_room': {
        ...hass.states['climate.living_room'],
        attributes: {
          ...hass.states['climate.living_room'].attributes,
          hvac_action: 'cooling',
        },
      },
    },
  } as any
  await group.updateComplete

  const icon = group.shadowRoot?.querySelector(
    '.header__icon'
  ) as HTMLElement

  expect((icon as any).icon).toBe('mdi:snowflake')
  expect(icon.classList.contains('cooling')).toBe(true)
  expect(
    group.shadowRoot
      ?.querySelector('.group-card')
      ?.classList.contains('cooling')
  ).toBe(true)
})

test('opens the picker from the dots and selects a target directly', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const menuButton = group.shadowRoot?.querySelector(
    'button[aria-label="Select device"]'
  ) as HTMLButtonElement
  menuButton.click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-picker')).not.toBe(null)
  expect(
    group.shadowRoot?.querySelector('.group-picker button.selected')?.textContent
  ).toContain('Living AC')
  expect(
    group.shadowRoot?.querySelector('.group-picker .selected-indicator')
  ).toBe(null)

  const bedroomButton = Array.from(
    group.shadowRoot?.querySelectorAll('.group-picker button') ?? []
  ).find((button) => button.textContent?.includes('Bedroom AC')) as HTMLButtonElement
  bedroomButton.click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
  expect(group.shadowRoot?.querySelector('.group-picker')).toBe(null)
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({ entity: 'climate.bedroom' })
  )
})

test('picker follows arrow order and closes when the current target is clicked', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )

  const menuButton = group.shadowRoot?.querySelector(
    'button[aria-label="Select device"]'
  ) as HTMLButtonElement
  menuButton.click()
  await group.updateComplete

  const items = Array.from(
    group.shadowRoot?.querySelectorAll('.group-picker button') ?? []
  )

  expect(items.map((item) => item.textContent?.trim())).toEqual(
    expect.arrayContaining(['Living AC', 'Bedroom AC'])
  )
  expect(items[0].textContent).toContain('Living AC')
  expect(items[1].textContent).toContain('Bedroom AC')
  expect(items[1].classList.contains('selected')).toBe(true)

  ;(items[1] as HTMLButtonElement).click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-picker')).toBe(null)
})

test('keeps the picker scrollable instead of clipping long target lists', async () => {
  const styles = String((SimpleThermostatGroup as any).styles.cssText ?? '')

  expect(styles).toContain('overflow: visible')
  expect(styles).toContain('max-height: min(320px, 60vh)')
  expect(styles).toContain('overflow: auto')
  expect(styles).toContain('z-index: 5')
})

test('keeps header controls in fixed columns so embedded content cannot nudge them', () => {
  const styles = String((SimpleThermostatGroup as any).styles.cssText ?? '')

  expect(styles).toContain(
    'grid-template-columns: minmax(0, 1fr) 96px'
  )
  expect(styles).toContain("grid-template-areas: 'content nav'")
  expect(styles).toContain('grid-area: content')
  expect(styles).toContain('grid-area: nav')
  expect(styles).toContain('justify-self: end')
  expect(styles).toContain('width: 96px')
  expect(styles).toContain('width: 34px')
  expect(styles).toContain('width: 20px')
  expect(styles).toContain('height: 34px')
  expect(styles).toContain('transform: translateY(-1px)')
})

test('does not hide selected card current value or state rows', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [{ entity: 'climate.living_room', header: { name: 'Living AC' } }],
  })
  group.hass = hass as any
  await group.updateComplete

  const embeddedConfig = embeddedSetConfig.mock.calls.at(-1)?.[0]

  expect(group.shadowRoot?.querySelector('.group-current')).toBe(null)
  expect(embeddedConfig?.hide?.temperature).not.toBe(true)
  expect(embeddedConfig?.hide?.state).not.toBe(true)
})

test('uses fit-to-space group title sizing without changing normal card titles', () => {
  const styles = String((SimpleThermostatGroup as any).styles.cssText ?? '')

  expect(styles).toContain('--st-group-title-fit-size')
  expect(styles).toContain('--st-group-title-fit-line-height')
  expect(styles).toContain('--st-group-title-font-size')
  expect(styles).toContain('0.9')
})

test('does not reserve toggle space when the selected card has no toggles', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [{ entity: 'climate.living_room', header: { name: 'Living AC' } }],
  })
  group.hass = hass as any
  await group.updateComplete

  const toggles = group.shadowRoot?.querySelector('.group-toggles')
  const nav = group.shadowRoot?.querySelector('.group-nav-cluster')

  expect(toggles).toBe(null)
  expect(nav).not.toBe(null)
})

test('closes the picker when clicking outside the group card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const menuButton = group.shadowRoot?.querySelector(
    'button[aria-label="Select device"]'
  ) as HTMLButtonElement
  menuButton.click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-picker')).not.toBe(null)

  document.body.dispatchEvent(
    new Event('pointerdown', { bubbles: true, composed: true })
  )
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-picker')).toBe(null)
})

test('remembers the selected embedded card when enabled', async () => {
  const group = createGroup()
  const config = {
    storage_key: 'test',
    cards: ['climate.living_room', 'climate.bedroom'],
  }

  group.setConfig(config)
  group.hass = hass as any
  await group.updateComplete

  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete

  const secondGroup = createGroup()
  secondGroup.setConfig(config)
  secondGroup.hass = hass as any
  await secondGroup.updateComplete

  expect(secondGroup.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom'
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({ entity: 'climate.bedroom' })
  )
})

test('keeps the embedded stock card surface intact without mutating its shadow header', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [{ entity: 'climate.living_room', header: { name: 'Living AC' } }],
  })
  group.hass = hass as any
  await group.updateComplete
  await Promise.resolve()
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve())
  )

  const child = group.shadowRoot?.querySelector(
    '.embedded-card-host simple-thermostat'
  ) as HTMLElement
  const childCard = child?.shadowRoot?.querySelector('ha-card') as HTMLElement
  const childHeader = child?.shadowRoot?.querySelector('header') as HTMLElement
  const groupCard = group.shadowRoot?.querySelector(
    '.group-card'
  ) as HTMLElement
  const embeddedConfig = embeddedSetConfig.mock.calls.at(-1)?.[0]

  expect(groupCard).not.toBe(null)
  expect(groupCard.tagName.toLowerCase()).toBe('div')
  expect(embeddedConfig).toEqual(expect.objectContaining({ embedded: true }))
  expect(childCard.style.background).toContain('linear-gradient')
  expect(childHeader.style.visibility).toBe('')
  expect(childHeader.style.pointerEvents).toBe('')
  expect(childHeader.style.minHeight).toBe('')
  expect(childHeader.style.display).toBe('')
  expect(
    child.style.getPropertyValue('--st-group-embedded-header-min-height')
  ).toBe('56px')
})

test('measures the selector reserve without mutating the embedded shadow DOM', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [{ entity: 'climate.living_room', header: { name: 'Living AC' } }],
  })
  group.hass = hass as any
  await group.updateComplete

  const selector = group.shadowRoot?.querySelector(
    '.group-selector'
  ) as HTMLElement
  const child = group.shadowRoot?.querySelector(
    '.embedded-card-host simple-thermostat'
  ) as HTMLElement
  const childHeader = child?.shadowRoot?.querySelector('header') as HTMLElement

  jest.spyOn(selector, 'getBoundingClientRect').mockReturnValue(domRect(0, 96))
  jest.spyOn(child, 'getBoundingClientRect').mockReturnValue(domRect(20, 120))

  ;(group as any).applyEmbeddedPresentation()

  expect(
    child.style.getPropertyValue('--st-group-embedded-header-min-height')
  ).toBe('84px')
  expect(childHeader.style.visibility).toBe('')
  expect(childHeader.style.minHeight).toBe('')
})

test('keeps a compact minimum selector reserve when the measured header is short', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [{ entity: 'climate.living_room', header: { name: 'Living AC' } }],
  })
  group.hass = hass as any
  await group.updateComplete

  const selector = group.shadowRoot?.querySelector(
    '.group-selector'
  ) as HTMLElement
  const child = group.shadowRoot?.querySelector(
    '.embedded-card-host simple-thermostat'
  ) as HTMLElement

  jest.spyOn(selector, 'getBoundingClientRect').mockReturnValue(domRect(0, 48))
  jest.spyOn(child, 'getBoundingClientRect').mockReturnValue(domRect(0, 120))

  ;(group as any).applyEmbeddedPresentation()

  expect(
    child.style.getPropertyValue('--st-group-embedded-header-min-height')
  ).toBe('56px')
})

test('does not create a separate theme-derived card surface around the child card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [{ entity: 'climate.living_room', header: { name: 'Living AC' } }],
  })
  group.hass = hass as any
  await group.updateComplete

  const styles = String((SimpleThermostatGroup as any).styles.cssText ?? '')
  const groupCardRule = styles.match(/\.group-card\s*\{[^}]*\}/)?.[0] ?? ''

  expect(groupCardRule).toContain('display: block')
  expect(groupCardRule).toContain('overflow: visible')
  expect(groupCardRule).not.toContain('background')
  expect(styles).not.toContain('syncGroupSurface')
  expect(styles).not.toContain('card.style.background')
})

test('passes target card_mod through to the embedded card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC' },
        card_mod: {
          style: 'ha-card { background: linear-gradient(red, blue); }',
        },
      },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const embeddedConfig = embeddedSetConfig.mock.calls.at(-1)?.[0]
  expect(embeddedConfig).toEqual(
    expect.objectContaining({
      card_mod: {
        style: 'ha-card { background: linear-gradient(red, blue); }',
      },
    })
  )
  expect(group.shadowRoot?.querySelector('ha-card.group-card')).toBe(null)
})

test('passes object-form target card_mod through to the embedded card', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC' },
        card_mod: {
          style: {
            '.': 'ha-card { background: linear-gradient(red, blue); }',
          },
        },
      },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const embeddedConfig = embeddedSetConfig.mock.calls.at(-1)?.[0]
  expect(embeddedConfig).toEqual(
    expect.objectContaining({
      card_mod: {
        style: {
          '.': 'ha-card { background: linear-gradient(red, blue); }',
        },
      },
    })
  )
  expect(group.shadowRoot?.querySelector('ha-card.group-card')).toBe(null)
})

test('passes the source card_mod when the selected target config is lightweight', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC' },
        card_mod: {
          style: 'ha-card { background: linear-gradient(red, blue); }',
        },
      },
    ],
  })
  ;(group as any).targets = [
    {
      entity: 'climate.living_room',
      config: {
        entity: 'climate.living_room',
        type: `custom:${CARD_NAME}`,
      },
    },
  ]
  group.hass = hass as any
  await group.updateComplete

  const embeddedConfig = embeddedSetConfig.mock.calls.at(-1)?.[0]
  expect(embeddedConfig).toEqual(
    expect.objectContaining({
      card_mod: {
        style: 'ha-card { background: linear-gradient(red, blue); }',
      },
    })
  )
  expect(group.shadowRoot?.querySelector('ha-card.group-card')).toBe(null)
})

test('uses a sibling card_mod for lightweight targets without their own card_mod', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      {
        entity: 'climate.living_room',
        header: { name: 'Living AC' },
        card_mod: {
          style: 'ha-card { background: linear-gradient(red, blue); }',
        },
      },
      'climate.bedroom',
    ],
  })
  ;(group as any).targets = [
    {
      entity: 'climate.bedroom',
      config: {
        entity: 'climate.bedroom',
        type: `custom:${CARD_NAME}`,
      },
    },
  ]
  group.hass = hass as any
  await group.updateComplete

  const embeddedConfig = embeddedSetConfig.mock.calls.at(-1)?.[0]

  expect(embeddedConfig).toEqual(
    expect.objectContaining({
      entity: 'climate.bedroom',
      card_mod: {
        style: 'ha-card { background: linear-gradient(red, blue); }',
      },
    })
  )
  expect(group.shadowRoot?.querySelector('ha-card.group-card')).toBe(null)
})

test('keeps the embedded surface contract while switching', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.transparent', header: { name: 'Transparent' } },
    ],
  })
  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.transparent': {
        entity_id: 'climate.transparent',
        state: 'off',
        attributes: { friendly_name: 'Transparent' },
      },
    },
  } as any
  await group.updateComplete
  await Promise.resolve()
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve())
  )

  const child = group.shadowRoot?.querySelector(
    '.embedded-card-host simple-thermostat'
  ) as HTMLElement
  expect(child).not.toBe(null)
  expect(
    embeddedSetConfig.mock.calls
      .map(([config]) => config)
      .some(
        (config) =>
          config.entity === 'climate.living_room' && config.embedded === true
      )
  ).toBe(true)

  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete
  await Promise.resolve()
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve())
  )

  expect(
    embeddedSetConfig.mock.calls
      .map(([config]) => config)
      .some(
        (config) =>
          config.entity === 'climate.transparent' && config.embedded === true
      )
  ).toBe(true)
})

test('fades the embedded card during selector changes', async () => {
  const group = createGroup()

  group.setConfig({
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const styles = String((SimpleThermostatGroup as any).styles.cssText ?? '')
  expect(styles).toContain('.embedded-card-host.fading')
  expect(styles).toContain('transition: opacity 120ms ease')
  expect(styles).toContain(
    'transform: translateY(var(--st-group-header-top-buffer, 6px))'
  )
  expect(styles).not.toContain(
    'padding-top: var(--st-group-body-top-buffer, 14px)'
  )

  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete

  expect(
    group.shadowRoot
      ?.querySelector('.embedded-card-host')
      ?.classList.contains('fading')
  ).toBe(true)
})

test('auto-selects the device with recent meaningful activity', async () => {
  const group = createGroup()

  group.setConfig({
    auto_select: { mode: 'recent_activity', cooldown_ms: 0 },
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.bedroom': {
        ...hass.states['climate.bedroom'],
        state: 'heat',
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          ...hass.states['climate.bedroom'].attributes,
          hvac_action: 'heating',
        },
      },
    },
  } as any
  await group.updateComplete
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
})

test('uses persisted recent activity when the group reloads', async () => {
  const config = {
    auto_select: { mode: 'recent_activity' as const, cooldown_ms: 0 },
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  }
  const activeHass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.bedroom': {
        ...hass.states['climate.bedroom'],
        state: 'heat',
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          ...hass.states['climate.bedroom'].attributes,
          hvac_action: 'heating',
        },
      },
    },
  }

  const firstGroup = createGroup()
  firstGroup.setConfig(config)
  firstGroup.hass = hass as any
  await firstGroup.updateComplete

  firstGroup.hass = activeHass as any
  await firstGroup.updateComplete
  await firstGroup.updateComplete

  const secondGroup = createGroup()
  secondGroup.setConfig(config)
  secondGroup.hass = activeHass as any
  await secondGroup.updateComplete
  await secondGroup.updateComplete

  expect(secondGroup.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
})

test('seeds recent activity from active devices before inactive timestamp noise', async () => {
  const group = createGroup()

  group.setConfig({
    auto_select: { mode: 'recent_activity' as const, cooldown_ms: 0 },
    cards: [
      { entity: 'climate.garage', header: { name: 'Garage Heat' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.garage': {
        entity_id: 'climate.garage',
        state: 'off',
        last_updated: '2026-07-05T12:10:00.000Z',
        attributes: {
          friendly_name: 'Garage Heat',
        },
      },
      'climate.bedroom': {
        ...hass.states['climate.bedroom'],
        state: 'cool',
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          ...hass.states['climate.bedroom'].attributes,
          hvac_action: 'cooling',
        },
      },
    },
  } as any
  await group.updateComplete
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
})

test('keeps persisted active activity ahead of newer inactive state timestamps', async () => {
  const config = {
    auto_select: { mode: 'recent_activity' as const, cooldown_ms: 0 },
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  }
  const activeBedroomHass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.bedroom': {
        ...hass.states['climate.bedroom'],
        state: 'heat',
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          ...hass.states['climate.bedroom'].attributes,
          hvac_action: 'heating',
        },
      },
    },
  }
  const noisyTimestampHass = {
    ...activeBedroomHass,
    states: {
      ...activeBedroomHass.states,
      'climate.living_room': {
        ...activeBedroomHass.states['climate.living_room'],
        last_changed: '2026-07-05T11:00:00.000Z',
        last_updated: '2026-07-05T12:30:00.000Z',
      },
    },
  }

  const firstGroup = createGroup()
  firstGroup.setConfig(config)
  firstGroup.hass = hass as any
  await firstGroup.updateComplete

  firstGroup.hass = activeBedroomHass as any
  await firstGroup.updateComplete
  await firstGroup.updateComplete

  const secondGroup = createGroup()
  secondGroup.setConfig(config)
  secondGroup.hass = noisyTimestampHass as any
  await secondGroup.updateComplete
  await secondGroup.updateComplete

  expect(secondGroup.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
})

test('prefers newer active climate activity over stale persisted humidifier selection', async () => {
  const config = {
    auto_select: { mode: 'recent_activity' as const, cooldown_ms: 0 },
    cards: [
      {
        entity: 'humidifier.basement_dehumidifiers',
        header: { name: 'Basement Dehumidifiers' },
      },
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
    ],
  }
  const humidifierHass = {
    ...hass,
    states: {
      ...hass.states,
      'humidifier.basement_dehumidifiers': {
        entity_id: 'humidifier.basement_dehumidifiers',
        state: 'on',
        last_changed: '2026-07-05T12:00:00.000Z',
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          friendly_name: 'Basement Dehumidifiers',
          action: 'idle',
          humidity: 55,
        },
      },
      'climate.living_room': {
        ...hass.states['climate.living_room'],
        state: 'cool',
        last_changed: '2026-07-05T11:00:00.000Z',
        last_updated: '2026-07-05T11:00:00.000Z',
        attributes: {
          ...hass.states['climate.living_room'].attributes,
          hvac_action: 'idle',
        },
      },
    },
  }
  const coolingHass = {
    ...humidifierHass,
    states: {
      ...humidifierHass.states,
      'climate.living_room': {
        ...humidifierHass.states['climate.living_room'],
        state: 'cool',
        last_changed: '2026-07-05T11:00:00.000Z',
        last_updated: '2026-07-05T13:00:00.000Z',
        attributes: {
          ...humidifierHass.states['climate.living_room'].attributes,
          hvac_action: 'cooling',
        },
      },
    },
  }

  const firstGroup = createGroup()
  firstGroup.setConfig(config)
  firstGroup.hass = humidifierHass as any
  await firstGroup.updateComplete
  await firstGroup.updateComplete

  expect(firstGroup.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Basement Dehumidifiers'
  )

  const secondGroup = createGroup()
  secondGroup.setConfig(config)
  secondGroup.hass = coolingHass as any
  await secondGroup.updateComplete
  await secondGroup.updateComplete

  expect(secondGroup.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Living AC'
  )
})

test('does not auto-select for current temperature updates', async () => {
  const group = createGroup()

  group.setConfig({
    auto_select: { mode: 'recent_activity', cooldown_ms: 0 },
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.bedroom': {
        ...hass.states['climate.bedroom'],
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          ...hass.states['climate.bedroom'].attributes,
          current_temperature: 21.5,
        },
      },
    },
  } as any
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Living AC'
  )
})

test('pauses recent activity auto-select after manual navigation', async () => {
  jest.useFakeTimers()
  const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000)

  try {
    const group = createGroup()

    group.setConfig({
      auto_select: { mode: 'recent_activity', manual_pause_ms: 30000 },
      cards: [
        { entity: 'climate.living_room', header: { name: 'Living AC' } },
        { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
      ],
    })
    group.hass = hass as any
    await group.updateComplete

    const nextButton = group.shadowRoot?.querySelector(
      'button[aria-label="Next device"]'
    ) as HTMLButtonElement
    nextButton.click()
    await group.updateComplete

    expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
      'Bedroom AC'
    )

    nowSpy.mockReturnValue(2000)
    group.hass = {
      ...hass,
      states: {
        ...hass.states,
        'climate.living_room': {
          ...hass.states['climate.living_room'],
          state: 'cool',
          last_updated: '2026-07-05T12:00:00.000Z',
          attributes: {
            ...hass.states['climate.living_room'].attributes,
            hvac_action: 'cooling',
          },
        },
      },
    } as any
    await group.updateComplete

    expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
      'Bedroom AC'
    )

    jest.advanceTimersByTime(29999)
    await Promise.resolve()
    await group.updateComplete

    expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
      'Bedroom AC'
    )

    jest.advanceTimersByTime(1)
    await Promise.resolve()
    await group.updateComplete

    expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
      'Living AC'
    )
  } finally {
    nowSpy.mockRestore()
    jest.useRealTimers()
  }
})

test('keeps stored manual selection on refresh when no target changed later', async () => {
  const selectedAt = Date.parse('2026-07-05T12:00:00.000Z')
  const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(selectedAt)

  try {
    const first = createGroup()
    first.setConfig({
      auto_select: { mode: 'recent_activity', manual_pause_ms: 30000 },
      cards: [
        { entity: 'climate.living_room', header: { name: 'Living AC' } },
        { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
      ],
    })
    first.hass = hass as any
    await first.updateComplete

    const nextButton = first.shadowRoot?.querySelector(
      'button[aria-label="Next device"]'
    ) as HTMLButtonElement
    nextButton.click()
    await first.updateComplete

    first.remove()

    const second = createGroup()
    second.hass = {
      ...hass,
      states: {
        ...hass.states,
        'climate.living_room': {
          ...hass.states['climate.living_room'],
          last_changed: '2026-07-05T11:59:59.000Z',
          last_updated: '2026-07-05T11:59:59.000Z',
        },
      },
    } as any
    second.setConfig({
      auto_select: { mode: 'recent_activity', manual_pause_ms: 30000 },
      cards: [
        { entity: 'climate.living_room', header: { name: 'Living AC' } },
        { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
      ],
    })
    await second.updateComplete

    expect(second.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
      'Bedroom AC'
    )
  } finally {
    nowSpy.mockRestore()
  }
})

test('lets newer recent activity override stored manual selection on refresh', async () => {
  const selectedAt = Date.parse('2026-07-05T12:00:00.000Z')
  const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(selectedAt)

  try {
    const first = createGroup()
    first.setConfig({
      auto_select: { mode: 'recent_activity', manual_pause_ms: 30000 },
      cards: [
        { entity: 'climate.living_room', header: { name: 'Living AC' } },
        { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
      ],
    })
    first.hass = hass as any
    await first.updateComplete

    const nextButton = first.shadowRoot?.querySelector(
      'button[aria-label="Next device"]'
    ) as HTMLButtonElement
    nextButton.click()
    await first.updateComplete

    first.remove()

    const second = createGroup()
    second.hass = {
      ...hass,
      states: {
        ...hass.states,
        'climate.living_room': {
          ...hass.states['climate.living_room'],
          last_changed: '2026-07-05T12:00:01.000Z',
          last_updated: '2026-07-05T12:00:01.000Z',
          attributes: {
            ...hass.states['climate.living_room'].attributes,
            hvac_action: 'cooling',
          },
        },
      },
    } as any
    second.setConfig({
      auto_select: { mode: 'recent_activity', manual_pause_ms: 30000 },
      cards: [
        { entity: 'climate.living_room', header: { name: 'Living AC' } },
        { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
      ],
    })
    await second.updateComplete
    await second.updateComplete

    expect(second.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
      'Living AC'
    )
  } finally {
    nowSpy.mockRestore()
  }
})

test('does not auto-select while the selector menu is open', async () => {
  const group = createGroup()

  group.setConfig({
    auto_select: { mode: 'recent_activity', cooldown_ms: 0 },
    cards: [
      { entity: 'climate.living_room', header: { name: 'Living AC' } },
      { entity: 'climate.bedroom', header: { name: 'Bedroom AC' } },
    ],
  })
  group.hass = hass as any
  await group.updateComplete

  const menuButton = group.shadowRoot?.querySelector(
    'button[aria-label="Select device"]'
  ) as HTMLButtonElement
  menuButton.click()
  await group.updateComplete

  group.hass = {
    ...hass,
    states: {
      ...hass.states,
      'climate.bedroom': {
        ...hass.states['climate.bedroom'],
        state: 'heat',
        last_updated: '2026-07-05T12:00:00.000Z',
        attributes: {
          ...hass.states['climate.bedroom'].attributes,
          hvac_action: 'heating',
        },
      },
    },
  } as any
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Living AC'
  )
})
