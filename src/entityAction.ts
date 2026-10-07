import { isEntityAvailable } from './entityAvailability'
import type { HASS, LooseObject } from './types'

export const TOGGLE_DOMAINS = [
  'automation',
  'fan',
  'humidifier',
  'input_boolean',
  'light',
  'switch',
]
export const BUTTON_DOMAINS = ['button', 'input_button', 'script', 'scene']

export function callEntityAction(
  hass: HASS,
  entityId: string,
  checked?: boolean
) {
  const state = hass.states?.[entityId]
  if (!isEntityAvailable(state)) return

  const [domain] = entityId.split('.')
  const isToggle = TOGGLE_DOMAINS.includes(domain)
  const service = isToggle
    ? `turn_${checked ?? (state.state !== 'on') ? 'on' : 'off'}`
    : domain === 'button' || domain === 'input_button'
      ? 'press'
      : 'turn_on'
  const actionDomain = isToggle ? 'homeassistant' : domain

  if (typeof hass.performAction === 'function') {
    hass.performAction({
      action: `${actionDomain}.${service}`,
      data: { entity_id: entityId },
    })
  } else {
    hass.callService?.(actionDomain, service, { entity_id: entityId })
  }
}

type EntityStateLike = LooseObject & {
  entity_id?: string
  state?: string | number
  attributes?: LooseObject
}

export function getEntityActionAttribute(
  entity: EntityStateLike
): string | undefined {
  if (typeof entity.entity_id !== 'string') return undefined

  const [domain] = entity.entity_id.split('.')

  if (domain === 'climate') return 'hvac_action'
  if (domain === 'humidifier') return 'action'

  return undefined
}

export function getEntityAction(entity: EntityStateLike): string | undefined {
  const attribute = getEntityActionAttribute(entity)
  const action = attribute ? entity.attributes?.[attribute] : undefined

  return typeof action === 'string' && action ? action : undefined
}

export function getEntityActionLocalizationPrefix(
  entity: EntityStateLike
): string {
  if (typeof entity.entity_id !== 'string') return ''

  const [domain] = entity.entity_id.split('.')
  const attribute = getEntityActionAttribute(entity)

  if (domain && attribute) return `state_attributes.${domain}.${attribute}.`

  return ''
}

export function getEntityStateText(
  entity: EntityStateLike,
  hass,
  localize
): string {
  if (typeof entity.entity_id !== 'string') {
    return typeof entity.state === 'undefined' ? '' : String(entity.state)
  }

  const [domain] = entity.entity_id.split('.')
  const action = getEntityAction(entity)
  const actionAttribute = getEntityActionAttribute(entity)

  if (action) {
    return typeof hass.formatEntityAttributeValue === 'function' &&
      actionAttribute
      ? hass.formatEntityAttributeValue(entity, actionAttribute)
      : localize(action, getEntityActionLocalizationPrefix(entity))
  }

  if (domain === 'fan' && entity.state === 'on') {
    if (entity.attributes?.preset_mode) {
      return typeof hass.formatEntityAttributeValue === 'function'
        ? hass.formatEntityAttributeValue(entity, 'preset_mode')
        : localize(
            entity.attributes.preset_mode,
            'state_attributes.fan.preset_mode.'
          )
    }

    if (typeof entity.attributes?.percentage === 'number') {
      return typeof hass.formatEntityAttributeValue === 'function'
        ? hass.formatEntityAttributeValue(entity, 'percentage')
        : `${entity.attributes.percentage}%`
    }

    if (entity.attributes?.speed) {
      return String(entity.attributes.speed)
    }
  }

  return typeof hass.formatEntityState === 'function'
    ? hass.formatEntityState(entity)
    : localize(String(entity.state), `component.${domain}.state._.`)
}
