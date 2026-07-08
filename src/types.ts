export type LooseObject = Record<string, any>

export interface ConfigEntity {
  entity: string
  id?: string
  name?: string
  icon?: string
  attribute?: string
  unit?: string
  decimals?: number
  show?: boolean
  type?: 'relativetime'
  template?: string
}

export interface Entity extends ConfigEntity {
  state: any
}

export interface HASS {
  states?: Record<string, any>
  performAction?: (request: { action: string; data: object }) => void
  callService?: (domain: string, service: string, data: object) => void
  formatEntityName?: (
    stateObj: LooseObject,
    context?: unknown,
    options?: unknown
  ) => string
  [key: string]: any
}

export enum HVAC_MODES {
  OFF = 'off',
  HEAT = 'heat',
  COOL = 'cool',
  HEAT_COOL = 'heat_cool',
  AUTO = 'auto',
  DRY = 'dry',
  FAN_ONLY = 'fan_only',
}

export interface ControlModeOption {
  value: string
  name: string | false
  icon?: string | false
  iconConfigured?: boolean
}
export interface ControlMode {
  type: string
  mode: any
  name?: string | boolean
  heading?: boolean
  icons?: boolean
  hide_when_off?: boolean
  preserve_option_order?: boolean
  list: Array<ControlModeOption>
}
