import { getEntityAction, getEntityStateText } from '../entityAction'

const localize = (value: string) => value

test('reads climate hvac action', () => {
  expect(
    getEntityAction({
      entity_id: 'climate.thermostat',
      state: 'heat',
      attributes: { hvac_action: 'heating' },
    })
  ).toBe('heating')
})

test('reads humidifier action for dehumidifiers', () => {
  expect(
    getEntityAction({
      entity_id: 'humidifier.basement_dehumidifier',
      state: 'on',
      attributes: { action: 'drying', device_class: 'dehumidifier' },
    })
  ).toBe('drying')
})

test('formats humidifier action as state text', () => {
  expect(
    getEntityStateText(
      {
        entity_id: 'humidifier.basement_dehumidifier',
        state: 'on',
        attributes: { action: 'drying', device_class: 'dehumidifier' },
      },
      { formatEntityAttributeValue: () => 'Drying' },
      localize
    )
  ).toBe('Drying')
})

test('formats fan preset as state text', () => {
  expect(
    getEntityStateText(
      {
        entity_id: 'fan.living_room',
        state: 'on',
        attributes: { preset_mode: 'auto', percentage: 42 },
      },
      { formatEntityAttributeValue: () => 'Auto' },
      localize
    )
  ).toBe('Auto')
})

test('formats fan percentage as state text', () => {
  const formatEntityAttributeValue = jest.fn(() => '42 %')
  expect(
    getEntityStateText(
      {
        entity_id: 'fan.living_room',
        state: 'on',
        attributes: { percentage: 42 },
      },
      { formatEntityAttributeValue, formatEntityState: () => 'On' },
      localize
    )
  ).toBe('42 %')
  expect(formatEntityAttributeValue).toHaveBeenCalledWith(
    expect.objectContaining({ entity_id: 'fan.living_room' }),
    'percentage'
  )
})

test('fan percentage keeps its legacy fallback without an HA formatter', () => {
  expect(
    getEntityStateText(
      {
        entity_id: 'fan.living_room',
        state: 'on',
        attributes: { percentage: 42 },
      },
      {},
      localize
    )
  ).toBe('42%')
})
