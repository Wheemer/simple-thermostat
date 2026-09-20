import { html, nothing } from 'lit'
import { isEntityAvailable } from '../entityAvailability'
import { ControlMode, HVAC_MODES } from '../types'
import { EntityAdapter } from '../adapters'
import { getModeLabelPresentation } from '../modeLabelLayout'
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
  const helperEntity = options.entity
    ? hass?.states?.[options.entity]
    : undefined
  const disabled = !isEntityAvailable(options.entity ? helperEntity : entity)
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

  const resolveModeName = (
    name: string | false,
    value: string,
    nameConfigured?: boolean
  ) => {
    if (
      (name !== false && nameConfigured === true) ||
      (name !== false && nameConfigured === undefined && name !== value)
    )
      return name
    if (helperEntity && typeof hass?.formatEntityState === 'function') {
      return hass.formatEntityState({ ...helperEntity, state: value })
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
    const translated = localizePrefix ? localize(value, localizePrefix) : value
    return translated && translated !== value
      ? translated
      : name === false
        ? value
        : name
  }
  const maybeRenderName = (
    name: string | false,
    value: string,
    nameConfigured?: boolean
  ) => {
    if (name === false || modeOptions?.names === false) return null
    return resolveModeName(name, value, nameConfigured)
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

  const localizeWithFallback = (keys: string | string[], fallback: string) => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const translated = localize(key)
      if (translated && translated !== key) return translated
    }
    return fallback
  }

  let defaultTitle: string | false
  if (type === 'vane_horizontal') {
    defaultTitle = 'Vane Horizontal'
  } else if (type === 'vane_vertical') {
    defaultTitle = 'Vane Vertical'
  } else if (type === 'swing_horizontal') {
    defaultTitle = localizeWithFallback(
      'ui.panel.lovelace.editor.features.types.climate-swing-horizontal-modes.swing_horizontal_modes',
      'Swing Horizontal'
    )
  } else if (type === 'swing_vertical') {
    defaultTitle = 'Swing Vertical'
  } else if (type === 'direction') {
    defaultTitle = localizeWithFallback('ui.card.fan.direction', 'Direction')
  } else if (type === 'oscillating') {
    defaultTitle = localizeWithFallback('ui.card.fan.oscillate', 'Oscillating')
  } else if (type === 'mode') {
    defaultTitle = localizeWithFallback(
      `ui.card.${adapter.getLocalizationDomain()}.mode`,
      'Mode'
    )
  } else if (type === 'preset') {
    defaultTitle =
      heading === true
        ? localizeWithFallback(
            adapter.getLocalizationDomain() === 'fan'
              ? 'ui.card.fan.preset_mode'
              : 'ui.card.climate.preset',
            'Preset'
          )
        : false
  } else if (type === 'state') {
    defaultTitle =
      heading === true
        ? localizeWithFallback(
            `ui.card.${adapter.getLocalizationDomain()}.state`,
            'State'
          )
        : false
  } else if (type === 'fan') {
    defaultTitle = localizeWithFallback(
      'ui.panel.lovelace.editor.features.types.climate-fan-modes.fan_modes',
      'Mode'
    )
  } else if (type === 'swing') {
    defaultTitle = localizeWithFallback(
      'ui.panel.lovelace.editor.features.types.climate-swing-modes.swing_modes',
      'Mode'
    )
  } else {
    defaultTitle = localizeWithFallback(
      `ui.card.${adapter.getLocalizationDomain()}.mode`,
      type === 'hvac' ? 'Operation' : 'Mode'
    )
  }
  const title = name === false ? false : name || defaultTitle
  const getControlTooltip = () => {
    if (
      type === 'fan' ||
      (type === 'preset' && adapter.getLocalizationDomain() === 'fan')
    ) {
      return localizeWithFallback(
        'ui.panel.lovelace.editor.features.types.climate-fan-modes.fan_modes',
        'Fan speed'
      )
    }
    if (type === 'swing') {
      return localizeWithFallback(
        'ui.panel.lovelace.editor.features.types.climate-swing-modes.swing_modes',
        'Swing mode'
      )
    }
    if (type === 'swing_horizontal') {
      return localizeWithFallback(
        'ui.panel.lovelace.editor.features.types.climate-swing-horizontal-modes.swing_horizontal_modes',
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
    return typeof defaultTitle === 'string' ? defaultTitle : ''
  }
  const controlTooltip = getControlTooltip()
  const groupAriaLabel = title || controlTooltip || type
  const headings = modeOptions?.headings === true || heading === true
  const showHeading = headings && title !== false
  const isFanPreset =
    type === 'preset' && adapter.getLocalizationDomain() === 'fan'
  const sparseMainControls =
    (type === 'hvac' || type === 'state' || type === 'fan') && list.length <= 4
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

  const renderModeLabel = (
    modeValue: string,
    label: string | null | undefined
  ) => {
    if (!label) return null
    const presentation = getModeLabelPresentation(
      modeValue,
      label,
      sparseMainControls
    )

    if (presentation.layout === 'stacked') {
      return html`<span class="mode-label">
        ${presentation.lines.map(
          (line) => html`<span class="mode-label-line">${line}</span>`
        )}
      </span>`
    }

    return html`<span class="mode-label"
      >${presentation.lines[0] ?? label}</span
    >`
  }

  return html`
    <div
      class="modes ${type} ${isFanPreset ? 'fan-preset' : ''} ${
        showHeading ? 'heading' : ''
      } ${compact ? 'compact' : ''} ${
        dense ? 'dense' : ''
      } ${sparseMainControls ? 'sparse' : ''}"
      role="group"
      aria-label=${groupAriaLabel}
    >
      ${showHeading ? html` <div class="mode-title">${title}</div> ` : ''}
      ${list.map(
        ({
          value,
          icon,
          iconConfigured,
          name,
          nameConfigured,
          hide_when_off,
        }) => {
          if (hide_when_off === true && state === HVAC_MODES.OFF) return nothing

          const modeClass = safeClass(value)
          const displayName = maybeRenderName(name, value, nameConfigured)
          const accessibleName = resolveModeName(name, value, nameConfigured)
          const labelPresentation = getModeLabelPresentation(
            String(value),
            displayName,
            sparseMainControls
          )
          const labelLayoutClass =
            labelPresentation.layout === 'stacked'
              ? 'label-stacked'
              : labelPresentation.layout === 'column'
                ? 'label-column'
                : ''
          const tooltip = displayName ? nothing : controlTooltip || nothing
          return html`
            <div
              class="mode-item ${modeClass} ${labelLayoutClass} ${value === mode ? 'active' : ''}"
              role="button"
              tabindex=${disabled ? -1 : 0}
              aria-disabled=${String(disabled)}
              aria-pressed=${value === mode ? 'true' : 'false'}
              aria-label=${accessibleName || value}
              title=${tooltip}
              @click=${() => {
                if (!disabled) setMode(type, value)
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!disabled) setMode(type, value)
                }
              }}
            >
              ${maybeRenderIcon(icon, iconConfigured)}
              ${renderModeLabel(String(value), displayName)}
            </div>
          `
        }
      )}
    </div>
  `
}
