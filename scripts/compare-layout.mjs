import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import * as mdi from '@mdi/js'

const [baseline, candidate = 'simple-thermostat.js'] = process.argv.slice(2)
assert(
  baseline,
  'Supply the downloaded reference release bundle as the first argument'
)
const output = resolve('test-results/layout-comparison')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
let compared = 0
try {
  for (const width of [334, 480, 900]) {
    const results = []
    for (const [name, bundle] of [
      ['baseline', baseline],
      ['candidate', candidate],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      await page.setContent(
        '<style>body{margin:16px;background:#101820;font-family:Arial;color:#f4f6f8;--primary-text-color:#f4f6f8;--secondary-text-color:#b8c0c7;--primary-color:#03a9d9}simple-thermostat{display:block;max-width:700px;margin-bottom:16px}</style>'
      )
      await page.evaluate((icons) => {
        customElements.define(
          'ha-card',
          class extends HTMLElement {
            constructor() {
              super()
              this.attachShadow({ mode: 'open' }).innerHTML =
                '<style>:host{display:block;box-sizing:border-box;background:#18232d}</style><slot></slot>'
            }
          }
        )
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
                '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24"><path/></svg>'
            }
            connectedCallback() {
              if (Object.hasOwn(this, 'icon')) {
                const value = this.icon
                delete this.icon
                this.icon = value
              }
              this.attributeChangedCallback()
            }
            attributeChangedCallback() {
              const key = this.icon
                ?.replace(/^(hass|mdi):/, 'mdi-')
                .replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
              this.shadowRoot
                .querySelector('path')
                .setAttribute('d', icons[key] ?? icons.mdiHelpCircle)
            }
          }
        )
      }, mdi)
      await page.addScriptTag({ path: resolve(bundle) })
      await page.evaluate(async () => {
        for (const enhanced of [true, false])
          for (const step of ['row', 'column'])
            for (const dual of [false, true]) {
              const entity = {
                entity_id: 'climate.room',
                state: dual ? 'heat_cool' : 'heat',
                attributes: {
                  current_temperature: 22,
                  ...(dual
                    ? { target_temp_low: 19, target_temp_high: 24 }
                    : { temperature: 21 }),
                  min_temp: 7,
                  max_temp: 35,
                  hvac_modes: ['off', 'heat', 'cool'],
                  hvac_action: 'heating',
                },
              }
              const card = document.createElement('simple-thermostat')
              card.setConfig({
                entity: entity.entity_id,
                enhanced_visuals: enhanced,
                header: {
                  name: `${enhanced ? 'Enhanced' : 'Classic'} / ${step} / ${dual ? 'Dual' : 'Single'}`,
                },
                layout: { step, mode: { headings: false } },
                control: {
                  hvac: {
                    off: { name: 'Off' },
                    heat: { name: 'Heat' },
                    cool: { name: 'Cool' },
                  },
                },
              })
              card.hass = {
                states: { [entity.entity_id]: entity },
                config: { unit_system: { temperature: '°C' } },
                locale: { language: 'en' },
                localize: (key) => key.split('.').at(-1),
                callService: () => {},
              }
              document.body.append(card)
              await card.updateComplete
            }
      })
      await page.waitForTimeout(100)
      results.push(
        await page.evaluate(() =>
          [...document.querySelectorAll('simple-thermostat')].map((card) => {
            const origin = card.getBoundingClientRect()
            return [
              ...card.shadowRoot.querySelectorAll(
                '.body, .entities, .entity-heading, .entity-value, .current-wrapper, .mode-item'
              ),
            ].map((element) => {
              const r = element.getBoundingClientRect()
              return {
                className: element.className,
                box: [r.x - origin.x, r.y - origin.y, r.width, r.height],
              }
            })
          })
        )
      )
      await page.screenshot({
        path: resolve(output, `${width}-${name}.png`),
        fullPage: true,
      })
      await page.close()
    }
    assert.equal(results[0].length, results[1].length)
    results[0].forEach((elements, cardIndex) => {
      assert.equal(elements.length, results[1][cardIndex].length)
      elements.forEach((element, index) => {
        const actual = results[1][cardIndex][index]
        assert.equal(actual.className, element.className)
        element.box.forEach((value, axis) =>
          assert(
            Math.abs(value - actual.box[axis]) < 0.5,
            `${width}px card ${cardIndex} ${element.className}: axis ${axis} changed from ${value} to ${actual.box[axis]}`
          )
        )
      })
      compared++
    })
  }
} finally {
  await browser.close()
}
console.log(
  `${compared} layout comparisons match the reference within 0.5px. This checks appearance preservation, not absence of pre-existing defects.`
)
