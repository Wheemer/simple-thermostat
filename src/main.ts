import { LitElement, html, nothing } from 'lit'
import { property } from 'lit/decorators.js'
import { name as CARD_NAME } from '../package.json'

import { getAdapter, EntityAdapter } from './adapters'
import isEqual from './isEqual'
import styles from './styles.css'
import sortHvacModes from './sortHvacModes'
import sortFanModes from './sortFanModes'
import getFanModeIcon from './fanModeIcon'

import formatNumber from './formatNumber'
import fireEvent from './fireEvent'
import renderHeader from './components/header'
import renderEntities from './components/entities'
import renderModeType from './components/modeType'
import { getEntityAction } from './entityAction'
import normalizeConfig from './config/normalize'

import parseHeader, {
  getModeIcon,
  getModeName,
  HeaderData,
} from './config/header'
import parseSetpoints from './config/setpoints'
import parseService, { Service } from './config/service'

import { CardConfig, ModeValue, ModeControlObject, MODES } from './config/card'

import { ControlMode, LooseObject, Entity, HASS, HVAC_MODES } from './types'

const SETPOINT_DEBOUNCE_TIMEOUT = 500
const STEP_SIZE = 0.5
const DECIMALS = 1
const UPDATING_TIMEOUT = 10000

const MODE_TYPES: Array<string> = Object.values(MODES)

const ICONS = {
  UP: 'hass:chevron-up',
  DOWN: 'hass:chevron-down',
  PLUS: 'mdi:plus',
  MINUS: 'mdi:minus',
}

const DEFAULT_HIDE = {
  temperature: false,
  state: false,
}

const CONTROL_ORDER = [
  MODES.PRESET,
  MODES.FAN,
  MODES.HVAC,
  MODES.SWING,
  MODES.SWING_HORIZONTAL,
  MODES.SWING_VERTICAL,
  MODES.VANE_HORIZONTAL,
  MODES.VANE_VERTICAL,
  MODES.DIRECTION,
  MODES.OSCILLATING,
  MODES.STATE,
]
const CONTROL_METADATA_KEYS = ['entity', 'hide_when_off', 'hide_off_when_off']

function getConfiguredEntities(config: CardConfig) {
  return config.entities ?? []
}

function shouldShowModeControl(
  type: string,
  modeOption: string | boolean,
  config: Partial<ModeControlObject>
) {
  const modeKey = String(modeOption)
  const configuredMode = getConfiguredModeValue(modeKey, config)

  if (isModeValue(configuredMode)) {
    return configuredMode.include !== false
  }

  const hasExplicitConfig = Object.keys(config).some(
    (key) => !key.startsWith('_')
  )
  const hideUnlistedModes = type === MODES.PRESET

  return configuredMode ?? !(hideUnlistedModes && hasExplicitConfig)
}

function normalizeModeConfigKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_')
}

function getConfiguredModeValue(
  modeKey: string,
  specification: Partial<ModeControlObject>
) {
  const normalizedModeKey = normalizeModeConfigKey(modeKey)
  const exactValue = specification[modeKey]

  if (typeof exactValue !== 'undefined') return exactValue
  if (typeof specification[normalizedModeKey] !== 'undefined') {
    return specification[normalizedModeKey]
  }

  const matchingEntry = Object.entries(specification).find(
    ([key]) =>
      !key.startsWith('_') &&
      !CONTROL_METADATA_KEYS.includes(key) &&
      normalizeModeConfigKey(key) === normalizedModeKey
  )

  return matchingEntry?.[1]
}

function isModeValue(value: unknown): value is ModeValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getOrderedModeOptions(
  modeOptions: Array<string | boolean>,
  specification: Partial<ModeControlObject>
) {
  const configuredKeys = Array.isArray(specification._order)
    ? specification._order.map(String)
    : Object.keys(specification).filter(
        (key) => !key.startsWith('_') && !CONTROL_METADATA_KEYS.includes(key)
      )
  if (configuredKeys.length === 0) return modeOptions

  const optionsByKey = new Map<string, string | boolean>()
  modeOptions.forEach((modeOption) => {
    optionsByKey.set(normalizeModeConfigKey(String(modeOption)), modeOption)
  })

  const usedKeys = new Set<string>()
  const orderedOptions: Array<string | boolean> = []

  configuredKeys.forEach((key) => {
    const normalizedKey = normalizeModeConfigKey(key)
    if (!optionsByKey.has(normalizedKey) || usedKeys.has(normalizedKey)) return

    orderedOptions.push(optionsByKey.get(normalizedKey))
    usedKeys.add(normalizedKey)
  })

  modeOptions.forEach((modeOption) => {
    const normalizedKey = normalizeModeConfigKey(String(modeOption))
    if (usedKeys.has(normalizedKey)) return

    orderedOptions.push(modeOption)
    usedKeys.add(normalizedKey)
  })

  return orderedOptions
}

