import { html } from 'lit'
import { ControlMode, HVAC_MODES } from '../types'

interface ModeTypeOptions {
  state: string
  entity?: any
  hass?: any
  mode: ControlMode
  modeOptions
  localize
  setMode
}

export default function renderModeType({
  state,
  entity,
  hass,
  mode: options,
  modeOptions,
  localize,
  setMode,
}: ModeTypeOptions) {
  const { type, hide_when_off, mode = 'none', list, name, icons } = options
  if (list.length === 0 || (hide_when_off && state === HVAC_MODES.OFF)) {
    return null
  }

  let localizePrefix = `state_attributes.climate.${type}_mode.`
  if (type === 'hvac') {
    localizePrefix = `component.climate.state._.`
  } else if (type === 'vane_horizontal' || type === 'vane_vertical') {
    localizePrefix = ''
  } else if (type === 'swing_horizontal' || type === 'swing_vertical') {
    localizePrefix = `state_attributes.climate.${type}_mode.`
  }

  const modeAttribute =
    type === 'hvac'
      ? null
      : type === 'vane_horizontal' || type === 'vane_vertical'
        ? type
        : `${type}_mode`

  const maybeRenderName = (name: string | false, value: string) => {
    if (name === false) return null
    if (modeOptions?.names === false) return null

    if (name !== value) {
      return localizePrefix ? localize(name, localizePrefix) : name
    }

    if (type === 'hvac' && typeof hass?.formatEntityState === 'function') {
      return hass.formatEntityState({ ...entity, state: value })
    }

    if (
      modeAttribute &&
      entity &&
      typeof hass?.formatEntityAttributeValue === 'function'
    ) {
      return hass.formatEntityAttributeValue(entity, modeAttribute, value)
    }

    return localizePrefix ? localize(name, localizePrefix) : name
  }
  const maybeRenderIcon = (icon: string) => {
    if (!icon) return null
    if (modeOptions?.icons === false || icons === false) return null
    return html` <ha-icon class="mode-icon" .icon=${icon}></ha-icon> `
  }

  const str = type == 'hvac' ? 'operation' : `${type}_mode`
  let defaultTitle: string
  if (type === 'vane_horizontal') {
    defaultTitle = 'Vane Horizontal'
  } else if (type === 'vane_vertical') {
    defaultTitle = 'Vane Vertical'
  } else if (type === 'swing_horizontal') {
    defaultTitle = localize('ui.card.climate.swing_horizontal_mode') || 'Swing Horizontal'
  } else if (type === 'swing_vertical') {
    defaultTitle = localize('ui.card.climate.swing_vertical_mode') || 'Swing Vertical'
  } else {
    defaultTitle = localize(`ui.card.climate.${str}`)
  }
  const title = name || defaultTitle
  const headings = modeOptions?.headings ?? true

  return html`
    <div class="modes ${headings ? 'heading' : ''}">
      ${headings ? html` <div class="mode-title">${title}</div> ` : ''}
      ${list.map(
        ({ value, icon, name }) => html`
          <div
            class="mode-item ${value === mode ? 'active ' + mode : ''}"
            @click=${() => setMode(type, value)}
          >
            ${maybeRenderIcon(icon)} ${maybeRenderName(name, value)}
          </div>
        `
      )}
    </div>
  `
}
