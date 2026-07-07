import { LooseObject } from '../types'

export interface Range {
  min: number | null
  max: number | null
  step: number | null
}

export interface SetpointService {
  domain: string
  service: string
}

export interface EntityAdapter {
  /** Return the setpoint values for this entity, for example { temperature: 22 } or { target_temp_low: 18, target_temp_high: 24 }. */
  getSetpoints(attributes: LooseObject): Record<string, any>

  /** Return min, max, and step for setpoint adjustments. */
  getRange(attributes: LooseObject): Range

  /** Return the current measured value, for example current_temperature, current_humidity, or percentage. */
  getCurrentValue(attributes: LooseObject): number | string | null

  /** Optionally return a unit for the built-in current value row. */
  getCurrentValueUnit?(
    attributes: LooseObject,
    hassConfig?: LooseObject
  ): string | boolean | null

  /** Return the default current-value display key for built-in entity rows. */
  getCurrentValueTemplate(): string

  /** Return the default service used when applying a setpoint change. */
  getSetpointService(): SetpointService

  /** Return the service name for setting a given mode type. */
  getModeService(type: string): string

  /** Return the payload key for the given mode type, for example hvac_mode or preset_mode. */
  getModePayloadKey(type: string): string

  /** Return the entity attribute that lists allowed values for a mode type, for example hvac_modes or available_modes. */
  getModeAttribute(type: string): string

  /** Return the default mode types shown when no control config is set. */
  getDefaultControl(): string[]

  /** Optionally transform a mode value before sending it to Home Assistant. */
  transformModePayloadValue?(type: string, value: string): any

  /** Return the entity domain used for Home Assistant translation keys. */
  getLocalizationDomain(): string
}
