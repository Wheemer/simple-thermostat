import { climateAdapter } from '../adapters/climate'
import { fanAdapter } from '../adapters/fan'
import { humidifierAdapter } from '../adapters/humidifier'
import { getAdapter } from '../adapters'
import { getModeIcon, getModeName, MODE_ICONS } from '../config/header'

test('selects adapters by entity domain', () => {
  expect(getAdapter('climate.living_room')).toBe(climateAdapter)
  expect(getAdapter('fan.attic')).toBe(fanAdapter)
  expect(getAdapter('humidifier.basement')).toBe(humidifierAdapter)
  expect(getAdapter('switch.unknown')).toBe(climateAdapter)
})

test('climate adapter returns climate setpoints', () => {
  expect(climateAdapter.getSetpoints({ temperature: 22 })).toEqual({
    temperature: 22,
  })
  expect(
    climateAdapter.getSetpoints({
      target_temp_low: 19,
      target_temp_high: 24,
    })
  ).toEqual({ target_temp_low: 19, target_temp_high: 24 })
})

test('climate adapter maps range and services', () => {
  expect(
    climateAdapter.getRange({
      min_temp: 7,
      max_temp: 35,
      target_temp_step: 0.5,
    })
  ).toEqual({ min: 7, max: 35, step: 0.5 })
  expect(climateAdapter.getSetpointService()).toEqual({
    domain: 'climate',
    service: 'set_temperature',
  })
})

test('climate adapter maps vane modes without mode suffix', () => {
  expect(climateAdapter.getModeService('vane_horizontal')).toBe(
    'set_vane_horizontal'
  )
  expect(climateAdapter.getModePayloadKey('vane_horizontal')).toBe(
    'vane_horizontal'
  )
  expect(climateAdapter.getModeAttribute('vane_horizontal')).toBe(
    'vane_horizontal_positions'
  )
})

test('fan adapter skips missing percentage setpoint', () => {
  expect(fanAdapter.getSetpoints({})).toEqual({})
  expect(fanAdapter.getSetpoints({ percentage: 30 })).toEqual({
    percentage: 30,
  })
})

test('fan adapter shows temperature as current value without duplicating percentage', () => {
  expect(fanAdapter.getCurrentValue({ percentage: 55 })).toBe(null)
  expect(fanAdapter.getCurrentValue({ current_temperature: 22.4 })).toBe(22.4)
  expect(
    fanAdapter.getCurrentValueUnit(
      { current_temperature: 22.4 },
      { unit_system: { temperature: '°C' } }
    )
  ).toBe('°C')
  expect(fanAdapter.getCurrentValue({})).toBe(null)
  expect(fanAdapter.getCurrentValueTemplate()).toBe(
    '{{current_temperature|formatNumber}}'
  )
  expect(fanAdapter.getSetpointService()).toEqual({
    domain: 'fan',
    service: 'set_percentage',
  })
})

test('fan adapter includes state controls by default', () => {
  expect(fanAdapter.getDefaultControl()).toEqual([
    'preset',
    'direction',
    'oscillating',
    'state',
  ])
})

test('fan presets include default speed icons', () => {
  expect(MODE_ICONS.low).toBe('mdi:fan-speed-1')
  expect(MODE_ICONS.mid).toBe('mdi:fan-speed-2')
  expect(MODE_ICONS.medium).toBe('mdi:fan-speed-2')
  expect(MODE_ICONS.high).toBe('mdi:fan-speed-3')
  expect(MODE_ICONS.max).toBe('st:fan-speed-4')
  expect(MODE_ICONS.turbo).toBe('st:fan-speed-5')
  expect(getModeIcon('Low')).toBe('mdi:fan-speed-1')
  expect(getModeIcon('mid')).toBe('mdi:fan-speed-2')
  expect(getModeIcon('High')).toBe('mdi:fan-speed-3')
  expect(getModeIcon('Auto')).toBe('hass:autorenew')
  expect(getModeIcon('auto_comfort')).toBe('mdi:sofa')
  expect(getModeIcon('auto-comfort')).toBe('mdi:sofa')
  expect(getModeIcon('auto comfort')).toBe('mdi:sofa')
  expect(getModeName('mid')).toBe('Mid')
  expect(getModeName('Low')).toBe('Low')
})

test('vane presets include default position icons without overriding fan mid', () => {
  expect(MODE_ICONS.swing).toBe('mdi:arrow-oscillating')
  expect(MODE_ICONS.wide).toBe('mdi:arrow-expand-horizontal')
  expect(MODE_ICONS.narrow).toBe('mdi:arrow-collapse-horizontal')
  expect(MODE_ICONS.split).toBe('mdi:arrow-split-vertical')
  expect(MODE_ICONS.mid).toBe('mdi:fan-speed-2')
})

test('fan adapter maps oscillating payload as boolean', () => {
  expect(fanAdapter.transformModePayloadValue('oscillating', 'true')).toBe(true)
  expect(fanAdapter.transformModePayloadValue('oscillating', 'false')).toBe(false)
})

test('humidifier adapter maps humidity setpoint and current value', () => {
  expect(humidifierAdapter.getSetpoints({ humidity: 45 })).toEqual({
    humidity: 45,
  })
  expect(humidifierAdapter.getCurrentValue({ current_humidity: 48.6 })).toBe(
    48.6
  )
  expect(humidifierAdapter.getCurrentValueTemplate()).toBe(
    '{{current_humidity|formatNumber}}'
  )
})

test('humidifier adapter maps humidity range and service', () => {
  expect(
    humidifierAdapter.getRange({ min_humidity: 35, max_humidity: 60 })
  ).toEqual({ min: 35, max: 60, step: 1 })
  expect(humidifierAdapter.getSetpointService()).toEqual({
    domain: 'humidifier',
    service: 'set_humidity',
  })
})

test('humidifier adapter includes mode and state controls by default', () => {
  expect(humidifierAdapter.getDefaultControl()).toEqual(['mode', 'state'])
})
