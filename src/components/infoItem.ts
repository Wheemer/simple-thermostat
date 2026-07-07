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
  } = details
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
    const entityClasses = [
      isToggleEntity && 'toggle-entity',
      entityDomain && `domain-${safeClass(entityDomain)}`,
      entityState && `state-${safeClass(entityState)}`,
      isToggleEntity &&
        getToggleKindClass(
          getToggleKind({
            icon: icon || state.attributes?.icon,
            label: heading || state.attributes?.friendly_name,
            entity: state,
            hass,
          })
        ),
    ]
      .filter(Boolean)
      .join(' ')

    if (domain === 'timer') {
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
          icon: icon || state?.attributes?.icon,
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

  const headingResult = icon
    ? html`
        <ha-icon
          icon="${icon}"
          title=${tooltip}
          @click=${canOpenEntity ? () => openEntityPopover(entityId) : null}
        ></ha-icon>
      `
    : ` ${heading}: `

  return html`<div
      class=${headingClasses}
      title=${icon ? tooltip : nothing}
      @click=${canOpenEntity ? () => openEntityPopover(entityId) : null}
    >
      ${headingResult}
    </div>
    ${valueCell} `
}
