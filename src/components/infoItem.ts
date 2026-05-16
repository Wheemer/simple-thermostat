import { html } from 'lit'
import formatNumber from '../formatNumber'
import { LooseObject } from '../types'

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
  type?: string
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
  hass.callService('homeassistant', checked ? 'turn_on' : 'turn_off', {
    entity_id: entityId,
  })
}

// Preset mode can be  one of: none, eco, away, boost, comfort, home, sleep, activity
// See https://github.com/home-assistant/home-assistant/blob/dev/homeassistant/components/climate/const.py#L36-L57

export default function renderInfoItem({
  hide = false,
  hass,
  state,
  details,
  localize,
  openEntityPopover,
}: InfoItemOptions) {
  if (hide || typeof state === 'undefined') return

  const { type, heading, icon, unit, decimals } = details

  let valueCell
  if (process.env.DEBUG) {
    console.log('ST: infoItem', { state, details })
  }
  if (type === 'relativetime') {
    valueCell = html`
      <div class="entity-value">
        <ha-relative-time .datetime=${state} .hass=${hass}></ha-relative-time>
      </div>
    `
  } else if (typeof state === 'object') {
    const [domain] = state.entity_id.split('.')
    if (TOGGLE_DOMAINS.includes(domain)) {
      valueCell = html`
        <div class="entity-value">
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
      const hasConfiguredUnit = typeof unit === 'string' && unit.length > 0
      const formattedWithHass =
        typeof hass.formatEntityState === 'function' &&
        typeof decimals !== 'number' &&
        !hasConfiguredUnit

      valueCell = html`
        <div
          class="entity-value clickable"
          @click="${() => openEntityPopover(state.entity_id)}"
        >
          ${value}${formattedWithHass
            ? ''
            : `${hasConfiguredUnit ? '' : ' '}${unit || state.attributes.unit_of_measurement}`}
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
    valueCell = html` <div class="entity-value">${value}${unit}</div> `
  }

  if (heading === false) {
    return valueCell
  }

  const tooltip = heading || state?.attributes?.friendly_name || state?.entity_id

  const entityId = typeof state === 'object' ? state.entity_id : null

  const headingResult = icon
    ? html` <ha-icon
        icon="${icon}"
        title=${tooltip}
        @click=${entityId ? () => openEntityPopover(entityId) : null}
      ></ha-icon> `
    : ` ${heading}: `

  return html`<div
      class="entity-heading ${entityId ? 'clickable' : ''}"
      title=${tooltip}
      @click=${entityId ? () => openEntityPopover(entityId) : null}
    >${headingResult}</div>
    ${valueCell}
  `
}
