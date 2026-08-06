import { html, nothing } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import formatNumber from '../formatNumber'
import { appendUnit } from '../unitFormat'
import { LooseObject } from '../types'
import { getToggleKind, getToggleKindClass } from '../toggleKind'
import { renderTemplate } from '../template'
import './timerRemaining'

const TOGGLE_DOMAINS = [
  'automation',
  'fan',
  'humidifier',
  'input_boolean',
  'light',
  'switch',
]
const BUTTON_DOMAINS = ['button', 'input_button', 'script', 'scene']
const DISPLAY_VALUES = ['row', 'auto', 'button', 'toggle', 'chip']

interface InfoItemDetails extends LooseObject {
  heading?: string | false
  icon?: string
  unit?: string
  decimals?: number
  tooltip?: string
  entity?: string
  type?: string
  template?: string
  attribute?: string
  variables?: LooseObject
  config?: LooseObject
  separator?: boolean
  display?: 'row' | 'auto' | 'button' | 'toggle' | 'chip'
}

interface InfoItemOptions {
  hide?: boolean
  state: any
  hass: any
  localize?
  openEntityPopover?
  details: InfoItemDetails
}

function toggleEntity(hass, entityId: string, checked: boolean) {
  const service = `turn_${checked ? 'on' : 'off'}`
  if (typeof hass.performAction === 'function') {
    hass.performAction({
      action: `homeassistant.${service}`,
      data: { entity_id: entityId },
    })
  } else {
    hass.callService('homeassistant', service, { entity_id: entityId })
  }
}

function safeClass(value: unknown) {
  return String(value ?? '').replace(/[^a-z0-9_-]/gi, '')
}

function callEntityAction(hass, entityId: string, domain: string) {
  if (TOGGLE_DOMAINS.includes(domain)) {
    const checked = hass.states?.[entityId]?.state !== 'on'
    toggleEntity(hass, entityId, checked)
    return
  }

  const service = domain === 'button' || domain === 'input_button'
    ? 'press'
    : 'turn_on'

  if (typeof hass.performAction === 'function') {
    hass.performAction({
      action: `${domain}.${service}`,
      data: { entity_id: entityId },
    })
  } else {
    hass.callService(domain, service, { entity_id: entityId })
  }
}

function renderIconTemplate({
  icon,
  state,
  attribute,
  hass,
  config,
  variables,
  localize,
}: {
  icon?: string
  state: unknown
  attribute?: string
  hass: any
  config?: LooseObject
  variables?: LooseObject
  localize?: (label: string, prefix?: string) => string
}) {
  if (
    typeof icon !== 'string' ||
    !icon.includes('{{') ||
    typeof state !== 'object' ||
    state === null
  ) {
    return icon
  }

  return renderTemplate({
    template: icon,
    stateObj: state as LooseObject,
    attribute,
    hass,
    config,
    variables,
    localize,
  }).trim()
}

function renderHeadingTemplate({
  heading,
  state,
  attribute,
  hass,
  config,
  variables,
  localize,
}: {
  heading?: string | false
  state: unknown
  attribute?: string
  hass: any
  config?: LooseObject
  variables?: LooseObject
  localize?: (label: string, prefix?: string) => string
}) {
  if (
    typeof heading !== 'string' ||
    !heading.includes('{{') ||
    typeof state !== 'object' ||
    state === null
  ) {
    return undefined
  }

  return renderTemplate({
    template: heading,
    stateObj: state as LooseObject,
    attribute,
    hass,
    config,
    variables,
    localize,
  }).trim()
}

function resolveDisplay(display: unknown, domain: string) {
  if (typeof display !== 'string' || !DISPLAY_VALUES.includes(display)) {
    return 'row'
  }

  if (display !== 'auto') return display

  if (TOGGLE_DOMAINS.includes(domain)) return 'toggle'
  if (BUTTON_DOMAINS.includes(domain)) return 'button'

  return 'chip'
}

function getEntityDisplayValue({
  state,
  domain,
  hass,
  localize,
}: {
  state: any
  domain: string
  hass: any
  localize?: (label: string, prefix?: string) => string
}) {
  if (domain === 'timer') {
    return html`<simple-thermostat-timer-remaining
      .stateObj=${state}
      .hass=${hass}
    ></simple-thermostat-timer-remaining>`
  }

  if (typeof hass.formatEntityState === 'function') {
    return hass.formatEntityState(state)
  }

  return localize
    ? localize(state.state, `component.${domain}.state._.`)
    : String(state.state)
}

