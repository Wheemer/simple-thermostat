import { HASS, LooseObject } from '../types'
import { getEntityAction } from '../entityAction'

export interface HAState {
  state: string | number
  entity_id: string
  attributes: LooseObject
  last_changed?: string
  last_updated?: string
}

export interface Fault {
  entity: string
  icon?: string
  hide_inactive?: boolean
}

export const STATE_ICONS = {
  auto: 'mdi:radiator',
  cooling: 'mdi:snowflake',
  fan: 'mdi:fan',
  heating: 'mdi:radiator',
  idle: 'mdi:radiator-disabled',
  on: 'mdi:power',
  off: 'mdi:radiator-off',
}

export const CLIMATE_COOLING_STATE_ICONS = {
  auto: 'mdi:air-conditioner',
  cooling: 'mdi:snowflake',
  fan: 'mdi:fan',
  heating: 'mdi:radiator',
  idle: 'mdi:air-conditioner',
  on: 'mdi:air-conditioner',
  off: 'mdi:air-conditioner',
}

export const CLIMATE_HEATING_STATE_ICONS = {
  ...STATE_ICONS,
  auto: 'mdi:radiator',
  idle: STATE_ICONS.idle,
  off: 'mdi:radiator',
}

export const DOMAIN_STATE_ICONS = {
  fan: {
    on: 'mdi:fan',
    off: 'mdi:fan-off',
  },
  humidifier: {
    on: 'mdi:air-humidifier',
    off: 'mdi:air-humidifier-off',
  },
}

export const MODE_ICONS = {
  auto: 'hass:autorenew',
  cool: 'hass:snowflake',
  dry: 'hass:water-percent',
  fan_only: 'hass:fan',
  heat_cool: 'hass:autorenew',
  heat: 'hass:fire',
  on: 'hass:power',
  off: 'hass:power',
  forward: 'mdi:arrow-right',
  reverse: 'mdi:arrow-left',
  true: 'mdi:fan',
  false: 'mdi:fan-off',
  low: 'mdi:fan-speed-1',
  mid: 'mdi:fan-speed-2',
  medium: 'mdi:fan-speed-2',
  high: 'mdi:fan-speed-3',
  max: 'st:fan-speed-4',
  turbo: 'st:fan-speed-5',
  '1': 'mdi:fan-speed-1',
  '2': 'mdi:fan-speed-2',
  '3': 'mdi:fan-speed-3',
  '4': 'st:fan-speed-4',
  '5': 'st:fan-speed-5',
  automatic: 'mdi:fan-auto',
  powerful: 'mdi:fan-plus',
  quiet: 'mdi:fan-minus',
  silent: 'mdi:fan-minus',
  normal: 'mdi:water-percent',
  vertical: 'mdi:arrow-up-down',
  top: 'mdi:arrow-up',
  'top-middle': 'mdi:arrow-top-right',
  middle: 'mdi:arrow-collapse-vertical',
  'middle-bottom': 'mdi:arrow-bottom-right',
  bottom: 'mdi:arrow-down',
  upper: 'mdi:arrow-up',
  lower: 'mdi:arrow-down',
  horizontal: 'mdi:arrow-left-right',
  left: 'mdi:arrow-left',
  'center-left': 'mdi:arrow-top-left',
  center: 'mdi:arrow-collapse-horizontal',
  'center-right': 'mdi:arrow-top-right',
  right: 'mdi:arrow-right',
  both: 'mdi:arrow-all',
  swing: 'mdi:arrow-oscillating',
  wide: 'mdi:arrow-expand-horizontal',
  narrow: 'mdi:arrow-collapse-horizontal',
  split: 'mdi:arrow-split-vertical',
  none: 'mdi:circle-off-outline',
  away: 'mdi:home-export-outline',
  eco: 'mdi:leaf',
  boost: 'mdi:weather-windy',
  comfort: 'mdi:sofa',
  auto_comfort: 'mdi:sofa',
  'auto-comfort': 'mdi:sofa',
  'auto comfort': 'mdi:sofa',
  home: 'mdi:home',
  sleep: 'mdi:sleep',
  activity: 'mdi:run',
}

export function getModeIcon(mode: string) {
  const modeKey = String(mode)
  const normalizedModeKey = modeKey.toLowerCase().replace(/\s+/g, '_')

  return MODE_ICONS[modeKey] ?? MODE_ICONS[normalizedModeKey]
}

export function getModeName(mode: string) {
  const modeKey = String(mode)
  const normalizedModeKey = modeKey.toLowerCase().replace(/\s+/g, '_')
  const modeNames: Record<string, string> = {
    low: 'Low',
    mid: 'Mid',
    medium: 'Medium',
    high: 'High',
    max: 'Max',
    turbo: 'Turbo',
    auto: 'Auto',
  }

  return modeNames[normalizedModeKey] ?? modeKey
}