function getModeList(
  type: string,
  attributes: LooseObject,
  adapter,
  specification: Partial<ModeControlObject> = {}
) {
  let modeOptions = attributes[adapter.getModeAttribute(type)]
  if (type === MODES.STATE) {
    modeOptions = ['off', 'on']
  } else if (type === MODES.DIRECTION && attributes.direction) {
    modeOptions = ['forward', 'reverse']
  } else if (
    type === MODES.OSCILLATING &&
    typeof attributes.oscillating === 'boolean'
  ) {
    modeOptions = [false, true]
  }
  if (!Array.isArray(modeOptions)) {
    return []
  }

  return getOrderedModeOptions(modeOptions, specification)
    .filter((modeOption) =>
      shouldShowModeControl(type, modeOption, specification)
    )
    .map((modeOption) => {
      const modeKey = String(modeOption)
      const configuredMode = getConfiguredModeValue(modeKey, specification)
      const values: ModeValue = isModeValue(configuredMode)
        ? configuredMode
        : {}
      const { name: configuredName, ...modeValues } = values
      const hideWhenOff =
        values.hide_when_off === true ||
        (specification.hide_off_when_off === true &&
          normalizeModeConfigKey(modeKey) === 'off')
      const name: string | false =
        configuredName === false
          ? false
          : typeof configuredName === 'string'
            ? configuredName
            : getModeName(modeKey)

      return {
        ...modeValues,
        hide_when_off: hideWhenOff || undefined,
        icon:
          values.icon ??
          (type === MODES.FAN
            ? getFanModeIcon(modeKey, modeOptions)
            : undefined) ??
          getModeIcon(modeKey),
        iconConfigured: typeof values.icon !== 'undefined',
        value: modeKey,
        name,
      }
    })
}

function isSelectModeEntity(stateObj: LooseObject | undefined): boolean {
  return (
    typeof stateObj?.entity_id === 'string' &&
    stateObj.entity_id.startsWith('select.') &&
    Array.isArray(stateObj.attributes?.options)
  )
}

function getModeListFromSelect(
  stateObj: LooseObject,
  specification: Partial<ModeControlObject> = {}
) {
  const modeOptions = stateObj.attributes.options as Array<string | boolean>

  return getOrderedModeOptions(modeOptions, specification)
    .filter((modeOption) =>
      shouldShowModeControl('select', modeOption, specification)
    )
    .map((modeOption) => {
      const modeKey = String(modeOption)
      const configuredMode = getConfiguredModeValue(modeKey, specification)
      const values: ModeValue = isModeValue(configuredMode)
        ? configuredMode
        : {}
      const { name: configuredName, ...modeValues } = values
      const hideWhenOff =
        values.hide_when_off === true ||
        (specification.hide_off_when_off === true &&
          normalizeModeConfigKey(modeKey) === 'off')
      const name: string | false =
        configuredName === false
          ? false
          : typeof configuredName === 'string'
            ? configuredName
            : getModeName(modeKey)

      return {
        ...modeValues,
        hide_when_off: hideWhenOff || undefined,
        icon: values.icon ?? getModeIcon(modeKey),
        iconConfigured: typeof values.icon !== 'undefined',
        value: modeKey,
        name,
      }
    })
}

function getCardStyle(entityDomain: string, attributes: LooseObject) {
  if (entityDomain !== 'fan') return ''

  const percentage = Number(attributes?.percentage)
  if (Number.isNaN(percentage)) return ''

  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100)
  const fanSpinDuration = Math.max(
    0.9,
    3.2 - (normalizedPercentage / 100) * 2.1
  )

  return `--st-fan-spin-duration: ${fanSpinDuration.toFixed(2)}s;`
}

function getCardModSurfaceDeclarations(cardMod: unknown) {
  const style = (cardMod as LooseObject | undefined)?.style
  if (typeof style === 'object' && style) {
    const cardStyle = (style as LooseObject)['ha-card']
    if (typeof cardStyle === 'string') return cardStyle.trim()

    const rootStyle = (style as LooseObject)['.']
    if (typeof rootStyle === 'string') {
      const rootMatch = rootStyle.match(/ha-card\s*\{([\s\S]*?)\}/)
      return (rootMatch?.[1] ?? '').trim()
    }
  }

  if (typeof style !== 'string') return ''

  const match = style.match(/ha-card\s*\{([\s\S]*?)\}/)
  return (match?.[1] ?? '').trim()
}

