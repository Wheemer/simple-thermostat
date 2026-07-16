import { render } from 'lit'
import renderHeader from '../components/header'

test('renders slash overlay class for custom off header icons', () => {
  const result = renderHeader({
    header: {
      name: 'Custom Fan',
      icon: 'custom:fan',
      slashOffIcon: true,
      faults: [],
      toggles: [],
    },
    entity: {
      entity_id: 'fan.custom',
      state: 'off',
      attributes: {},
    },
    openEntityPopover: () => undefined,
    toggleEntityChanged: () => undefined,
  })

  render(result, document.body)

  const iconWrap = document.body.querySelector('.header__icon-wrap')
  expect(iconWrap?.classList.contains('off')).toBe(true)
  expect(iconWrap?.classList.contains('slash-off')).toBe(true)
  expect((document.body.querySelector('.header__icon') as any)?.icon).toBe(
    'custom:fan'
  )
})

test('uses entity icon for label-only header toggle color classes', async () => {
  const container = document.createElement('div')
  const result = renderHeader({
    header: {
      name: 'Fishy Heat',
      icon: 'mdi:radiator',
      slashOffIcon: false,
      faults: [],
      toggles: [
        {
          label: 'Heater',
          icon: false,
          entity: {
            entity_id: 'switch.fishy_heater',
            state: 'on',
            attributes: {
              icon: 'mdi:radiator',
              friendly_name: 'Fishy Heater',
            },
          },
        },
      ],
    },
    entity: {
      entity_id: 'climate.fishy',
      state: 'heat',
      attributes: {},
    },
    openEntityPopover: () => undefined,
    toggleEntityChanged: () => undefined,
  })

  render(result, container)
  await Promise.resolve()

  const toggle = container.querySelector('.header__toggle')
  const label = container.querySelector('.toggle-label')
  expect(toggle?.classList.contains('toggle-heat')).toBe(true)
  expect(label?.classList.contains('toggle-heat')).toBe(true)
  expect(label?.textContent).toContain('Heater')
  expect(label?.querySelector('ha-icon')).toBeNull()
})

test('header toggles can hide when the main entity is off', async () => {
  const container = document.createElement('div')
  const result = renderHeader({
    header: {
      name: 'Fishy Heat',
      icon: 'mdi:radiator',
      slashOffIcon: false,
      faults: [],
      toggles: [
        {
          label: 'Heater',
          icon: false,
          hide_when_off: true,
          entity: {
            entity_id: 'switch.fishy_heater',
            state: 'on',
            attributes: {
              friendly_name: 'Fishy Heater',
            },
          },
        },
      ],
    },
    entity: {
      entity_id: 'climate.fishy',
      state: 'off',
      attributes: {},
    },
    openEntityPopover: () => undefined,
    toggleEntityChanged: () => undefined,
  })

  render(result, container)
  await Promise.resolve()

  expect(container.querySelector('.header__toggle')).toBe(null)
})

test('header toggles stay visible while the main entity is on', async () => {
  const container = document.createElement('div')
  const result = renderHeader({
    header: {
      name: 'Fishy Heat',
      icon: 'mdi:radiator',
      slashOffIcon: false,
      faults: [],
      toggles: [
        {
          label: 'Heater',
          icon: false,
          hide_when_off: true,
          entity: {
            entity_id: 'switch.fishy_heater',
            state: 'off',
            attributes: {
              friendly_name: 'Fishy Heater',
            },
          },
        },
      ],
    },
    entity: {
      entity_id: 'climate.fishy',
      state: 'heat',
      attributes: {},
    },
    openEntityPopover: () => undefined,
    toggleEntityChanged: () => undefined,
  })

  render(result, container)
  await Promise.resolve()

  expect(container.querySelector('.header__toggle')).not.toBe(null)
})

test('header icon includes humidifier action class', async () => {
  const container = document.createElement('div')
  const result = renderHeader({
    header: {
      name: 'Dehumidifier',
      icon: 'mdi:air-humidifier',
      slashOffIcon: false,
      faults: [],
      toggles: [],
    },
    entity: {
      entity_id: 'humidifier.basement_dehumidifier',
      state: 'on',
      attributes: {
        action: 'drying',
        device_class: 'dehumidifier',
      },
    },
    openEntityPopover: () => undefined,
    toggleEntityChanged: () => undefined,
  })

  render(result, container)
  await Promise.resolve()

  const icon = container.querySelector('.header__icon')
  expect(icon?.classList.contains('on')).toBe(true)
  expect(icon?.classList.contains('drying')).toBe(true)
})
