import { html, nothing } from 'lit'
import { HeaderData } from '../config/header'
import { getEntityAction } from '../entityAction'
import { getToggleKind, getToggleKindClass } from '../toggleKind'

type HeaderOptions = {
  header: false | HeaderData
  entity: any
  hass?
  openEntityPopover
  toggleEntityChanged
}

export default function renderHeader({
  header,
  toggleEntityChanged,
  entity,
  hass,
  openEntityPopover,
}: HeaderOptions) {
  if (header === false) {
    return nothing
  }

  const action = getEntityAction(entity) || entity.state
  let icon = header.icon
  if (typeof header.icon === 'object') {
    icon = icon?.[action] ?? false
  }
  const slashOffIcon = Boolean(header.slashOffIcon)

  const name = header?.name ?? false

  return html`
    <header>
      <div class="header__main clickable" @click=${() => openEntityPopover()}>
        ${renderIcon(icon, entity.state, action, slashOffIcon)}
        ${renderName(name)}
      </div>
      ${renderFaults(header.faults, openEntityPopover)}
      ${renderToggles(
        header.toggles,
        openEntityPopover,
        toggleEntityChanged,
        hass,
        entity
      )}
    </header>
  `
}

function renderIcon(icon, state, action, slashOffIcon = false) {
  const actionClass = action && action !== state ? ` ${action}` : ''

  return icon
    ? html`
        <span
          class="header__icon-wrap ${state}${actionClass} ${slashOffIcon
            ? 'slash-off'
            : ''}"
        >
          <ha-icon
            class="header__icon ${state}${actionClass}"
            .icon=${icon}
          ></ha-icon>
        </span>
      `
    : nothing
}

function renderName(name) {
  return name ? html`<h2 class="header__title">${name}</h2>` : nothing
}

function renderFaults(faults, openEntityPopover) {
  if (!faults?.length) {
    return nothing
  }
  const faultHtml = faults.map(({ icon, hide_inactive, state }) => {
    if (!state) return nothing

    return html` <ha-icon
      class="fault-icon ${state.state === 'on'
        ? 'active'
        : hide_inactive
          ? ' hide'
          : ''}"
      .icon=${icon || state.attributes?.icon}
      @click="${() => openEntityPopover(state.entity_id)}"
    ></ha-icon>`
  })

  return html` <div class="faults">${faultHtml}</div>`
}

function renderToggles(
  toggles,
  openEntityPopover,
  toggleEntityChanged,
  hass,
  mainEntity
) {
  if (!toggles?.length) return nothing

  return html`
    <div class="header__toggles">
      ${toggles.map((toggle) => {
        if (toggle.hide_when_off === true && mainEntity?.state === 'off') {
          return nothing
        }

        const entityId = toggle.entity?.entity_id
        const toggleState = toggle.entity?.state
        const toggleDomain =
          typeof entityId === 'string' ? entityId.split('.')[0] : ''
        const styleIcon =
          typeof toggle.icon === 'string'
            ? toggle.icon
            : toggle.entity?.attributes?.icon
        const toggleKind = getToggleKind({
          icon: styleIcon,
          label: toggle.label,
          entity: toggle.entity,
          hass,
        })
        const toggleKindClass = getToggleKindClass(toggleKind)
        return html`
          <div
            class="header__toggle ${toggleState || ''} ${toggleDomain
              ? `domain-${toggleDomain}`
              : ''} ${toggleKindClass}"
          >
            <span
              class="clickable toggle-label ${toggleState || ''} ${toggleDomain
                ? `domain-${toggleDomain}`
                : ''} ${toggleKindClass}"
              title=${toggle.label || toggle.entity?.attributes?.friendly_name}
              @click=${() => openEntityPopover(entityId)}
              >${toggle.icon !== false
                ? html`<ha-icon .icon=${toggle.icon}></ha-icon>`
                : toggle.label}
            </span>
            <ha-switch
              .checked=${toggle.entity?.state === 'on'}
              @change=${(ev: Event) => toggleEntityChanged(ev, entityId)}
            ></ha-switch>
          </div>
        `
      })}
    </div>
  `
}