function getInlineCardStyle(
  config: CardConfig,
  entityDomain: string,
  attributes: LooseObject
) {
  return [
    getCardModSurfaceDeclarations((config as LooseObject).card_mod),
    getCardStyle(entityDomain, attributes),
  ]
    .filter((style) => !!style)
    .join('; ')
}

function supportsModeType(
  type: string,
  entityDomain: string,
  attributes: LooseObject,
  adapter: EntityAdapter
) {
  return (
    MODE_TYPES.includes(type) &&
    (type === MODES.STATE
      ? entityDomain === 'fan' || entityDomain === 'humidifier'
      : typeof attributes[adapter.getModeAttribute(type)] !== 'undefined')
  )
}

function buildBasicControlModes(
  items: Array<string>,
  entityDomain: string,
  attributes: LooseObject,
  adapter: EntityAdapter
) {
  return items
    .filter((type) => supportsModeType(type, entityDomain, attributes, adapter))
    .map((type: string) => ({
      type,
      hide_when_off: false,
      list: getModeList(type, attributes, adapter),
    }))
}

function buildConfiguredControlModes(
  config: CardConfig,
  entityDomain: string,
  attributes: LooseObject,
  adapter: EntityAdapter,
  hass?: HASS
): Array<Partial<ControlMode>> {
  if (config.control === false) return []

  if (Array.isArray(config.control)) {
    return buildBasicControlModes(
      config.control,
      entityDomain,
      attributes,
      adapter
    )
  }

  if (config.control && typeof config.control === 'object') {
    const controlConfig = config.control
    const configuredEntries = Object.entries(config.control).filter(
      ([type]) => !type.startsWith('_')
    )
    const configuredOrder = Array.isArray(controlConfig._order)
      ? controlConfig._order.map(String)
      : undefined
    const orderedTypes = configuredOrder
      ? [
          ...configuredOrder.filter((type) =>
            configuredEntries.some(([entryType]) => entryType === type)
          ),
          ...configuredEntries
            .map(([type]) => type)
            .filter((type) => !configuredOrder.includes(type)),
        ]
      : configuredEntries.map(([type]) => type)
    const entries = orderedTypes.map(
      (type) =>
        [type, controlConfig[type] as ModeControlObject | true | false] as [
          string,
          ModeControlObject | true | false,
        ]
    )
    if (entries.length > 0) {
      return entries
        .filter(([, definition]) => definition !== false)
        .filter(([type, definition]) => {
          const controlEntity =
            definition === true || definition === false
              ? undefined
              : definition.entity
          const selectState = controlEntity
            ? hass?.states?.[controlEntity]
            : undefined

          return (
            isSelectModeEntity(selectState) ||
            supportsModeType(type, entityDomain, attributes, adapter)
          )
        })
        .map(([type, definition]: [string, ModeControlObject | true]) => {
          const {
            _name,
            _hide_when_off,
            hide_when_off,
            hide_off_when_off,
            _icons,
            _heading,
            entity: controlEntity,
            ...controlField
          } = definition === true ? {} : definition
          const selectState = controlEntity
            ? hass?.states?.[controlEntity]
            : undefined
          const useSelectEntity = isSelectModeEntity(selectState)
          const modeSpecification = {
            ...controlField,
            ...(hide_off_when_off === true ? { hide_off_when_off } : {}),
          }

          return {
            type,
            entity: useSelectEntity ? controlEntity : undefined,
            hide_when_off: hide_when_off ?? _hide_when_off,
            icons: _icons,
            heading: _heading,
            name: _name,
            preserve_option_order: Object.keys(controlField).length > 0,
            list: useSelectEntity
              ? getModeListFromSelect(selectState, modeSpecification)
              : getModeList(type, attributes, adapter, modeSpecification),
          }
        })
    }
  }

  return buildBasicControlModes(
    adapter.getDefaultControl(),
    entityDomain,
    attributes,
    adapter
  )
}

function removeOffFromSecondaryModes(
  controlModes: Array<Partial<ControlMode>>
) {
  if (!controlModes.some(({ type }) => type === MODES.STATE)) {
    return controlModes
  }

  return controlModes.map((mode) =>
    mode.type && mode.type !== MODES.STATE
      ? {
          ...mode,
          list: mode.list?.filter(({ value }) => value !== 'off') ?? [],
        }
      : mode
  )
}

