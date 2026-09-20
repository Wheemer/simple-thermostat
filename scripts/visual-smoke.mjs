import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import * as mdi from '@mdi/js'

const bundle = resolve('simple-thermostat.js')
const outputDirectory = resolve('test-results', 'visual')

await mkdir(outputDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const fixture of [
    { name: 'desktop', width: 900, height: 900 },
    { name: 'mobile', width: 334, height: 900 },
  ].flatMap((viewport) =>
    [
      'column',
      'row',
      'classic',
      'left',
      'hidden',
      'compact',
      'tabs',
      'german',
      'rtl',
      'unavailable',
      'unknown',
    ].map((variant) => ({
      ...viewport,
      variant,
      name: `${viewport.name}-${variant}`,
    }))
  )) {
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
    await page.evaluate((icons) => {
      window.__fallbackIconPath = icons.mdiHelpCircle
      window.customCards = []
      if (!customElements.get('ha-card')) {
        customElements.define(
          'ha-card',
          class extends HTMLElement {
            constructor() {
              super()
              const root = this.attachShadow({ mode: 'open' })
              root.innerHTML =
                '<style>:host{display:block;box-sizing:border-box;width:100%;background:var(--ha-card-background);color:var(--primary-text-color)}</style><slot></slot>'
            }
          }
        )
      }
      customElements.define(
        'ha-icon',
        class extends HTMLElement {
          set icon(value) {
            this.setAttribute('icon', value)
          }
          get icon() {
            return this.getAttribute('icon')
          }
          static get observedAttributes() {
            return ['icon']
          }
          constructor() {
            super()
            this.attachShadow({ mode: 'open' }).innerHTML =
              '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);flex-shrink:0}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 1,0 12,22A10,10 0 1,0 12,2M11,6H13V13H11M11,16H13V18H11"/></svg>'
          }
          connectedCallback() {
            // Lit can set properties while elements are still in an inert template.
            if (Object.hasOwn(this, 'icon')) {
              const icon = this.icon
              delete this.icon
              this.icon = icon
            }
            this.attributeChangedCallback()
          }
          attributeChangedCallback() {
            const name = this.getAttribute('icon')
              ?.replace(/^(mdi|hass):/, 'mdi-')
              .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
            this.shadowRoot
              .querySelector('path')
              .setAttribute('d', icons[name] ?? icons.mdiHelpCircle)
          }
        }
      )
      window.loadCardHelpers = async () => ({
        createCardElement: async (config) => {
          const card = document.createElement('simple-thermostat')
          card.setConfig(config)
          return card
        },
      })
    }, mdi)
    await page.evaluate(() => {
      customElements.define(
        'ha-switch',
        class extends HTMLElement {
          constructor() {
            super()
            this.attachShadow({ mode: 'open' }).innerHTML =
              '<style>:host{display:inline-flex}input{width:32px;height:24px;margin:0;cursor:pointer}</style><input type="checkbox" aria-label="Power">'
            this.input = this.shadowRoot.querySelector('input')
            this.input.addEventListener('change', () =>
              this.dispatchEvent(new Event('change'))
            )
          }
          set checked(value) {
            this.input.checked = value
          }
          get checked() {
            return this.input.checked
          }
          set disabled(value) {
            this.input.disabled = value
          }
          get disabled() {
            return this.input.disabled
          }
        }
      )
    })
    await page.addScriptTag({ path: bundle })
    await page.evaluate((variant) => {
      const german = variant === 'german'
      const rtl = variant === 'rtl'
      document.documentElement.dir = rtl ? 'rtl' : 'ltr'
      window.auditCalls = []
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
        locale: {
          language: german ? 'de' : rtl ? 'ar' : 'en',
          number_format: german ? 'decimal_comma' : 'language',
        },
        localize: (key) => {
          const labels = german
            ? {
                'ui.card.climate.currently': 'Aktuell',
                'ui.card.climate.target': 'Zieltemperatur',
                'state_attributes.climate.hvac_action': 'Status',
                'component.climate.state._.heat_cool': 'Heizen/Kühlen',
              }
            : rtl
              ? {
                  'ui.card.climate.currently': 'حاليا',
                  'ui.card.climate.target': 'الهدف',
                  'state_attributes.climate.hvac_action': 'الحالة',
                  'component.climate.state._.heat_cool': 'تدفئة وتبريد',
                }
              : {
                  'ui.card.climate.currently': 'Currently',
                  'ui.card.climate.target': 'Target',
                  'state_attributes.climate.hvac_action': 'State',
                }
          return labels[key] ?? key.split('.').at(-1)?.replaceAll('_', ' ')
        },
        formatEntityName: (entity) => entity.attributes.friendly_name,
        formatEntityState: (entity) =>
          entity.state === 'heat_cool' ? 'Auto' : entity.state,
        callService: (...args) => window.auditCalls.push(args),
      }
      const unavailable = ['unavailable', 'unknown'].includes(variant)
      if (unavailable) {
        hass.states['climate.audit'].state = variant
        hass.states['switch.power'] = {
          entity_id: 'switch.power',
          state: 'off',
          attributes: { friendly_name: 'Power' },
        }
      }
      const card = document.createElement('simple-thermostat')
      card.setConfig({
        entity: 'climate.audit',
        header: {
          name: 'Main Floor Thermostat',
          ...(unavailable
            ? { toggle: { entity: 'switch.power', name: 'Power' } }
            : {}),
        },
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
        selector: { style: variant === 'tabs' ? 'tabs' : 'dropdown' },
        cards: [
          {
            entity: 'climate.audit',
            header: {
              name: 'Main Floor',
              ...(unavailable
                ? { toggle: { entity: 'switch.power', name: 'Power' } }
                : {}),
            },
          },
          {
            entity: 'climate.audit_second',
            header: { name: 'Second Thermostat' },
          },
        ],
      })
      group.hass = hass
      group.style.marginTop = '16px'
      document.body.append(group)
      for (const target of [card, singleSetpointCard]) {
        const config = { ...target.config, layout: { ...target.config.layout } }
        if (variant === 'row') config.layout.step = 'row'
        if (variant === 'classic') config.enhanced_visuals = false
        if (variant === 'left') config.layout.entities = { alignment: 'left' }
        if (variant === 'hidden') config.hide_setpoint = true
        if (variant === 'compact') config.layout.entities = { display: 'chip' }
        target.setConfig(config)
      }
    }, fixture.variant)
    await page.waitForTimeout(100)
    if (fixture.variant === 'german') {
      assert.match(
        await page
          .locator('simple-thermostat')
          .first()
          .evaluate((card) => card.shadowRoot?.textContent ?? ''),
        /22,4/
      )
    }
    if (fixture.variant === 'rtl') {
      assert.deepEqual(
        await page.evaluate(() => {
          const group = document.querySelector('simple-thermostat-group')
          const previous = group?.shadowRoot?.querySelector(
            '.group-nav.previous ha-icon'
          )
          const next = group?.shadowRoot?.querySelector(
            '.group-nav.next ha-icon'
          )
          return {
            previousMirrored:
              previous instanceof Element &&
              getComputedStyle(previous).transform !== 'none',
            nextMirrored:
              next instanceof Element &&
              getComputedStyle(next).transform !== 'none',
          }
        }),
        { previousMirrored: true, nextMirrored: true }
      )
    }
    if (['unavailable', 'unknown'].includes(fixture.variant)) {
      const card = page.locator('simple-thermostat').first()
      await card.locator('ha-switch').click()
      await page
        .locator('simple-thermostat-group .group-toggle ha-switch')
        .click()
      assert.deepEqual(
        await page.evaluate(() => window.auditCalls),
        [
          ['homeassistant', 'turn_on', { entity_id: 'switch.power' }],
          ['homeassistant', 'turn_on', { entity_id: 'switch.power' }],
        ],
        'independent power switches must accept actual pointer clicks'
      )
      assert.equal(
        await card.locator('.thermostat-trigger:not([disabled])').count(),
        0
      )
      assert.equal(
        await card
          .locator('.modes.hvac .mode-item:not([aria-disabled="true"])')
          .count(),
        0
      )
    }
    const cssResults = await page.evaluate(async () => {
      const original = document.querySelector('simple-thermostat')
      const card = document.createElement('simple-thermostat')
      card.setConfig({
        entity: 'climate.audit',
        embedded: true,
        card_mod: {
          style:
            'ha-card { background: rgb(10, 20, 30); } ha-card { background: rgb(40, 50, 60); --st-mode-active-background: rgb(68, 99, 117); --st-mode-active-accent-color: transparent; } @media (max-width: 1px) { ha-card { background: red; } }',
        },
      })
      card.hass = {
        ...original._hass,
        states: {
          ...original._hass.states,
          'climate.audit': {
            ...original._hass.states['climate.audit'],
            state: 'heat_cool',
          },
        },
      }
      document.body.append(card)
      await card.updateComplete
      const surface = card.shadowRoot.querySelector('ha-card')
      const active = card.shadowRoot.querySelector('.mode-item.active')
      const result = {
        background: getComputedStyle(surface).backgroundColor,
        active: getComputedStyle(active).backgroundColor,
      }
      card.remove()
      return result
    })
    assert.deepEqual(
      cssResults,
      { background: 'rgb(40, 50, 60)', active: 'rgb(68, 99, 117)' },
      'embedded CSS must retain media conditions, cascade and public overrides'
    )
    const problems = await page.evaluate((variant) => {
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
        const table = root.querySelector('.body > .entities.as-table')
        if (table && variant !== 'compact') {
          const cells = Array.from(table.children)
            .filter((cell) => cell.matches('.entity-heading, .entity-value'))
            .map((cell) => cell.getBoundingClientRect())
            .filter((rect) => rect.width > 0)
          if (cells.length) {
            const section = table.getBoundingClientRect()
            const left = Math.min(...cells.map((rect) => rect.left))
            const right = Math.max(...cells.map((rect) => rect.right))
            if (
              Math.abs(
                (left + right) / 2 - (section.left + section.right) / 2
              ) > 1
            )
              problems.push(
                `${label}: entity content is not centered in its section`
              )
          }
        }
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
        const content = [
          ...root.querySelectorAll(
            '.entity-heading, .entity-value, .current--value, .current--label, .mode-label, .entity-action__label, .entity-action__state'
          ),
        ]
        const rectangles = content.flatMap((element) => {
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
          )
          const rects = []
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(walker.currentNode)
            rects.push(
              ...[...range.getClientRects()]
                .filter((rect) => rect.width > 0 && rect.height > 0)
                .map((rect) => ({ rect, element }))
            )
          }
          return rects
        })
        for (const { rect, element } of rectangles) {
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
            problems.push(
              `${label}: text escapes: ${element.textContent.trim()}`
            )
          for (const control of controls) {
            if (control.contains(element)) continue
            // Step buttons include transparent hit padding; test their visible icon.
            const button = (
              control.matches('.thermostat-trigger')
                ? control.querySelector('ha-icon')
                : control
            ).getBoundingClientRect()
            if (
              Math.min(rect.right, button.right) -
                Math.max(rect.left, button.left) >
                1 &&
              Math.min(rect.bottom, button.bottom) -
                Math.max(rect.top, button.top) >
                1
            )
              problems.push(
                `${label}: text overlaps a control: ${element.textContent.trim()}`
              )
          }
        }
        for (const element of root.querySelectorAll('.mode-label')) {
          if (element.scrollWidth > element.clientWidth + 1)
            problems.push(
              `${label}: button label clipped: ${element.textContent.trim()}`
            )
        }
        for (const icon of root.querySelectorAll('ha-icon')) {
          if (
            icon.icon &&
            icon.shadowRoot?.querySelector('path')?.getAttribute('d') ===
              window.__fallbackIconPath
          )
            problems.push(`${label}: unresolved icon ${icon.icon}`)
        }
        for (let a = 0; a < rectangles.length; a++)
          for (let b = a + 1; b < rectangles.length; b++) {
            const left = rectangles[a],
              right = rectangles[b]
            if (left.element === right.element) continue
            if (
              Math.min(left.rect.right, right.rect.right) -
                Math.max(left.rect.left, right.rect.left) >
                1 &&
              Math.min(left.rect.bottom, right.rect.bottom) -
                Math.max(left.rect.top, right.rect.top) >
                1
            )
              problems.push(`${label}: text cells overlap`)
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
            const physicalPosition = setpointCenter / bodyRect.width
            const setpointPosition =
              getComputedStyle(body).direction === 'rtl'
                ? 1 - physicalPosition
                : physicalPosition
            const entities = root
              .querySelector('.entities')
              ?.getBoundingClientRect()
            const sameRow =
              entities &&
              setpointRect.top < entities.bottom &&
              entities.top < setpointRect.bottom
            if (
              sameRow &&
              (setpointPosition < 0.6 || setpointPosition > 0.85)
            ) {
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
        variant !== 'hidden'
      )
      const group = document.querySelector('simple-thermostat-group')
      const embedded = group?.shadowRoot?.querySelector(
        '.embedded-card-host'
      )?.firstElementChild
      if (!embedded) problems.push('group: missing embedded card')
      else inspectCard(embedded, 'group')
      return problems
    }, fixture.variant)
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
