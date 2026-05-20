import { html } from 'lit'
import formatNumber from '../formatNumber'
import renderInfoItem from './infoItem'
import { wrapEntities } from './templated'

export default function renderEntities({
  _hide,
  entity,
  unit,
  hass,
  entities,
  config,
  localize,
  openEntityPopover,
}) {
  const {
    state,
    attributes: { hvac_action: action, current_temperature: current_entity_temp },
  } = entity

  const current = config.current_temperature_entity
    ? hass.states[config.current_temperature_entity]?.state
    : current_entity_temp

  const showLabels =
    (config?.layout?.entities ?? config?.layout?.sensors)?.labels ?? true
  let stateString =
    typeof hass.formatEntityState === 'function'
      ? hass.formatEntityState(entity)
      : localize(state, 'component.climate.state._.')

  if (action) {
    const actionString =
      typeof hass.formatEntityAttributeValue === 'function'
        ? hass.formatEntityAttributeValue(entity, 'hvac_action')
        : localize(action, 'state_attributes.climate.hvac_action.')

    stateString = [actionString, ` (${stateString})`].join('')
  }
  const entityHtml = [
    renderInfoItem({
      hide: _hide.temperature,
      state: `${formatNumber(current, {
        ...config,
        locale: hass.locale,
      })}${unit || ''}`,
      hass,
      details: {
        heading: showLabels
          ? config?.label?.temperature ?? localize('ui.card.climate.currently')
          : false,
      },
    }),
    renderInfoItem({
      hide: _hide.state,
      state: stateString,
      hass,
      details: {
        heading: showLabels
          ? config?.label?.state ??
            localize('ui.panel.lovelace.editor.card.generic.state')
          : false,
      },
    }),
    ...(entities.map(({ name, state, ...rest }) => {
      return renderInfoItem({
        state,
        hass,
        localize,
        openEntityPopover,
        details: {
          ...rest,
          heading: showLabels && name,
        },
      })
    }) || null),
  ].filter((it) => it !== null)

  return wrapEntities(config, entityHtml)
}
