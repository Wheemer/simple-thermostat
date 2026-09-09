import { html, nothing } from 'lit'
import { isEntityAvailable } from '../entityAvailability'
import formatNumber from '../formatNumber'
import { appendUnit } from '../unitFormat'
import { LooseObject } from '../types'
import { getToggleKind, getToggleKindClass } from '../toggleKind'
import { renderTemplate } from '../template'
import './timerRemaining'
import { renderTemplateContent } from './templateContent'

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
  if (!isEntityAvailable(hass.states?.[entityId])) return
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
  if (!isEntityAvailable(hass.states?.[entityId])) return
  if (TOGGLE_DOMAINS.includes(domain)) {
    const checked = hass.states?.[entityId]?.state !== 'on'
    toggleEntity(hass, entityId, checked)
    return
  }

  const service =
    domain === 'button' || domain === 'input_button' ? 'press' : 'turn_on'

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

function isEntityState(state: any): boolean {
  return (
    !!state && typeof state === 'object' && typeof state.entity_id === 'string'
  )
}

function renderInfoValue(
  state: any,
  details: InfoItemDetails,
  hass: any,
  localize?
) {
  const { template, attribute, decimals, unit, type, config, variables } =
    details
  const entityState = isEntityState(state)
  if (template && entityState) {
    return renderTemplateContent(
      appendUnit(
        renderTemplate({
          template,
          stateObj: state,
          attribute,
          hass,
          config,
          variables,
          localize,
        }),
        unit || false
      ),
      hass
    )
  }
  const raw = entityState
    ? attribute
      ? state.attributes?.[attribute]
      : state.state
    : state
  if (type === 'relativetime') {
    return html`<ha-relative-time
      .datetime=${raw}
      .hass=${hass}
    ></ha-relative-time>`
  }
  if (entityState && !attribute && state.entity_id.startsWith('timer.')) {
    return html`<simple-thermostat-timer-remaining
      .stateObj=${state}
      .hass=${hass}
    ></simple-thermostat-timer-remaining>`
  }

  if (raw === null || typeof raw === 'undefined')
    return config?.fallback ?? 'N/A'
  if (typeof raw === 'object') return JSON.stringify(raw)

  let value = raw
  if (typeof decimals === 'number') {
    value = formatNumber(raw, {
      decimals,
      locale: hass.locale,
      fallback: config?.fallback,
    })
  } else if (entityState) {
    const domain = state.entity_id.split('.')[0]
    value = attribute
      ? typeof hass.formatEntityAttributeValue === 'function'
        ? hass.formatEntityAttributeValue(state, attribute)
        : raw
      : typeof hass.formatEntityState === 'function'
        ? hass.formatEntityState(state)
        : localize
          ? localize(
              String(raw),
              `component.${domain}.state.${state.attributes?.device_class ?? '_'}.`
            )
          : raw
  }
  const stateUnit =
    entityState && !attribute ? state.attributes?.unit_of_measurement : ''
  const humidityUnit =
    entityState &&
    !attribute &&
    (state.attributes?.device_class === 'humidity' ||
      state.entity_id.includes('humidity') ||
      details.icon === 'mdi:water-percent')
      ? '%'
      : ''
  return appendUnit(value, unit || stateUnit || humidityUnit || false, value)
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
  const stateIsEntity = isEntityState(state)
  const entityId = stateIsEntity ? state.entity_id : entity
  const canOpenEntity = entityId && typeof openEntityPopover === 'function'
  const entityTooltip =
    configuredTooltip ||
    (stateIsEntity
      ? state?.attributes?.friendly_name || state?.entity_id
      : entity
        ? hass.states?.[entity]?.attributes?.friendly_name || entity
        : undefined)
  let entityDomain = ''
  let entityState = ''
  let isToggleEntity = false
  let usesCompactEntityDisplay = false

  let valueCell
  const displayValue = renderInfoValue(state, details, hass, localize)
  if (stateIsEntity) {
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
      const supportsAction = isToggleEntity || BUTTON_DOMAINS.includes(domain)
      const active = state.state === 'on'
      const actionLabel =
        renderedHeading !== undefined
          ? renderTemplateContent(renderedHeading, hass)
          : typeof heading === 'string'
            ? heading
            : state.attributes?.friendly_name || state.entity_id
      const fallbackIcon =
        renderedIcon ||
        state.attributes?.icon ||
        (isToggleEntity
          ? 'mdi:toggle-switch'
          : BUTTON_DOMAINS.includes(domain)
            ? 'mdi:gesture-tap-button'
            : undefined)

      valueCell = html`
        <button
          class="entity-action ${entityClasses} ${active ? 'active' : ''}"
          type="button"
          ?disabled=${supportsAction && !isEntityAvailable(state)}
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
          ${
            displayMode === 'chip' || displayMode === 'toggle'
              ? html`<span class="entity-action__state">${displayValue}</span>`
              : ''
          }
        </button>
      `
    } else if (
      domain === 'timer' ||
      !isToggleEntity ||
      attribute ||
      template ||
      type === 'relativetime'
    ) {
      valueCell = html`
        <div
          class="entity-value ${canOpenEntity ? 'clickable' : ''}"
          title=${entityTooltip}
          @click="${
            canOpenEntity ? () => openEntityPopover(state.entity_id) : null
          }"
        >
          ${displayValue}
        </div>
      `
    } else if (isToggleEntity) {
      valueCell = html`
        <div class="entity-value ${entityClasses}">
          <ha-switch
            .checked=${state.state === 'on'}
            .disabled=${!isEntityAvailable(state)}
            @change=${(ev: Event) =>
              toggleEntity(
                hass,
                state.entity_id,
                (ev.target as HTMLInputElement).checked
              )}
          ></ha-switch>
        </div>
      `
    }
  } else {
    valueCell = html`<div
      class="entity-value ${canOpenEntity ? 'clickable' : ''}"
      title=${entityTooltip || nothing}
      @click=${canOpenEntity ? () => openEntityPopover(entityId) : null}
    >
      ${displayValue}
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
      ? renderTemplateContent(renderedHeading, hass)
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
