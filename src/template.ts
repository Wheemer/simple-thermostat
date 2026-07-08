import * as Sqrl from 'squirrelly'
import formatNumber from './formatNumber'
import { LooseObject } from './types'

Sqrl.defaultConfig.autoEscape = false

Sqrl.filters.define('icon', (icon) => `<ha-icon icon="${icon}"></ha-icon>`)
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

interface RenderTemplateOptions {
  template: string
  stateObj: LooseObject
  attribute?: string
  hass: LooseObject
  config?: LooseObject
  variables?: LooseObject
  localize?: (label: string, prefix?: string) => string
}

export function renderTemplate({
  template,
  stateObj,
  attribute,
  hass,
  config = {},
  variables = {},
  localize = (label) => label,
}: RenderTemplateOptions) {
  const [domain] = String(stateObj?.entity_id ?? '').split('.')
  const attributes = stateObj?.attributes ?? {}
  const rawState =
    attribute && Object.prototype.hasOwnProperty.call(attributes, attribute)
      ? attributes[attribute]
      : stateObj?.state
  const textState =
    attribute && typeof hass.formatEntityAttributeValue === 'function'
      ? hass.formatEntityAttributeValue(stateObj, attribute)
      : typeof hass.formatEntityState === 'function'
        ? hass.formatEntityState(stateObj)
        : localize(String(rawState), `component.${domain}.state._.`)
  const lang = hass.selectedLanguage || hass.language
  const translationPrefix = 'ui.card.climate.'
  const translations = Object.entries(hass.resources?.[lang] ?? {}).reduce(
    (memo, [key, value]) => {
      if (String(key).startsWith(translationPrefix)) {
        memo[String(key).replace(translationPrefix, '')] = value
      }
      return memo
    },
    {} as LooseObject
  )

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
  Sqrl.filters.define('relativetime', (str) => {
    return `<ha-relative-time fwd-datetime=${str} with-hass></ha-relative-time>`
  })
  Sqrl.filters.define('translate', (str, prefix = '') => {
    if (
      !prefix &&
      typeof hass.formatEntityAttributeValue === 'function' &&
      typeof str === 'string' &&
      str in attributes
    ) {
      return hass.formatEntityAttributeValue(stateObj, str)
    }

    if (!prefix && (domain === 'climate' || domain === 'humidifier')) {
      return localize(str, `state_attributes.${domain}.${str}`)
    }

    return localize(str, prefix)
  })

  return Sqrl.render(
    template,
    {
      ...attributes,
      state: {
        raw: rawState,
        text: textState,
      },
      state_attr: (entityId: string, attr: string) =>
        hass.states?.[entityId]?.attributes?.[attr],
      ui: translations,
      v: variables,
    },
    { useWith: true }
  )
}
