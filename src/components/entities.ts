import formatNumber from '../formatNumber'
import renderInfoItem from './infoItem'
import { wrapEntities } from './entityGroup'
import { appendUnit } from '../unitFormat'
import { getEntityStateText } from '../entityAction'

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

  const showLabels = config?.layout?.entities?.labels ?? true
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
        unit
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
      },
    }),
    ...(entities.map(({ name, state, show, ...rest }) => {
      return renderInfoItem({
        hide: show === false,
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
        },
      })
    }) || null),
  ].filter((it) => it !== null)

  return wrapEntities(config, entityHtml)
}
