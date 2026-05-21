import { HeaderConfig } from './header'
import { LooseObject, ConfigEntity, TemplatedEntity } from '../types'
import { Service } from './service'
import { Setpoints } from './setpoints'

export enum MODES {
  HVAC = 'hvac',
  FAN = 'fan',
  PRESET = 'preset',
  SWING = 'swing',
  SWING_HORIZONTAL = 'swing_horizontal',
  SWING_VERTICAL = 'swing_vertical',
  VANE_HORIZONTAL = 'vane_horizontal',
  VANE_VERTICAL = 'vane_vertical',
}

export type ModeValue = {
  name?: string | false
  icon?: string | false
  include?: boolean
}

/**
 * Represents the available mode values for a mode
 *
 */
export type ModeControlObject = Record<string, boolean | ModeValue> & {
  _name: string
  _hide_when_off: boolean
  _icons?: boolean
}

/**
 * Modes (hvac, fac, preset, swing)
 * that might exist as attributes on a climate entity.
 * Modes can be set to a value based on a list of options
 * that are provided in the attributes of the entity.
 *
 */
export type ModeControlValue = boolean | ModeControlObject
type ModeControl = {
  hvac: ModeControlValue
  fan: ModeControlValue
  preset: ModeControlValue
  swing: ModeControlValue
  swing_horizontal: ModeControlValue
  swing_vertical: ModeControlValue
  vane_horizontal: ModeControlValue
  vane_vertical: ModeControlValue
}

interface CardConfig {
  entity?: string
  current_temperature_entity?: string
  header: false | HeaderConfig
  control?: false | ModeControl | string[]
  entities?: false | Array<ConfigEntity & TemplatedEntity>
  sensors?: false | Array<ConfigEntity & TemplatedEntity>
  version: 2 | 3
  setpoints?: Setpoints
  decimals?: number
  step_size?: number
  variables?: LooseObject
  layout?: {
    mode: {
      names: boolean
      icons: boolean
      headings: boolean
    }
    entities: {
      type: 'table' | 'list'
      labels: boolean
    }
    sensors: {
      type: 'table' | 'list'
      labels: boolean
    }
    step: 'row' | 'column'
  }
  unit?: boolean | string
  fallback?: string
  service?: Service
  hide_setpoint?: boolean
  hide?: {
    temperature?: boolean
    state?: boolean
  }
  label?: {
    temperature?: string
    state?: string
  }
}

export { CardConfig }
