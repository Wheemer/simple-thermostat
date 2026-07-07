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

const hass = {
  callService,
  states: {
    'climate.living_room': {
      entity_id: 'climate.living_room',
      state: 'cool',
      attributes: {
        friendly_name: 'Living Room',
        icon: 'mdi:air-conditioner',
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
  expect(group.shadowRoot?.querySelector('.group-count')?.textContent).toBe(
    '1 / 2'
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      entity: 'climate.living_room',
      header: { name: 'Living AC', icon: 'mdi:air-conditioner' },
      layout: { step: 'row' },
    })
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.not.objectContaining({
      embedded: true,
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
  const initialChild = group.shadowRoot?.querySelector(
    '.embedded-card-host simple-thermostat'
  )

  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete

  expect(group.shadowRoot?.querySelector('.group-title')?.textContent).toBe(
    'Bedroom AC'
  )
  expect(group.shadowRoot?.querySelector('.group-count')?.textContent).toBe(
    '2 / 2'
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({
      entity: 'climate.bedroom',
      header: { name: 'Bedroom AC' },
      decimals: 0,
      control: { hvac: false },
    })
  )
  expect(
    group.shadowRoot?.querySelector('.embedded-card-host simple-thermostat')
  ).toBe(initialChild)
})

test('moves header toggles into the group selector and hides the embedded header', async () => {
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
    'grid-template-columns: minmax(0, 1fr) 78px'
  )
  expect(styles).toContain("grid-template-areas: 'content nav'")
  expect(styles).toContain('grid-area: content')
  expect(styles).toContain('grid-area: nav')
  expect(styles).toContain('justify-self: end')
  expect(styles).toContain('width: 78px')
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

  expect(secondGroup.shadowRoot?.querySelector('.group-count')?.textContent).toBe(
    '2 / 2'
  )
  expect(embeddedSetConfig).toHaveBeenLastCalledWith(
    expect.objectContaining({ entity: 'climate.bedroom' })
  )
})

test('keeps the embedded stock card surface intact and overlays only the header', async () => {
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
  expect(childCard.style.background).toContain('linear-gradient')
  expect(childHeader.style.visibility).toBe('hidden')
  expect(childHeader.style.pointerEvents).toBe('none')
  expect(childHeader.style.display).toBe('')
  expect(childCard.style.border).toBe('')
  expect(childCard.style.boxShadow).toBe('')
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

test('keeps the embedded card responsible for its own surface while switching', async () => {
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
  const childCard = child?.shadowRoot?.querySelector('ha-card') as HTMLElement
  expect(childCard.style.background).toContain('linear-gradient')

  const nextButton = group.shadowRoot?.querySelector(
    'button[aria-label="Next device"]'
  ) as HTMLButtonElement
  nextButton.click()
  await group.updateComplete
  await Promise.resolve()
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve())
  )

  expect(childCard.style.background).toBe('transparent')
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
