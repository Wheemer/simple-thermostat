import { EntityAdapter } from '../adapters'
import { climateAdapter } from '../adapters/climate'

export interface Setpoint {
  hide?: boolean
  hide_when?: string | Array<string>
}

export type Setpoints = Record<string, Setpoint>

export default function parseSetpoints(
  setpoints: Setpoints | false | undefined,
  attributes: any,
  adapter: EntityAdapter = climateAdapter,
  entityState?: string
) {
  if (setpoints === false) {
    return {}
  }

  if (setpoints) {
    return Object.entries(setpoints).reduce((result, [name, sp]) => {
      if (sp?.hide) return result
      const hiddenStates = Array.isArray(sp?.hide_when)
        ? sp.hide_when
        : sp?.hide_when
          ? [sp.hide_when]
          : []
      if (entityState && hiddenStates.includes(entityState)) return result
      result[name] = attributes?.[name]
      return result
    }, {} as Record<string, any>)
  }

  return adapter.getSetpoints(attributes)
}
