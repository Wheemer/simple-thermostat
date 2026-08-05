import { LooseObject } from '../types'
import { EntityAdapter, Range, SetpointService } from './types'

export const fanAdapter: EntityAdapter = {
  getSetpoints(attributes: LooseObject): Record<string, any> {
    if (typeof attributes?.percentage !== 'number') {
      return {}
    }
    return {
      percentage: attributes.percentage,
    }
  },

  getRange(attributes: LooseObject): Range {
    const percentageStep = Number(attributes?.percentage_step)
    const step =
      Number.isFinite(percentageStep) && percentageStep > 0
        ? percentageStep
        : 1

    return { min: 0, max: 100, step }
  },

  getCurrentValue(attributes: LooseObject) {
    return attributes?.current_temperature ?? attributes?.temperature ?? null
  },

  getCurrentValueUnit(attributes: LooseObject, hassConfig?: LooseObject) {
    if (
      attributes?.current_temperature !== null &&
      typeof attributes?.current_temperature !== 'undefined'
    ) {
      return hassConfig?.unit_system?.temperature ?? false
    }

    if (
      attributes?.temperature !== null &&
      typeof attributes?.temperature !== 'undefined'
    ) {
      return (
        attributes?.unit_of_measurement ??
        hassConfig?.unit_system?.temperature ??
        false
      )
    }

    return false
  },

  getCurrentValueTemplate(): string {
    return '{{current_temperature|formatNumber}}'
  },

  getSetpointService(): SetpointService {
    return { domain: 'fan', service: 'set_percentage' }
  },

  getModeService(type: string): string {
    if (type === 'state') return 'turn_on'
    if (type === 'direction') return 'set_direction'
    if (type === 'oscillating') return 'oscillate'
    return `set_${type}_mode`
  },

  getModePayloadKey(type: string): string {
    if (type === 'state') return 'state'
    if (type === 'direction') return 'direction'
    if (type === 'oscillating') return 'oscillating'
    return `${type}_mode`
  },

  getModeAttribute(type: string): string {
    if (type === 'state') return 'state'
    if (type === 'direction') return 'direction'
    if (type === 'oscillating') return 'oscillating'
    return `${type}_modes`
  },

  getDefaultControl(): string[] {
    return ['preset', 'direction', 'oscillating', 'state']
  },

  transformModePayloadValue(type: string, value: string) {
    if (type === 'oscillating') return value === 'true'
    return value
  },

  getLocalizationDomain(): string {
    return 'fan'
  },
}