function sortControlModes(
  controlModes: Array<Partial<ControlMode>>,
  entityDomain: string
) {
  if (entityDomain !== 'fan' && entityDomain !== 'climate') return controlModes

  const getControlOrder = (type: string) => {
    const index = CONTROL_ORDER.indexOf(type as MODES)
    return index === -1 ? CONTROL_ORDER.length : index
  }

  return [...controlModes].sort(
    (a, b) => getControlOrder(a.type) - getControlOrder(b.type)
  )
}

function shouldPreserveConfiguredControlOrder(control: CardConfig['control']) {
  if (Array.isArray(control)) return true
  if (!control || typeof control !== 'object') return false

  return Array.isArray(control._order)
}

interface Values {
  [key: string]: number | string | null
}

interface SetpointRenderOptions {
  field: string
  value: number | string | null
  minValue: number | null
  maxValue: number | null
  unit: string | boolean
  row: boolean
  stepLayout: string
  isOff: boolean
  disableSteppers: boolean
}

export default class SimpleThermostat extends LitElement {
  static get styles() {
    return styles
  }

  @property()
  config: CardConfig
  @property()
  header: false | HeaderData
  @property()
  service: Service
  @property()
  modes: Array<ControlMode> = []
  _hass: HASS = {}
  @property()
  entity: LooseObject
  @property()
  entities: Array<Entity> = []
  @property()
  showEntities: boolean = true
  @property()
  name: string | false = ''
  stepSize = STEP_SIZE
  @property({
    type: Object,
  })
  _values: Values = {}
  @property()
  _updatingValues: boolean = false
  @property()
  _hide = DEFAULT_HIDE
  _updatingValuesTimeout: ReturnType<typeof setTimeout> | null = null
  _holdTimer: ReturnType<typeof setTimeout> | null = null
  _holdFired = false
  _clickCount = 0
  _clickTimer: ReturnType<typeof setTimeout> | null = null
  _setpointUpdateTimer: ReturnType<typeof setTimeout> | null = null
  _pendingSetpointValues: object | null = null
  static HOLD_MS = 500
  static DOUBLE_TAP_MS = 250

  _setpointDebounce = SETPOINT_DEBOUNCE_TIMEOUT

  _sendSetpointValues(values: object) {
    const { domain, service, data = {} } = this.service
    this._callAction(`${domain}.${service}`, {
      entity_id: this.config.entity,
      ...data,
      ...values,
    })
  }

  _scheduleSetpointValues(values: object) {
    const wait = this._setpointDebounce

    if (wait <= 0) {
      this._sendSetpointValues(values)
      return
    }

    this._pendingSetpointValues = { ...values }
    if (this._setpointUpdateTimer) {
      clearTimeout(this._setpointUpdateTimer)
    }
    this._setpointUpdateTimer = setTimeout(() => {
      const pendingValues = this._pendingSetpointValues
      this._setpointUpdateTimer = null
      this._pendingSetpointValues = null
      if (pendingValues) {
        this._sendSetpointValues(pendingValues)
      }
    }, wait)
  }

  _getSetpointDebounce(config: CardConfig) {
    const value = Number(
      config?.setpoint_debounce_ms ?? SETPOINT_DEBOUNCE_TIMEOUT
    )
    return Number.isFinite(value) && value >= 0
      ? value
      : SETPOINT_DEBOUNCE_TIMEOUT
  }

  _callAction(action: string, data: object) {
    if (typeof this._hass.callService === 'function') {
      const [domain, service] = action.split('.')
      this._hass.callService(domain, service, data)
    } else if (typeof this._hass.performAction === 'function') {
      this._hass.performAction({ action, data })
    }
  }

