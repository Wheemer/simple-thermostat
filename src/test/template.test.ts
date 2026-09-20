import { renderTemplate } from '../template'

test('relative time template filter renders ha-relative-time with datetime attribute', () => {
  const result = renderTemplate({
    template: '{{state.raw|relativetime}}',
    stateObj: {
      entity_id: 'sensor.last_seen',
      state: '2026-07-18T12:00:00Z',
      attributes: {},
    },
    hass: {},
  })

  expect(result).toContain('<ha-relative-time')
  expect(result).toContain('datetime="2026-07-18T12:00:00Z"')
  expect(result).not.toContain('fwd-datetime')
  expect(result).not.toContain('with-hass')
})

test('template ui keys localize without loaded resources', () => {
  const result = renderTemplate({
    template: '{{ui.currently}}',
    stateObj: {
      entity_id: 'sensor.temperature',
      state: '20',
      attributes: {},
    },
    hass: {
      localize: (key: string) =>
        key === 'ui.card.climate.currently' ? 'Current temperature' : key,
    },
  })

  expect(result).toBe('Current temperature')
})

test('template exceptions fall back to the formatted state', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation()
  const result = renderTemplate({
    template: '{{missing.function()}}',
    stateObj: {
      entity_id: 'sensor.temperature',
      state: '<20>',
      attributes: {},
    },
    hass: {
      formatEntityState: () => '20 C',
    },
  })

  expect(result).toBe('20 C')
  expect(consoleError).toHaveBeenCalled()
  consoleError.mockRestore()
})

test('template number formatting rejects invalid decimal counts', () => {
  expect(
    renderTemplate({
      template: '{{state.raw|formatNumber({decimals: -1})}}',
      stateObj: {
        entity_id: 'sensor.temperature',
        state: '20.25',
        attributes: {},
      },
      hass: {},
      config: { decimals: 2 },
    })
  ).toBe('20.25')
})
