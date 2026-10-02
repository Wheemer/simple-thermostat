import '../simple-thermostat'

test('suggests Simple Thermostat for climate entities in the card picker', () => {
  const card = (window as any).customCards.find(
    (entry: any) => entry.type === 'simple-thermostat'
  )

  expect(card.getEntitySuggestion({}, 'climate.living_room')).toEqual({
    config: {
      type: 'custom:simple-thermostat',
      entity: 'climate.living_room',
    },
  })
  expect(card.getEntitySuggestion({}, 'fan.living_room')).toBeNull()
})
