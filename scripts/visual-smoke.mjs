import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const bundle = resolve('simple-thermostat.js')
const outputDirectory = resolve('test-results', 'visual')

await mkdir(outputDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const fixture of [
    { name: 'desktop', width: 900, height: 900 },
    { name: 'mobile', width: 334, height: 900 },
  ]) {
    const page = await browser.newPage({
      viewport: { width: fixture.width, height: fixture.height },
      deviceScaleFactor: 1,
    })
    await page.setContent(`<!doctype html><style>
      :root { --card-background-color:#18232d; --ha-card-background:#18232d;
        --primary-text-color:#f4f6f8; --secondary-text-color:#b8c0c7;
        --primary-color:#03a9d9; --divider-color:#46515c; }
      body { margin:16px; background:#101820; font-family:Arial,sans-serif; }
      simple-thermostat, simple-thermostat-group { display:block; max-width:720px; }
      ha-icon { display:inline-block; width:24px; height:24px; }
    </style><body></body>`)
    await page.evaluate(() => {
      window.customCards = []
      if (!customElements.get('ha-card')) {
        customElements.define(
          'ha-card',
          class extends HTMLElement {
            constructor() {
              super()
              const root = this.attachShadow({ mode: 'open' })
              root.innerHTML =
                '<style>:host{display:block;box-sizing:border-box;width:100%}</style><slot></slot>'
            }
          }
        )
      }
      window.loadCardHelpers = async () => ({
        createCardElement: async (config) => {
          const card = document.createElement('simple-thermostat')
          card.setConfig(config)
          return card
        },
      })
    })
    await page.addScriptTag({ path: bundle })
    await page.evaluate(() => {
      const hass = {
        states: {
          'climate.audit': {
            entity_id: 'climate.audit',
            state: 'heat_cool',
            attributes: {
              friendly_name: 'Main Floor Thermostat',
              current_temperature: 22.4,
              target_temp_low: 19,
              target_temp_high: 24,
              min_temp: 7,
              max_temp: 35,
              hvac_modes: ['off', 'heat', 'cool', 'heat_cool'],
              hvac_action: 'cooling',
            },
          },
          'climate.audit_second': {
            entity_id: 'climate.audit_second',
            state: 'off',
            attributes: {
              friendly_name: 'Second Thermostat',
              current_temperature: 20,
              temperature: 21,
              min_temp: 7,
              max_temp: 35,
              hvac_modes: ['off', 'heat', 'cool'],
            },
          },
          'climate.audit_single': {
            entity_id: 'climate.audit_single',
            state: 'heat',
            attributes: {
              friendly_name: 'Smoker',
              current_temperature: 96,
              temperature: 105,
              min_temp: 75,
              max_temp: 260,
              target_temp_step: 5,
              hvac_modes: ['off', 'heat'],
            },
          },
          'sensor.long_temperature': {
            entity_id: 'sensor.long_temperature',
            state: '23.7',
            attributes: {
              friendly_name: 'Fireplace Lightswitch Temperature',
              unit_of_measurement: '°C',
            },
          },
          'sensor.humidity': {
            entity_id: 'sensor.humidity',
            state: '48',
            attributes: {
              friendly_name: 'Thermostat Humidity',
              unit_of_measurement: '%',
            },
          },
        },
        config: { unit_system: { temperature: '°C' } },
        locale: { language: 'en' },
        localize: (key) => {
          const labels = {
            'ui.card.climate.currently': 'Currently',
            'ui.card.climate.target': 'Target',
            'state_attributes.climate.hvac_action': 'State',
          }
          return labels[key] ?? key.split('.').at(-1)?.replaceAll('_', ' ')
        },
        formatEntityName: (entity) => entity.attributes.friendly_name,
        formatEntityState: (entity) => entity.state,
        callService: () => undefined,
      }
      const card = document.createElement('simple-thermostat')
      card.setConfig({
        entity: 'climate.audit',
        header: { name: 'Main Floor Thermostat' },
        layout: { step: 'column', mode: { headings: false } },
        control: {
          hvac: { off: {}, heat: {}, cool: {}, heat_cool: { name: 'Auto' } },
        },
        entities: [
          {
            entity: 'sensor.long_temperature',
            name: 'Fireplace Lightswitch Temperature',
          },
          { entity: 'sensor.humidity', name: 'Thermostat Humidity' },
        ],
      })
      card.hass = hass
      document.body.append(card)
      const singleSetpointCard = document.createElement('simple-thermostat')
      singleSetpointCard.id = 'single-setpoint-audit'
      singleSetpointCard.setConfig({
        entity: 'climate.audit_single',
        header: { name: 'Smoker' },
        layout: { step: 'column', mode: { headings: false } },
        control: { hvac: { off: {}, heat: {} } },
      })
      singleSetpointCard.hass = hass
      singleSetpointCard.style.marginTop = '16px'
      document.body.append(singleSetpointCard)
      const group = document.createElement('simple-thermostat-group')
      group.setConfig({
        cards: [
          { entity: 'climate.audit', header: { name: 'Main Floor' } },
          {
            entity: 'climate.audit_second',
            header: { name: 'Second Thermostat' },
          },
        ],
      })
      group.hass = hass
      group.style.marginTop = '16px'
      document.body.append(group)
    })
    await page.waitForTimeout(100)
    const problems = await page.evaluate(() => {
      const problems = []
      const inspectCard = (
        host,
        label,
        expectBalancedSingleSetpoint = false
      ) => {
        const root = host.shadowRoot
        const surface = root?.querySelector('ha-card')
        if (!surface) return void problems.push(`${label}: missing surface`)
        const bounds = surface.getBoundingClientRect()
        if (bounds.width <= 0 || bounds.height <= 0)
          problems.push(`${label}: blank surface`)
        const controls = Array.from(
          root.querySelectorAll('.mode-item, .thermostat-trigger')
        )
        controls.forEach((control, index) => {
          const rect = control.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0)
            problems.push(`${label}: control ${index} has no size`)
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
            problems.push(`${label}: control ${index} escapes horizontally`)
          }
        })
        for (let left = 0; left < controls.length; left += 1) {
          for (let right = left + 1; right < controls.length; right += 1) {
            const a = controls[left].getBoundingClientRect()
            const b = controls[right].getBoundingClientRect()
            const overlapX =
              Math.min(a.right, b.right) - Math.max(a.left, b.left)
            const overlapY =
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
            if (overlapX > 1 && overlapY > 1)
              problems.push(`${label}: controls ${left}/${right} overlap`)
          }
        }
        if (expectBalancedSingleSetpoint) {
          const body = root.querySelector('.body')
          const setpoint = root.querySelector('.current-wrapper')
          if (!body || !setpoint) {
            problems.push(`${label}: missing single-setpoint layout`)
          } else {
            const bodyRect = body.getBoundingClientRect()
            const setpointRect = setpoint.getBoundingClientRect()
            const setpointCenter =
              setpointRect.left + setpointRect.width / 2 - bodyRect.left
            const setpointPosition = setpointCenter / bodyRect.width
            if (setpointPosition < 0.6 || setpointPosition > 0.85) {
              problems.push(
                `${label}: setpoint column is not balanced (${setpointPosition.toFixed(2)})`
              )
            }
          }
        }
      }
      inspectCard(document.querySelector('simple-thermostat'), 'main')
      inspectCard(
        document.querySelector('#single-setpoint-audit'),
        'single-setpoint',
        true
      )
      const group = document.querySelector('simple-thermostat-group')
      const embedded = group?.shadowRoot?.querySelector(
        '.embedded-card-host'
      )?.firstElementChild
      if (!embedded) problems.push('group: missing embedded card')
      else inspectCard(embedded, 'group')
      return problems
    })
    await page.screenshot({
      path: resolve(outputDirectory, `${fixture.name}.png`),
      fullPage: true,
    })
    assert.deepEqual(problems, [], `${fixture.name}: ${problems.join('; ')}`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('Visual smoke checks passed for desktop and 334px mobile layouts.')
