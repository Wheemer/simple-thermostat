import formatNumber from '../formatNumber'
import renderInfoItem from './infoItem'
import { wrapEntities } from './entityGroup'
import { appendUnit } from '../unitFormat'
import { getEntityStateText } from '../entityAction'
import { HVAC_MODES } from '../types'

export default function renderEntities({
  _hide,
  entity,
  unit,
  hass,
  entities,
  config,
  localize,
  openEntityPopover,
  adapter,
}) {
  const currentValueEntityId = config.current_value_entity
  const currentValueEntity = currentValueEntityId
    ? hass.states[currentValueEntityId]
    : entity
  const current = currentValueEntityId
    ? currentValueEntity?.state
    : adapter.getCurrentValue(entity.attributes)
  const currentUnit = currentValueEntityId
    ? (currentValueEntity?.attributes?.unit_of_measurement ?? unit)
    : (adapter.getCurrentValueUnit?.(entity.attributes, hass.config) ?? unit)

  const showLabels = config?.layout?.entities?.labels ?? true
  const showSeparator = config?.layout?.entities?.separator !== false
  const stateString = getEntityStateText(entity, hass, localize)
  const entityHtml = [
    renderInfoItem({
      hide:
        _hide.temperature || current === null || typeof current === 'undefined',
      state: appendUnit(
        formatNumber(current, {
          ...config,
          locale: hass.locale,
        }),
        currentUnit
      ),
      hass,
      openEntityPopover,
      details: {
        heading: showLabels
          ? (config?.label?.temperature ??
            localize('ui.card.climate.currently'))
          : false,
        tooltip:
          currentValueEntity?.attributes?.friendly_name ?? currentValueEntityId,
        entity: currentValueEntityId ?? config.entity,
        separator: showSeparator,
      },
    }),
    renderInfoItem({
      hide: _hide.state,
      state: stateString,
      hass,
      openEntityPopover,
      details: {
        heading: showLabels
          ? (config?.label?.state ??
            localize('ui.panel.lovelace.editor.card.generic.state'))
          : false,
        entity: config.entity,
        separator: showSeparator,
      },
    }),
    ...((entities ?? []).map(
      ({ name, state, show, _hide_when_off, hide_when_off, ...rest }) => {
        const hideWhenOff = _hide_when_off === true || hide_when_off === true

        return renderInfoItem({
          hide:
            show === false || (hideWhenOff && entity.state === HVAC_MODES.OFF),
          state,
          hass,
          localize,
          openEntityPopover,
          details: {
            ...rest,
            heading: showLabels && name,
            tooltip: name,
            config,
            variables: config.variables,
            separator: showSeparator,
          },
        })
      }
    ) || null),
  ].filter((it) => it !== null)

  return wrapEntities(config, entityHtml)
}