type Icon = string | false | LooseObject
type Name = string | false
export interface HeaderConfig {
  name?: Name
  icon?: Icon
  faults?: Array<Fault>
  toggle?: ToggleConfig
  toggles?: Array<ToggleConfig>
}

export interface HeaderData {
  name?: Name
  icon: Icon
  slashOffIcon?: boolean
  faults?: Array<Fault>
  toggle?: Toggle | null
  toggles?: Array<Toggle>
}

export interface Toggle {
  entity: HAState
  label: string
  icon: string | false
  hide_when_off?: boolean
}
export type ToggleConfig = {
  entity: string
  name?: string | boolean
  icon?: string
  hide_when_off?: boolean
}

export default function parseHeaderConfig(
  config: false | HeaderConfig,
  entity,
  hass: HASS,
  enhancedVisuals = true
): false | HeaderData {
  if (config === false) return false

  let name
  if (typeof config?.name === 'string') {
    name = config.name
  } else if (config?.name === false) {
    name = false
  } else {
    name =
      typeof hass.formatEntityName === 'function'
        ? hass.formatEntityName(entity)
        : entity.attributes.friendly_name
  }

  let icon: Icon = enhancedVisuals
    ? getDefaultHeaderIcon(entity)
    : getLegacyHeaderIcon(entity)
  if (typeof config?.icon !== 'undefined') {
    icon = config.icon
  }

  return {
    name,
    icon,
    slashOffIcon: enhancedVisuals && shouldSlashOffIcon(entity, icon),
    toggle: config?.toggle ? parseToggle(config.toggle, hass) : null,
    toggles: parseToggles(config, hass),
    faults: parseFaults(config?.faults, hass),
  }
}

function parseToggle(config: ToggleConfig, hass): Toggle | null {
  const entity: HAState = hass.states[config.entity]
  if (!entity) return null

  let label = ''
  if (config?.name === true) {
    label = entity.attributes.friendly_name
  } else {
    label = (config?.name as string) ?? ''
  }

  return {
    entity,
    label,
    icon: config?.icon ?? false,
    hide_when_off: config?.hide_when_off,
  }
}

function parseToggles(config: HeaderConfig, hass): Array<Toggle> {
  const toggleConfigs = [
    ...(config?.toggle ? [config.toggle] : []),
    ...(Array.isArray(config?.toggles) ? config.toggles : []),
  ]

  return toggleConfigs
    .map((toggle) => parseToggle(toggle, hass))
    .filter((toggle): toggle is Toggle => !!toggle)
}

function getDefaultHeaderIcon(entity: HAState): Icon {
  const [entityDomain] = entity.entity_id.split('.')
  const action = getEntityAction(entity)
  const climateActionIcons = action ? getClimateHeaderIcons(entity) : undefined

  return (
    climateActionIcons ??
    entity.attributes.icon ??
    getClimateHeaderIcons(entity) ??
    DOMAIN_STATE_ICONS[entityDomain]?.[entity.state] ??
    (action ? STATE_ICONS : MODE_ICONS)
  )
}

function getLegacyHeaderIcon(entity: HAState): Icon {
  return getEntityAction(entity) ? STATE_ICONS : MODE_ICONS
}

function getClimateHeaderIcons(entity: HAState): typeof STATE_ICONS | undefined {
  const [entityDomain] = entity.entity_id.split('.')
  if (entityDomain !== 'climate') return undefined

  const hvacModes = Array.isArray(entity.attributes?.hvac_modes)
    ? entity.attributes.hvac_modes
    : []
  const action = getEntityAction(entity)
  const modeOrAction = String(action || entity.state)
  const isCoolingMode =
    hvacModes.includes('cool') ||
    hvacModes.includes('dry') ||
    hvacModes.includes('fan_only') ||
    ['cool', 'cooling', 'dry', 'fan_only', 'fan'].includes(modeOrAction)

  return isCoolingMode ? CLIMATE_COOLING_STATE_ICONS : CLIMATE_HEATING_STATE_ICONS
}

function shouldSlashOffIcon(entity: HAState, icon: Icon) {
  if (entity.state !== 'off') return false

  const resolvedIcon =
    typeof icon === 'object'
      ? icon[getEntityAction(entity) || entity.state] ?? false
      : icon

  if (typeof resolvedIcon !== 'string') return false

  const [entityDomain] = entity.entity_id.split('.')
  const domainOffIcon =
    entityDomain === 'climate'
      ? STATE_ICONS.off
      : DOMAIN_STATE_ICONS[entityDomain]?.off

  return (
    Boolean(domainOffIcon) &&
    resolvedIcon !== domainOffIcon &&
    !resolvedIcon.endsWith('-off')
  )
}

function parseFaults(config: Array<Fault>, hass: HASS) {
  if (Array.isArray(config)) {
    return config
      .filter(({ entity }) => Boolean(hass.states?.[entity]))
      .map(({ entity, ...rest }: Fault) => ({
        ...rest,
        state: hass.states[entity],
        entity,
      }))
  }
  return []
}
