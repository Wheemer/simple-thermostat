import { name as CARD_NAME, version } from '../package.json'
import SimpleThermostatEditor from './editor'
import SimpleThermostatGroupEditor from './group-editor'
import SimpleThermostatGroup from './group'
import SimpleThermostat from './main'

if (!customElements.get(CARD_NAME)) {
  customElements.define(CARD_NAME, SimpleThermostat)
}

if (!customElements.get(`${CARD_NAME}-editor`)) {
  customElements.define(`${CARD_NAME}-editor`, SimpleThermostatEditor)
}

if (!customElements.get(`${CARD_NAME}-group`)) {
  customElements.define(`${CARD_NAME}-group`, SimpleThermostatGroup)
}

if (!customElements.get(`${CARD_NAME}-group-editor`)) {
  customElements.define(`${CARD_NAME}-group-editor`, SimpleThermostatGroupEditor)
}

console.info(
  `%c SIMPLE-THERMOSTAT %c v${version} `,
  'color: var(--text-primary-color); background: var(--primary-color); font-weight: 700; padding: 2px 6px; border-radius: 3px 0 0 3px;',
  'color: var(--primary-color); background: var(--card-background-color); font-weight: 700; padding: 2px 6px; border-radius: 0 3px 3px 0;'
)
const w = window as any
w.customCards = w.customCards || []
if (!w.customCards.find((c: any) => c.type === CARD_NAME)) {
  w.customCards.push({
    type: CARD_NAME,
    name: 'Simple Thermostat',
    preview: true,
    description: 'A different take on the thermostat card',
    documentationURL: 'https://github.com/Wheemer/simple-thermostat',
  })
}
if (!w.customCards.find((c: any) => c.type === `${CARD_NAME}-group`)) {
  w.customCards.push({
    type: `${CARD_NAME}-group`,
    name: 'Simple Thermostat Group',
    preview: true,
    description: 'Switch between multiple thermostat cards in one footprint',
    documentationURL: 'https://github.com/Wheemer/simple-thermostat',
  })
}