  static getConfigElement() {
    return window.document.createElement(`${CARD_NAME}-editor`)
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass.states ?? {}).find(
      (id) =>
        id.startsWith('climate.') ||
        id.startsWith('fan.') ||
        id.startsWith('humidifier.')
    )
    return { entity: entity ?? '' }
  }

  setConfig(config: CardConfig) {
    this.config = normalizeConfig({
      decimals: DECIMALS,
      ...config,
    })
    const setpointDebounce = this._getSetpointDebounce(this.config)
    if (setpointDebounce !== this._setpointDebounce) {
      this._setpointDebounce = setpointDebounce
    }
    this.entities = []
    this.showEntities = true
    this.toggleAttribute('embedded', this.config.embedded === true)
    if (this._hass?.states) {
      this.updateFromHass(this._hass)
    }
  }

  set hass(hass: HASS) {
    if (hass?.states) {
      this._hass = hass
    }

    if (!this.config?.entity) {
      return
    }

    if (!hass?.states) {
      return
    }

    const entity = hass.states[this.config.entity]
    if (!entity) {
      return
    }

    this.updateFromHass(hass)
  }

  disconnectedCallback() {
    if (this._updatingValuesTimeout) {
      clearTimeout(this._updatingValuesTimeout)
      this._updatingValuesTimeout = null
    }

    if (this._holdTimer) {
      clearTimeout(this._holdTimer)
      this._holdTimer = null
    }

    if (this._clickTimer) {
      clearTimeout(this._clickTimer)
      this._clickTimer = null
    }

    if (this._setpointUpdateTimer) {
      clearTimeout(this._setpointUpdateTimer)
      this._setpointUpdateTimer = null
    }
    this._pendingSetpointValues = null
    super.disconnectedCallback()
  }

  updateFromHass(hass: HASS) {
    const entity = hass.states[this.config.entity]

    if (this.entity !== entity) {
      this.entity = entity
    }

    const adapter = getAdapter(this.config.entity)
    this.header = parseHeader(
      this.config.header,
      entity,
      hass,
      this.config.enhanced_visuals !== false
    )
    this.service = parseService(this.config?.service ?? false, adapter)

    const attributes = entity.attributes
    let values = parseSetpoints(
      this.config?.setpoints ?? null,
      attributes,
      adapter,
      entity.state
    )

    if (this._updatingValues && isEqual(values, this._values)) {
      this._updatingValues = false
      if (this._updatingValuesTimeout) {
        clearTimeout(this._updatingValuesTimeout)
        this._updatingValuesTimeout = null
      }
    } else if (!this._updatingValues) {
      this._values = values
    }

    const entityDomain = this.config.entity.split('.')[0]
    const configuredControlModes = removeOffFromSecondaryModes(
      buildConfiguredControlModes(
        this.config,
        entityDomain,
        attributes,
        adapter,
        hass
      )
    )
    const controlModes = shouldPreserveConfiguredControlOrder(
      this.config.control
    )
      ? configuredControlModes
      : sortControlModes(configuredControlModes, entityDomain)

    this.modes = controlModes.map((values) => {
      const list = values.preserve_option_order
        ? values.list
        : values.type === MODES.HVAC
          ? sortHvacModes(values.list)
          : values.type === MODES.FAN
            ? sortFanModes(values.list)
            : values.list
      const mode =
        values.entity && hass.states?.[values.entity]
          ? hass.states[values.entity].state
          : values.type === MODES.HVAC || values.type === MODES.STATE
            ? entity.state
            : attributes[adapter.getModePayloadKey(values.type)]

      return { ...values, list, mode } as ControlMode
    })

    const { step: rangeStep } = adapter.getRange(attributes)
    this.stepSize = Number(this.config.step_size ?? rangeStep ?? STEP_SIZE)

    this._hide = { ...DEFAULT_HIDE, ...(this.config.hide ?? {}) }

    const configuredEntities = getConfiguredEntities(this.config)

    if (configuredEntities === false) {
      this.showEntities = false
      this.entities = []
    } else if (configuredEntities) {
      this.showEntities = true
      this.entities = configuredEntities.map(
        ({ name, entity, attribute, template, unit = '', ...rest }) => {
          let state
          const names = [name]
          if (entity) {
            state = hass.states[entity]
            names.push(state?.attributes?.friendly_name)
            if (attribute && !template) {
              state = state?.attributes?.[attribute]
            }
          } else if (attribute && attribute in (this.entity.attributes ?? {})) {
            state = template ? this.entity : this.entity.attributes[attribute]
            names.push(attribute)
          }
          names.push(entity)

          return {
            ...rest,
            name: names.find((n) => !!n),
            state,
            entity,
            attribute,
            template,
            unit,
          } as Entity
        }
      )
    } else {
      this.showEntities = true
      this.entities = []
    }
  }

  localize = (label: string, prefix = '') => {
    const key = `${prefix}${label}`
    return this._hass.localize?.(key) || label
  }

  render({ _hide, _values, _updatingValues, config, entity } = this) {
    if (!config) {
      return html`<ha-card class="loading"></ha-card>`
    }

    const warnings = []
    if (this.stepSize < 1 && this.config.decimals === 0) {
      warnings.push(html`
        <ha-alert alert-type="warning">
          Decimals is set to 0 and step_size is lower than 1. Decrementing a
          setpoint will likely not work. Change one of the settings to clear
          this warning.
        </ha-alert>
      `)
    }

    if (!entity && !this._hass?.states) {
      return html`<ha-card
        class="loading ${config.enhanced_visuals === false
          ? 'standard-visuals'
          : ''}"
      ></ha-card>`
    }

    if (!entity) {
      return html`
        <ha-card
          class="missing-entity ${config.enhanced_visuals === false
            ? 'standard-visuals'
            : ''}"
        >
          <ha-alert alert-type="error">
            Entity not available: ${config.entity}
          </ha-alert>
        </ha-card>
      `
    }

    const adapter = getAdapter(config.entity)
    const action = getEntityAction(entity)
    const { min: minValue, max: maxValue } = adapter.getRange(entity.attributes)
    const unit = this.getUnit()
    const entityDomain = config.entity.split('.')[0]
    const setpointCount = Object.keys(_values).length
    const configuredStepLayout = this.config?.layout?.step
    const compactDualEntitySetpoints =
      !configuredStepLayout && this.showEntities && setpointCount > 1
    const stepLayout =
      configuredStepLayout ??
      (this.config.enhanced_visuals === false || compactDualEntitySetpoints
        ? 'column'
        : 'row')
    const row = stepLayout === 'row'
    const isUnavailable = ['unavailable', 'unknown'].includes(entity.state)
    const safeClass = (value: unknown) =>
      typeof value === 'string' ? value.replace(/[^a-z0-9_-]/gi, '') : ''
    const classes = [
      !this.header && 'no-header',
      `domain-${safeClass(entityDomain)}`,
      `state-${safeClass(entity.state)}`,
      this.config.enhanced_visuals === false && 'standard-visuals',
      this.config.embedded === true && 'embedded',
      safeClass(action),
      isUnavailable && safeClass(entity.state),
    ].filter((cx) => !!cx)
    const bodyClasses = [
      'body',
      this.showEntities && 'has-entities',
      `step-${stepLayout}`,
      `setpoint-count-${setpointCount}`,
    ].filter((cx) => !!cx)
    const embedded = config.embedded === true
    const cardStyle = embedded
      ? getInlineCardStyle(config, entityDomain, entity.attributes)
      : getCardStyle(entityDomain, entity.attributes)
    const entitiesHtml = this.showEntities
      ? renderEntities({
          _hide,
          unit,
          hass: this._hass,
          entity: this.entity,
          entities: this.entities,
          config: this.config,
          adapter,
          localize: this.localize,
          openEntityPopover: this.openEntityPopover,
        })
      : ''
    const headerHtml = embedded
      ? html`<div class="embedded-header-reserve" aria-hidden="true"></div>`
      : renderHeader({
          header: this.header,
          hass: this._hass,
          toggleEntityChanged: this.toggleEntityChanged,
          entity: this.entity,
          openEntityPopover: this.openEntityPopover,
        })
    return html`
      <ha-card class="${classes.join(' ')}" style=${cardStyle}>
        ${config.styles
          ? html`<style>
              ${config.styles}
            </style>`
          : nothing}
        ${warnings}
        ${headerHtml}
        <section class="${bodyClasses.join(' ')}">
          ${entitiesHtml}
          ${this.renderSetpoints({
            values: _values,
            minValue,
            maxValue,
            unit,
            row,
            stepLayout,
            isOff: entity.state === HVAC_MODES.OFF,
            disableSteppers:
              entityDomain === 'climate' &&
              entity.state === HVAC_MODES.OFF &&
              this.config.disable_setpoint_change_when_off === true,
          })}
        </section>

        ${this.modes.length
          ? html`
              <section class="controls">
                ${this.modes.map((mode) =>
                  renderModeType({
                    state: entity.state,
                    entity,
                    hass: this._hass,
                    mode,
                    adapter,
                    localize: this.localize,
                    modeOptions: this.config?.layout?.mode ?? {},
                    setMode: this.setMode,
                  })
                )}
              </section>
            `
          : nothing}
      </ha-card>
    `
  }

  toggleEntityChanged = (ev: Event, entityId?: string) => {
    if (!this.header || !entityId) return

    const el = ev.target as HTMLInputElement
    this._callAction(`homeassistant.turn_${el.checked ? 'on' : 'off'}`, {
      entity_id: entityId,
    })
  }

  renderSetpoints({
    values,
    minValue,
    maxValue,
    unit,
    row,
    stepLayout,
    isOff,
    disableSteppers,
  }: {
    values: Values
    minValue: number | null
    maxValue: number | null
    unit: string | boolean
    row: boolean
    stepLayout: string
    isOff: boolean
    disableSteppers: boolean
  }) {
    if (
      this.config.hide_setpoint === true ||
      (this.config.hide_setpoint_when_off === true && isOff) ||
      (this.config.hide?.setpoint_when_off === true && isOff)
    ) {
      return nothing
    }

    return Object.entries(values).map(([field, value]) =>
      this.renderSetpointControl({
        field,
        value,
        minValue,
        maxValue,
        unit,
        row,
        stepLayout,
        isOff,
        disableSteppers,
      })
    )
  }

  renderSetpointControl(options: SetpointRenderOptions) {
    const { row, stepLayout } = options
    const decreaseButton = this.renderSetpointStepper(options, 'decrease')
    const valueButton = this.renderSetpointValue(options)
    const increaseButton = this.renderSetpointStepper(options, 'increase')
    const label = this.renderSetpointLabel(options)

    return html`
      <div class="current-wrapper ${stepLayout}">
        ${row
          ? html`${decreaseButton}${valueButton}${increaseButton}`
          : html`${increaseButton}${valueButton}${decreaseButton}`}
        ${label}
      </div>
    `
  }

  renderSetpointLabel({ field }: SetpointRenderOptions) {
    if (this.config.hide?.setpoint_label === true) return nothing

    const configuredLabel = this.config.label?.setpoint
    const label =
      configuredLabel ??
      this._hass.localize?.(
        `ui.card.${getAdapter(this.config.entity).getLocalizationDomain()}.target`
      ) ??
      this._hass.localize?.('ui.card.climate.target_temperature') ??
      this.localize(field, 'state_attributes.climate.')

    return html`<div class="current--label">${label}</div>`
  }

  renderSetpointStepper(
    {
      field,
      value,
      minValue,
      maxValue,
      row,
      disableSteppers,
    }: SetpointRenderOptions,
    direction: 'increase' | 'decrease'
  ) {
    const numericValue = Number(value)
    const hasNumericValue = !Number.isNaN(numericValue)
    const decreasing = direction === 'decrease'
    const disabled =
      disableSteppers ||
      (decreasing
        ? value === null ||
          (minValue !== null && hasNumericValue && numericValue <= minValue)
        : (value === null && minValue === null) ||
          (value !== null &&
            maxValue !== null &&
            hasNumericValue &&
            numericValue >= maxValue))
    const icon = decreasing
      ? row
        ? ICONS.MINUS
        : ICONS.DOWN
      : row
        ? ICONS.PLUS
        : ICONS.UP

    return html`
      <button
        type="button"
        ?disabled=${disabled}
        class="thermostat-trigger ${direction}"
        aria-label=${`${decreasing ? 'Decrease' : 'Increase'} ${field}`}
        @click="${() =>
          decreasing
            ? this.setTemperature(-this.stepSize, field)
            : value === null && minValue !== null
              ? this.setTemperature(0, field, minValue)
              : this.setTemperature(this.stepSize, field)}"
      >
        <ha-icon .icon=${icon}></ha-icon>
      </button>
    `
  }

  renderSetpointValue({ field, value, unit, isOff }: SetpointRenderOptions) {
    const hasValue =
      ['string', 'number'].includes(typeof value) &&
      value !== '' &&
      value !== null
    const showUnit = unit !== false && hasValue
    const showOffFallback = isOff && !hasValue
    const displayValue = showOffFallback
      ? 'OFF'
      : formatNumber(value, {
          ...this.config,
          locale: this._hass.locale,
        })
    const unitText = showUnit && typeof unit === 'string' ? unit : ''
    const unitSeparator = unitText === '%' ? '' : ' '
    const valueText =
      unitText && displayValue.endsWith(unitText)
        ? displayValue.slice(0, -unitText.length).trimEnd()
        : displayValue
    const displayWithUnit = unitText
      ? `${valueText}${unitSeparator}${unitText}`
      : displayValue

    return html`
      <h3
        @pointerdown=${this._onActionPointerDown}
        @pointerup=${this._onActionPointerUp}
        @pointercancel=${this._onActionPointerUp}
        @click=${this._onActionClick}
        @keydown=${this._onSetpointKeyDown}
        role="button"
        tabindex="0"
        aria-label=${`${field}: ${displayWithUnit}`}
        class=${[
          'current--value',
          showOffFallback && 'current--off',
          this._updatingValues && 'updating',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        ${valueText}${unitText
          ? html`${unitSeparator}<span class="current--unit">${unitText}</span>`
          : nothing}
      </h3>
    `
  }

  setTemperature(change: number, field: string, baseValue?: number) {
    this._updatingValues = true
    if (this._updatingValuesTimeout) {
      clearTimeout(this._updatingValuesTimeout)
    }
    this._updatingValuesTimeout = setTimeout(() => {
      this._updatingValues = false
      this._updatingValuesTimeout = null
    }, UPDATING_TIMEOUT)
    const previousValue = baseValue ?? this._values[field]
    const newValue = Number(previousValue) + change
    const { decimals } = this.config

    this._values = {
      ...this._values,
      [field]: +formatNumber(newValue, { decimals }),
    }
    this._scheduleSetpointValues(this._values)
  }

  setMode = (type: string, mode: string) => {
    if (type && mode) {
      const adapter = getAdapter(this.config.entity)
      if (type === MODES.STATE) {
        this._callAction(`${adapter.getLocalizationDomain()}.turn_${mode}`, {
          entity_id: this.config.entity,
        })
        fireEvent(this, 'haptic', 'light')
        return
      }
      const configuredMode = this.modes.find((mode) => mode.type === type)
      if (configuredMode?.entity) {
        this._callAction('select.select_option', {
          entity_id: configuredMode.entity,
          option: mode,
        })
        fireEvent(this, 'haptic', 'light')
        return
      }
      const value = adapter.transformModePayloadValue?.(type, mode) ?? mode
      this._callAction(
        `${adapter.getLocalizationDomain()}.${adapter.getModeService(type)}`,
        {
          entity_id: this.config.entity,
          [adapter.getModePayloadKey(type)]: value,
        }
      )
      fireEvent(this, 'haptic', 'light')
    } else {
      fireEvent(this, 'haptic', 'failure')
    }
  }

  openEntityPopover = (entityId = null) => {
    fireEvent(this, 'hass-more-info', {
      entityId: entityId || this.config.entity,
    })
  }

  _onActionPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    this._holdFired = false
    if (this._holdTimer) clearTimeout(this._holdTimer)
    this._holdTimer = setTimeout(() => {
      this._holdFired = true
      this._holdTimer = null
      this._dispatchAction('hold')
    }, SimpleThermostat.HOLD_MS)
  }

  _onActionPointerUp = () => {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer)
      this._holdTimer = null
    }
  }

  _onActionClick = (e: MouseEvent) => {
    e.preventDefault()
    if (this._holdFired) {
      this._holdFired = false
      return
    }
    this._clickCount += 1
    if (this._clickCount === 1) {
      if (this._clickTimer) clearTimeout(this._clickTimer)
      this._clickTimer = setTimeout(() => {
        this._clickCount = 0
        this._clickTimer = null
        this._dispatchSetpointTap()
      }, SimpleThermostat.DOUBLE_TAP_MS)
    } else {
      if (this._clickTimer) clearTimeout(this._clickTimer)
      this._clickTimer = null
      this._clickCount = 0
      this._dispatchAction('double_tap')
    }
  }

  _onSetpointKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this._dispatchSetpointTap()
    }
  }

  _dispatchSetpointTap() {
    if (this.config?.tap_action) {
      this._dispatchAction('tap')
      return
    }

    this.openEntityPopover(this.config.entity)
  }

  _dispatchAction(kind: 'tap' | 'hold' | 'double_tap') {
    const key =
      kind === 'tap'
        ? 'tap_action'
        : kind === 'hold'
          ? 'hold_action'
          : 'double_tap_action'
    const action =
      this.config?.[key] ??
      (kind === 'tap' ? { action: 'more-info' } : { action: 'none' })
    fireEvent(this, 'hass-action', {
      config: this.config,
      action,
    })
  }

  getCardSize() {
    if (!this.config) return 1

    const headerRows = this.config.embedded === true || this.header ? 1 : 0
    const entityRows =
      this.showEntities && this.entities?.length
        ? Math.max(1, Math.ceil(this.entities.length / 2))
        : 0
    const setpointRows =
      this.config.hide_setpoint === true ||
      (this.config.hide_setpoint_when_off === true &&
        this.entity?.state === HVAC_MODES.OFF) ||
      (this.config.hide?.setpoint_when_off === true &&
        this.entity?.state === HVAC_MODES.OFF)
        ? 0
        : 1
    const modeRows =
      this.modes?.filter((mode) => {
        if (mode.hide_when_off === true && this.entity?.state === HVAC_MODES.OFF) {
          return false
        }
        return (mode.list ?? []).some(
          ({ hide_when_off }) =>
            !(hide_when_off === true && this.entity?.state === HVAC_MODES.OFF)
        )
      }).length ?? 0
    const warningRows =
      this.stepSize < 1 && this.config.decimals === 0 ? 1 : 0

    return Math.max(
      1,
      headerRows + entityRows + setpointRows + modeRows + warningRows
    )
  }

  getUnit(): string | boolean {
    if (['boolean', 'string'].includes(typeof this.config.unit)) {
      return this.config?.unit
    }

    const entityDomain = this.config.entity.split('.')[0]
    if (entityDomain === 'fan' || entityDomain === 'humidifier') {
      return '%'
    }

    return this._hass.config?.unit_system?.temperature ?? false
  }
}
