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
