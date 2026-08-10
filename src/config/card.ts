import { HeaderConfig } from './header'
import { LooseObject, ConfigEntity, FooterEntity } from '../types'
import { Service } from './service'
import { Setpoints } from './setpoints'

export enum MODES {
  HVAC = 'hvac',
  FAN = 'fan',
  STATE = 'state',
  PRESET = 'preset',
  SWING = 'swing',
  SWING_HORIZONTAL = 'swing_horizontal',
  SWING_VERTICAL = 'swing_vertical',
  VANE_HORIZONTAL = 'vane_horizontal',
  VANE_VERTICAL = 'vane_vertical',
  DIRECTION = 'direction',
  OSCILLATING = 'oscillating',
  MODE = 'mode',
}

export type ModeValue = {
  name?: string | false
  icon?: string | false
  include?: boolean
  hide_when_off?: boolean
}

/**
 * Represents the available mode values for a mode
 *
 */
export type ModeControlObject = Record<
  string,
  boolean | string | ModeValue | Array<string | number | boolean>
> & {
  _name?: string | boolean
  _heading?: boolean
  _hide_when_off?: boolean
  hide_when_off?: boolean
  hide_off_when_off?: boolean
  _icons?: boolean
  _order?: Array<string | number | boolean>
  entity?: string
}

/**
 * Modes (hvac, fac, preset, swing)
 * that might exist as attributes on a climate entity.
 * Modes can be set to a value based on a list of options
 * that are provided in the attributes of the entity.
 *
 */
export type ModeControlValue = boolean | ModeControlObject
export type ModeControl = Partial<Record<MODES, ModeControlValue>> & {
  _order?: Array<string>
}

interface CardConfig {
  entity?: string
  current_value_entity?: string
  header: false | HeaderConfig
  control?: false | ModeControl | string[]
  footer?: false | Array<FooterEntity>
  entities?: false | Array<ConfigEntity>
  setpoints?: Setpoints
  decimals?: number
  step_size?: number
  setpoint_debounce_ms?: number
  variables?: LooseObject
  state_labels?: Record<string, string>
  layout?: {
    mode: {
      names: boolean
      icons: boolean
      headings: boolean
    }
    entities: {
      type: 'table' | 'list'
      labels: boolean
      display?: 'row' | 'auto' | 'button' | 'toggle' | 'chip'
      separator?: boolean
      alignment?: 'left' | 'right'
    }
    step: 'row' | 'column'
  }
  unit?: boolean | string
  fallback?: string
  enhanced_visuals?: boolean
  embedded?: boolean
  styles?: string
  service?: Service
  hide_setpoint?: boolean
  hide_current_value_when_off?: boolean
  hide_setpoint_when_off?: boolean
  disable_setpoint_change_when_off?: boolean
  hide?: {
    temperature?: boolean
    current_value_when_off?: boolean
    temperature_when_off?: boolean
    state?: boolean
    setpoint_label?: boolean
    setpoint_when_off?: boolean
  }
  label?: {
    temperature?: string
    state?: string
    setpoint?: string
  }
  tap_action?: TapAction
  hold_action?: TapAction
  double_tap_action?: TapAction
}

export type TapAction =
  | { action: 'more-info' }
  | { action: 'none' }
  | { action: 'navigate'; navigation_path: string }
  | { action: 'url'; url_path: string }
  | { action: 'toggle' }
  | { action: 'call-service'; service: string; service_data?: LooseObject }

export { CardConfig }
