import { html, nothing } from 'lit'
import { ControlMode, HVAC_MODES } from '../types'
import { EntityAdapter } from '../adapters'
import { renderModeIcon } from './modeIcon'

interface ModeTypeOptions {
  state: string
  entity
  hass
  mode: ControlMode
  adapter: EntityAdapter
  modeOptions
  localize
  setMode
}

export default function renderModeType({
  state,
  entity,
  hass,
  mode: options,
  adapter,
  modeOptions,
  localize,
  setMode,
}: ModeTypeOptions) {
  const {
    type,
    hide_when_off,
    mode = 'none',
    list,
    name,
    heading,
    icons,
  } = options
  if (list.length === 0 || (hide_when_off && state === HVAC_MODES.OFF)) {
    return null
  }

  const modeAttribute = type === 'hvac' ? null : adapter.getModePayloadKey(type)
  let localizePrefix = modeAttribute
    ? `state_attributes.${adapter.getLocalizationDomain()}.${modeAttribute}.`
    : ''
  if (type === 'hvac') {
    localizePrefix = `component.climate.state._.`
  } else if (type === 'vane_horizontal' || type === 'vane_vertical') {
    localizePrefix = ''
  } else if (
    type === 'direction' ||
    type === 'oscillating' ||
    type === 'mode'
  ) {
    localizePrefix = ''
  }

  const maybeRenderName = (name: string | false, value: string) => {
    if (name === false) return null
    if (modeOptions?.names === false) return null
    if (name !== value) {
      return localizePrefix ? localize(name, localizePrefix) : name
    }
    if (
      (type === 'hvac' || type === 'state') &&
      typeof hass?.formatEntityState === 'function'
    ) {
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
  const maybeRenderIcon = (
    icon: string | false | undefined,
    iconConfigured = false
  ) => {
    if (!icon) return null
    if (modeOptions?.icons === false || icons === false) return null
    if (
      [
        'swing',
        'swing_horizontal',
        'swing_vertical',
        'vane_horizontal',
        'vane_vertical',
      ].includes(type) &&
      icons !== true &&
      !iconConfigured
    ) {
      return null
    }
    return renderModeIcon(icon)
  }

  const localizeWithFallback = (key: string, fallback: string) => {
    const translated = localize(key)
    return translated && translated !== key ? translated : fallback
  }

  const str = type == 'hvac' ? 'operation' : `${type}_mode`
  let defaultTitle: string | false
  if (type === 'vane_horizontal') {
    defaultTitle = 'Vane Horizontal'
  } else if (type === 'vane_vertical') {
    defaultTitle = 'Vane Vertical'
  } else if (type === 'swing_horizontal') {
    defaultTitle = localizeWithFallback(
      'ui.card.climate.swing_horizontal_mode',
      'Swing Horizontal'
    )
  } else if (type === 'swing_vertical') {
    defaultTitle = localizeWithFallback(
      'ui.card.climate.swing_vertical_mode',
      'Swing Vertical'
    )
  } else if (type === 'direction') {
    defaultTitle = 'Direction'
  } else if (type === 'oscillating') {
    defaultTitle = 'Oscillating'
  } else if (type === 'mode') {
    defaultTitle = 'Mode'
  } else if (type === 'preset') {
    defaultTitle =
      heading === true
        ? localizeWithFallback(
            `ui.card.${adapter.getLocalizationDomain()}.${str}`,
            'Preset'
          )
        : false
  } else if (type === 'state') {
    defaultTitle = heading === true ? 'State' : false
  } else {
    defaultTitle = localizeWithFallback(
      `ui.card.${adapter.getLocalizationDomain()}.${str}`,
      type === 'hvac' ? 'Operation' : 'Mode'
    )
  }
  const title = name === false ? false : name || defaultTitle
  const getControlTooltip = () => {
    if (
      type === 'fan' ||
      (type === 'preset' && adapter.getLocalizationDomain() === 'fan')
    ) {
      return 'Fan speed'
    }
    if (type === 'swing') return 'Swing mode'
    if (type === 'swing_horizontal') {
      return localizeWithFallback(
        'ui.card.climate.swing_horizontal_mode',
        'Horizontal swing'
      )
    }
    if (type === 'swing_vertical') {
      return localizeWithFallback(
        'ui.card.climate.swing_vertical_mode',
        'Vertical swing'
      )
    }
    if (type === 'vane_horizontal') return 'Horizontal vane'
    if (type === 'vane_vertical') return 'Vertical vane'
    return ''
  }
  const controlTooltip = getControlTooltip()
  const headings = modeOptions?.headings === true || heading === true
  const showHeading = headings && title !== false
  const isFanPreset =
    type === 'preset' && adapter.getLocalizationDomain() === 'fan'
  const sparseMainControls =
    (type === 'hvac' || type === 'state' || type === 'fan') &&
    list.length <= 4
  const compact =
    (type === 'preset' && list.length <= 4) ||
    [
      'swing',
      'swing_horizontal',
      'swing_vertical',
      'vane_horizontal',
      'vane_vertical',
    ].includes(type)
  const dense =
    list.length > 4 ||
    (type === 'hvac' && list.length > 4) ||
    (type === 'fan' && list.length > 4)
  const safeClass = (value: unknown) =>
    String(value).replace(/[^a-z0-9_-]/gi, '')

  return html`
    <div
      class="modes ${type} ${isFanPreset ? 'fan-preset' : ''} ${showHeading
        ? 'heading'
        : ''} ${compact ? 'compact' : ''} ${dense
        ? 'dense'
        : ''} ${sparseMainControls ? 'sparse' : ''}"
      role="group"
      aria-label=${title || type}
    >
      ${showHeading ? html` <div class="mode-title">${title}</div> ` : ''}
      ${list.map(({ value, icon, iconConfigured, name, hide_when_off }) => {
        if (hide_when_off === true && state === HVAC_MODES.OFF) return nothing

        const modeClass = safeClass(value)
        const displayName = maybeRenderName(name, value)
        const tooltip = displayName ? nothing : controlTooltip || nothing
        return html`
          <div
            class="mode-item ${modeClass} ${value === mode ? 'active' : ''}"
            role="button"
            tabindex="0"
            aria-pressed=${value === mode ? 'true' : 'false'}
            aria-label=${name || value}
            title=${tooltip}
            @click=${() => setMode(type, value)}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setMode(type, value)
              }
            }}
          >
            ${maybeRenderIcon(icon, iconConfigured)}
            ${displayName
              ? html`<span class="mode-label">${displayName}</span>`
              : null}
          </div>
        `
      })}
    </div>
  `
}