export default function renderInfoItem({
  hide = false,
  hass,
  state,
  details,
  localize,
  openEntityPopover,
}: InfoItemOptions) {
  if (hide || typeof state === 'undefined') return

  const {
    type,
    heading,
    icon,
    unit,
    decimals,
    tooltip: configuredTooltip,
    entity,
    template,
    attribute,
    variables,
    config,
    separator = true,
    display,
  } = details
  const renderedIcon = renderIconTemplate({
    icon,
    state,
    attribute,
    hass,
    config,
    variables,
    localize,
  })
  const renderedHeading = renderHeadingTemplate({
    heading,
    state,
    attribute,
    hass,
    config,
    variables,
    localize,
  })
  const hasConfiguredUnit = typeof unit === 'string' && unit.length > 0
  const entityId = typeof state === 'object' ? state.entity_id : entity
  const canOpenEntity = entityId && typeof openEntityPopover === 'function'
  const entityTooltip =
    configuredTooltip ||
    (typeof state === 'object'
      ? state?.attributes?.friendly_name || state?.entity_id
      : entity
        ? hass.states?.[entity]?.attributes?.friendly_name || entity
        : undefined)
  let entityDomain = ''
  let entityState = ''
  let isToggleEntity = false
  let usesCompactEntityDisplay = false

  let valueCell
  if (template && typeof state === 'object') {
    const value = renderTemplate({
      template,
      stateObj: state,
      attribute,
      hass,
      config,
      variables,
      localize,
    })
    valueCell = html`<div
      class="entity-value ${canOpenEntity ? 'clickable' : ''}"
      title=${entityTooltip}
      @click="${canOpenEntity ? () => openEntityPopover(entityId) : null}"
    >
      ${unsafeHTML(appendUnit(value, hasConfiguredUnit ? unit : false))}
    </div>`
  } else if (type === 'relativetime') {
    valueCell = html`
      <div class="entity-value">
        <ha-relative-time .datetime=${state} .hass=${hass}></ha-relative-time>
      </div>
    `
  } else if (typeof state === 'object') {
    const [domain] = state.entity_id.split('.')
    entityDomain = domain
    entityState = state.state
    isToggleEntity = TOGGLE_DOMAINS.includes(domain)
    const displayMode = resolveDisplay(display, domain)
    const entityClasses = [
      isToggleEntity && 'toggle-entity',
      entityDomain && `domain-${safeClass(entityDomain)}`,
      entityState && `state-${safeClass(entityState)}`,
      displayMode !== 'row' && `display-${displayMode}`,
      isToggleEntity &&
        getToggleKindClass(
          getToggleKind({
            icon: renderedIcon || state.attributes?.icon,
            label: heading || state.attributes?.friendly_name,
            entity: state,
            hass,
          })
        ),
    ]
      .filter(Boolean)
      .join(' ')

    if (displayMode !== 'row') {
      usesCompactEntityDisplay = true
      const supportsAction =
        isToggleEntity || BUTTON_DOMAINS.includes(domain)
      const active = state.state === 'on'
      const actionLabel =
        typeof heading === 'string'
          ? heading
          : state.attributes?.friendly_name || state.entity_id
      const fallbackIcon =
        renderedIcon || state.attributes?.icon || (isToggleEntity
          ? 'mdi:toggle-switch'
          : BUTTON_DOMAINS.includes(domain)
            ? 'mdi:gesture-tap-button'
            : undefined)
      const displayValue = getEntityDisplayValue({
        state,
        domain,
        hass,
        localize,
      })

      valueCell = html`
        <button
          class="entity-action ${entityClasses} ${active ? 'active' : ''}"
          type="button"
          title=${entityTooltip}
          aria-pressed=${isToggleEntity ? String(active) : nothing}
          @click=${() =>
            supportsAction
              ? callEntityAction(hass, state.entity_id, domain)
              : canOpenEntity
                ? openEntityPopover(state.entity_id)
                : undefined}
        >
          ${fallbackIcon ? html`<ha-icon .icon=${fallbackIcon}></ha-icon>` : ''}
          <span class="entity-action__label">${actionLabel}</span>
          ${displayMode === 'chip' || displayMode === 'toggle'
            ? html`<span class="entity-action__state">${displayValue}</span>`
            : ''}
        </button>
      `
    } else if (domain === 'timer') {
      valueCell = html`
        <div
          class="entity-value ${canOpenEntity ? 'clickable' : ''}"
          title=${entityTooltip}
          @click="${canOpenEntity
            ? () => openEntityPopover(state.entity_id)
            : null}"
        >
          <simple-thermostat-timer-remaining
            .stateObj=${state}
            .hass=${hass}
          ></simple-thermostat-timer-remaining>
        </div>
      `
    } else if (isToggleEntity) {
      valueCell = html`
        <div class="entity-value ${entityClasses}">
          <ha-switch
            .checked=${state.state === 'on'}
            @change=${(ev: Event) =>
              toggleEntity(
                hass,
                state.entity_id,
                (ev.target as HTMLInputElement).checked
              )}
          ></ha-switch>
        </div>
      `
    } else {
      const prefix = [
        'component',
        domain,
        'state',
        state.attributes?.device_class ?? '_',
        '',
      ].join('.')
      let value =
        typeof hass.formatEntityState === 'function'
          ? hass.formatEntityState(state)
          : localize(state.state, prefix)

      if (typeof decimals === 'number') {
        value = formatNumber(state.state, {
          decimals,
          locale: hass.locale,
        })
      }
      const stateUnit = state.attributes.unit_of_measurement ?? ''
      const humidityUnit =
        state.attributes?.device_class === 'humidity' ||
        state.entity_id?.includes('humidity') ||
        icon === 'mdi:water-percent'
          ? '%'
          : ''
      const configuredUnit = hasConfiguredUnit
        ? unit
        : stateUnit || humidityUnit
      valueCell = html`
        <div
          class="entity-value ${canOpenEntity ? 'clickable' : ''}"
          title=${entityTooltip}
          @click="${canOpenEntity
            ? () => openEntityPopover(state.entity_id)
            : null}"
        >
          ${appendUnit(value, configuredUnit, value)}
        </div>
      `
    }
  } else {
    let value =
      typeof decimals === 'number'
        ? formatNumber(state, {
            decimals,
            locale: hass.locale,
          })
        : state
    valueCell = html`<div
      class="entity-value ${canOpenEntity ? 'clickable' : ''}"
      title=${entityTooltip || nothing}
      @click=${canOpenEntity ? () => openEntityPopover(entityId) : null}
    >
      ${appendUnit(value, hasConfiguredUnit ? unit : false)}
    </div>`
  }

  if (usesCompactEntityDisplay) {
    return valueCell
  }

  if (heading === false) {
    return valueCell
  }

  const tooltip = heading || entityTooltip
  const headingClasses = [
    'entity-heading',
    canOpenEntity && 'clickable',
    isToggleEntity && 'toggle-entity',
    entityDomain && `domain-${safeClass(entityDomain)}`,
    entityState && `state-${safeClass(entityState)}`,
    isToggleEntity &&
      getToggleKindClass(
        getToggleKind({
          icon: renderedIcon || state?.attributes?.icon,
          label:
            typeof heading === 'string'
              ? heading
              : state?.attributes?.friendly_name,
          entity: state,
          hass,
        })
      ),
  ]
    .filter(Boolean)
    .join(' ')

  const headingResult = renderedIcon
    ? html`
        <ha-icon
          icon="${renderedIcon}"
          title=${tooltip}
          @click=${canOpenEntity ? () => openEntityPopover(entityId) : null}
        ></ha-icon>
      `
    : typeof renderedHeading === 'string'
      ? html`${unsafeHTML(renderedHeading)}`
      : ` ${heading}${separator === false ? '' : ':'} `

  const headingCell = html`<div
      class=${headingClasses}
      title=${renderedIcon ? tooltip : nothing}
      @click=${canOpenEntity ? () => openEntityPopover(entityId) : null}
    >
      ${headingResult}
    </div>`

  return [headingCell, valueCell]
}
