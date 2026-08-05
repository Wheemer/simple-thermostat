import { CardConfig } from './card'

type LayoutConfig = NonNullable<CardConfig['layout']>

type ImportableLayout = LayoutConfig & {
  sensors?: LayoutConfig['entities']
}

type ImportableCardConfig = CardConfig & {
  current_temperature_entity?: CardConfig['current_value_entity']
  sensors?: CardConfig['entities']
  version?: number
  layout?: ImportableLayout
}

function normalizeEntities(entities: CardConfig['entities']) {
  if (!Array.isArray(entities)) return entities

  return entities.map((entity) => {
    const { label, ...normalizedEntity } = entity as typeof entity & {
      label?: string
    }

    if (!normalizedEntity.name && label) {
      normalizedEntity.name = label
    }

    return normalizedEntity
  })
}

function importLegacySensors(config: ImportableCardConfig) {
  if (!Array.isArray(config.sensors)) return

  const entities: CardConfig['entities'] = []

  config.sensors.forEach((sensor) => {
    const legacySensor = sensor as typeof sensor & {
      id?: string
      label?: string
      show?: boolean
    }

    if (legacySensor.id === 'temperature') {
      if (legacySensor.label) {
        config.label = {
          ...(config.label ?? {}),
          temperature: legacySensor.label,
        }
      }
      if (legacySensor.show === false) {
        config.hide = {
          ...(config.hide ?? {}),
          temperature: true,
        }
      }
      return
    }

    if (legacySensor.id === 'state') {
      if (legacySensor.label) {
        config.label = {
          ...(config.label ?? {}),
          state: legacySensor.label,
        }
      }
      if (legacySensor.show === false) {
        config.hide = {
          ...(config.hide ?? {}),
          state: true,
        }
      }
      return
    }

    entities.push(sensor)
  })

  config.entities = normalizeEntities(entities)
}

export default function normalizeConfig(
  config: ImportableCardConfig
): CardConfig {
  const normalized: ImportableCardConfig = {
    ...config,
    layout: config.layout ? { ...config.layout } : undefined,
  }
  const legacyVersion = normalized.version === 3

  if (
    legacyVersion &&
    typeof normalized.enhanced_visuals === 'undefined'
  ) {
    normalized.enhanced_visuals = false
  }

  if (legacyVersion && !normalized.layout?.step) {
    normalized.layout = {
      ...(normalized.layout ?? {}),
      step: 'column',
    } as ImportableLayout
  }

  if (
    !normalized.current_value_entity &&
    normalized.current_temperature_entity
  ) {
    normalized.current_value_entity = normalized.current_temperature_entity
  }

  if (
    typeof normalized.entities === 'undefined' &&
    typeof normalized.sensors !== 'undefined'
  ) {
    importLegacySensors(normalized)
  }
  normalized.entities = normalizeEntities(normalized.entities)

  if (
    normalized.layout &&
    typeof normalized.layout.entities === 'undefined' &&
    typeof normalized.layout.sensors !== 'undefined'
  ) {
    normalized.layout.entities = normalized.layout.sensors
  }

  delete normalized.current_temperature_entity
  delete normalized.sensors
  delete normalized.layout?.sensors
  delete normalized.version

  return normalized as CardConfig
}
