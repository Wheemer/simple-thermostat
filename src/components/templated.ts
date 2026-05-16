import * as Sqrl from 'squirrelly'
import { html } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import formatNumber from '../formatNumber'
import renderInfoItem from './infoItem'

const renderIcon = (icon) => `<ha-icon icon="${icon}"></ha-icon>`

Sqrl.defaultConfig.autoEscape = false // Turns autoEscaping on
Sqrl.filters.define('icon', renderIcon)
Sqrl.filters.define('join', (arr, delimiter = ', ') => arr.join(delimiter))
Sqrl.filters.define('css', (str, css) => {
  const styles = Object.entries(css).reduce((memo, [key, val]) => {
    return `${memo}${key}:${val};`
  }, '')
  return `<span style="${styles}">${str}</span>`
})

Sqrl.filters.define('debug', (data) => {
  try {
    return JSON.stringify(data)
  } catch {
    return `Not able to read valid JSON object from: ${data}`
  }
})

export function wrapEntities(config, content) {
  const { type, labels: showLabels } =
    config?.layout?.entities ?? config?.layout?.sensors ?? {
      type: 'table',
      labels: true,
    }

  const classes = [
    showLabels ? 'with-labels' : 'without-labels',
    type === 'list' ? 'as-list' : 'as-table',
  ]
  return html` <div class="entities ${classes.join(' ')}">${content}</div> `
}

export default function renderTemplated({
  context,
  entityId,
  template = '{{state.text}}',
  label,
  unit = '',
  hass,
  variables = {},
  config,
  localize,
  openEntityPopover,
}) {
  const { state, attributes } = context

  const [domain] = entityId.split('.')
  const lang = hass.selectedLanguage || hass.language
  const trPrefix = 'ui.card.climate.'
  const translations = Object.entries(hass.resources?.[lang] ?? {}).reduce(
    (memo, [key, value]) => {
      if (key.startsWith(trPrefix)) memo[key.replace(trPrefix, '')] = value
      return memo
    },
    {}
  )

  // Prepare data to inject as variables into the template
  const data = {
    ...attributes,
    state: {
      raw: state,
      text: localize(state, `component.${domain}.state._.`),
    },
    ui: translations,
    v: variables,
  }

  // Need to define these inside the function to be able to reach local scope
  Sqrl.filters.define(
    'formatNumber',
    (str, opts = { decimals: config.decimals }) => {
      return String(
        formatNumber(str, {
          ...opts,
          locale: hass.locale,
        })
      )
    }
  )
  Sqrl.filters.define('relativetime', (str, opts = {}) => {
    return `<ha-relative-time fwd-datetime=${str} with-hass></ha-relative-time>`
  })
  Sqrl.filters.define('translate', (str, prefix = '') => {
    if (!prefix && (domain === 'climate' || domain === 'humidifier')) {
      return localize(str, `state_attributes.${domain}.${str}`)
    }
    return localize(str, prefix)
  })

  const render = (template) => Sqrl.render(template, data, { useWith: true })

  const value = render(template)

  if (
    label === false ||
    (config?.layout?.entities ?? config?.layout?.sensors)?.labels === false
  ) {
    return html`<div class="entity-value">${unsafeHTML(value)}${unit}</div>`
  }

  const safeLabel = label || '{{friendly_name}}'
  const heading = safeLabel.match(/^(mdi|hass):.*/)
    ? renderIcon(safeLabel)
    : render(safeLabel)

  return html`
    <div
      class="entity-heading clickable"
      title=${attributes?.friendly_name || entityId}
      @click=${openEntityPopover ? () => openEntityPopover(entityId) : null}
    >
      ${unsafeHTML(heading)}
    </div>
    <div class="entity-value">${unsafeHTML(value)}</div>
  `
}
