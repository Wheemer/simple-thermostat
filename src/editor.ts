import { LitElement, html } from 'lit'
import { property, state } from 'lit/decorators.js'
import { mdiBookOpenVariant } from '@mdi/js'
import styles from './styles.css'
import fireEvent from './fireEvent'
import { version } from '../package.json'

import {
  CardConfig,
  ModeControl,
  ModeControlObject,
  MODES,
} from './config/card'
import normalizeConfig from './config/normalize'
import { HeaderConfig } from './config/header'
import { ConfigEntity, FooterEntity, HASS } from './types'
import { EntityAdapter, getAdapter } from './adapters'

declare const process: { env: { BUILD_TIME: string } }
const BUILD_TIME = process.env.BUILD_TIME

const GithubReadMe =
  'https://github.com/Wheemer/simple-thermostat/blob/master/README.md'

const SUPPORTED_ENTITY_DOMAINS = ['climate', 'fan', 'humidifier']

const CONTROL_TYPES = [
  MODES.HVAC,
  MODES.FAN,
  MODES.STATE,
  MODES.PRESET,
  MODES.SWING,
  MODES.SWING_HORIZONTAL,
  MODES.SWING_VERTICAL,
  MODES.VANE_HORIZONTAL,
  MODES.VANE_VERTICAL,
  MODES.DIRECTION,
  MODES.OSCILLATING,
  MODES.MODE,
]

const MODE_TYPES: Array<string> = Object.values(MODES)

const CONTROL_LABELS = {
  [MODES.HVAC]: 'HVAC modes',
  [MODES.FAN]: 'Fan modes',
  [MODES.STATE]: 'On/off state',
  [MODES.PRESET]: 'Preset modes',
  [MODES.SWING]: 'Swing modes',
  [MODES.SWING_HORIZONTAL]: 'Horizontal swing',
  [MODES.SWING_VERTICAL]: 'Vertical swing',
  [MODES.VANE_HORIZONTAL]: 'Horizontal vane',
  [MODES.VANE_VERTICAL]: 'Vertical vane',
  [MODES.DIRECTION]: 'Direction',
  [MODES.OSCILLATING]: 'Oscillating',
  [MODES.MODE]: 'Modes',
}

const stub = {
  header: {},
  layout: {
    mode: {},
  },
}

const LABELS: Record<string, string> = {
  entity: 'Entity (required)',
  current_value_entity: 'Current value source',
  show_header: 'Show header',
  name: 'Name',
  icon: 'Icon',
  'toggle.entity': 'Toggle entity',
  'toggle.name': 'Toggle label',
  'toggle.icon': 'Toggle icon',
  'layout.mode.names': 'Mode names',
  'layout.mode.icons': 'Mode icons',
  'layout.mode.headings': 'Mode headings',
  decimals: 'Decimals',
  unit: 'Unit',
  'layout.step': 'Step layout',
  step_size: 'Step size',
  setpoint_debounce_ms: 'Target debounce',
  fallback: 'Fallback text',
  'hide.temperature': 'Hide current value',
  hide_current_value_when_off: 'Hide current value while off',
  'hide.state': 'Hide state',
  'hide.setpoint_label': 'Hide target label',
  hide_setpoint_when_off: 'Hide target controls while off',
  hide_setpoint: 'Hide target controls',
  disable_setpoint_change_when_off: 'Disable target changes while off',
  'label.temperature': 'Current value label',
  'label.state': 'State label',
  'label.setpoint': 'Target label',
  'layout.entities.type': 'Entity row layout',
  'layout.entities.display': 'Entity display',
  'layout.entities.labels': 'Show entity row labels',
  'layout.entities.separator': 'Show entity label separator',
  'layout.entities.alignment': 'Entity label alignment',
  'footer.entity': 'Footer toggle entity',
  'footer.name': 'Footer toggle label',
  'footer.icon': 'Footer toggle icon',
  enhanced_visuals: 'Enhanced visuals',
  'tap_action.action': 'Tap action',
  'hold_action.action': 'Hold action',
  'double_tap_action.action': 'Double-tap action',
}

for (const type of CONTROL_TYPES) {
  LABELS[`control.${type}`] = CONTROL_LABELS[type]
}

const cloneDeep = <T>(obj: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj))

type FormData = Record<string, unknown>
type FormSchema = Record<string, unknown>
type EntityDisplay = NonNullable<ConfigEntity['display']>

const nonEmptySchema = (item: FormSchema) =>
  !Array.isArray(item.schema) || item.schema.length !== 0

const ACTION_OPTIONS = [
  { value: 'more-info', label: 'More info' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'none', label: 'None' },
]

const STEP_LAYOUT_OPTIONS = [
  { value: 'row', label: 'Row' },
  { value: 'column', label: 'Column' },
]

const STEP_SIZE_OPTIONS = [
  { value: 'auto', label: 'Auto (from entity)' },
  { value: '0.1', label: '0.1' },
  { value: '0.5', label: '0.5' },
  { value: '1', label: '1' },
]

const ENTITY_LAYOUT_OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
]

const ENTITY_DISPLAY_OPTIONS = [
  { value: 'row', label: 'Rows' },
  { value: 'auto', label: 'Auto' },
  { value: 'button', label: 'Buttons' },
  { value: 'toggle', label: 'Toggles' },
  { value: 'chip', label: 'Chips' },
]
const ENTITY_DISPLAY_SELECT_OPTIONS = [
  { value: '', label: 'Default' },
  ...ENTITY_DISPLAY_OPTIONS,
]
const ENTITY_DISPLAY_VALUES = ENTITY_DISPLAY_OPTIONS.map(
  (option) => option.value
) as Array<EntityDisplay>

const ENTITY_ALIGNMENT_OPTIONS = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
]

const DIRECT_FORM_PATHS = [
  'entity',
  'current_value_entity',
  'decimals',
  'unit',
  'fallback',
  'layout.step',
  'layout.mode.names',
  'layout.mode.icons',
  'layout.mode.headings',
  'layout.entities.type',
  'layout.entities.display',
  'layout.entities.labels',
  'layout.entities.separator',
  'layout.entities.alignment',
  'setpoint_debounce_ms',
  'hide.temperature',
  'hide_current_value_when_off',
  'hide.state',
  'hide.setpoint_label',
  'hide_setpoint_when_off',
  'hide_setpoint',
  'disable_setpoint_change_when_off',
  'label.temperature',
  'label.state',
  'label.setpoint',
  'tap_action.action',
  'hold_action.action',
  'double_tap_action.action',
]

const HEADER_FORM_PATHS = [
  'show_header',
  'name',
  'icon',
  'toggle.entity',
  'toggle.name',
  'toggle.icon',
]

const valueChanged = (before: unknown, after: unknown) => before !== after

function getChangedFormPaths(current: FormData, updated: FormData) {
  return new Set(
    Object.keys(updated).filter((path) =>
      valueChanged(current[path], updated[path])
    )
  )
}

function ignoreImplicitDefaultChanges(
  changedPaths: Set<string>,
  config: CardConfig
) {
  if (!changedPaths.has('enhanced_visuals')) return

  if (!config.layout?.step) {
    changedPaths.delete('layout.step')
  }
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.')
  let target = obj
  while (parts.length > 1) {
    const part = parts.shift()
    if (!Object.prototype.hasOwnProperty.call(target, part)) target[part] = {}
    target = target[part] as Record<string, unknown>
  }
  target[parts[0]] = value
}

function deleteNested(obj: Record<string, unknown>, path: string) {
  const parts = path.split('.')
  let target = obj
  while (parts.length > 1) {
    const part = parts.shift()
    if (!target[part]) return
    target = target[part] as Record<string, unknown>
  }
  delete target[parts[0]]
}

function getSelectValue(ev: Event) {
  const target = ev.target as HTMLInputElement & {
    selected?: {
      value?: string
      getAttribute?: (name: string) => string | null
    }
  }
  const detail = (ev as CustomEvent).detail as
    { value?: string; item?: { value?: string } } | undefined

  return (
    detail?.value ??
    detail?.item?.value ??
    target.selected?.value ??
    target.selected?.getAttribute?.('value') ??
    target.value ??
    ''
  )
}

function isModeEnabled(
  config: CardConfig,
  type: string,
  adapter: EntityAdapter
): boolean {
  const control = config.control
  if (control === false) return false
  if (Array.isArray(control)) return control.includes(type)
  if (control && typeof control === 'object') {
    return control[type] !== undefined && control[type] !== false
  }
  return adapter.getDefaultControl().includes(type)
}

function getDefaultControlData(config: CardConfig) {
  const adapter = getAdapter(config.entity)
  return CONTROL_TYPES.reduce((result, type) => {
    result[`control.${type}`] = isModeEnabled(config, type, adapter)
    return result
  }, {})
}

function getSupportedControlTypes(config: CardConfig, hass?: HASS) {
  if (!config.entity || !hass?.states?.[config.entity]) {
    return []
  }

  const entity = hass.states[config.entity]
  const attributes = entity.attributes ?? {}
  const [entityDomain] = config.entity.split('.')
  const adapter = getAdapter(config.entity)

  return CONTROL_TYPES.filter(
    (type) =>
      MODE_TYPES.includes(type) &&
      (type === MODES.STATE
        ? entityDomain === 'fan' || entityDomain === 'humidifier'
        : typeof attributes[adapter.getModeAttribute(type)] !== 'undefined')
  )
}

function getControlFromForm(
  updated: FormData,
  config: CardConfig,
  hass?: HASS
) {
  const entity = String(updated.entity ?? config.entity ?? '')
  const adapter = getAdapter(entity)
  const supportedControlTypes = getSupportedControlTypes(
    {
      ...config,
      entity,
    },
    hass
  )
  const desired = supportedControlTypes.filter(
    (type) => updated[`control.${type}`]
  )
  const defaultControl = adapter.getDefaultControl()

  if (desired.length === 0) return false
  if (
    config.control &&
    !Array.isArray(config.control) &&
    typeof config.control === 'object'
  ) {
    const desiredSet = new Set(desired.map(String))
    const configuredOrder = getConfiguredControlOrder(config.control).filter(
      (type) => desiredSet.has(type)
    )
    const appendedOrder = desired.filter(
      (type) => !configuredOrder.includes(type)
    )
    const orderedTypes = [...configuredOrder, ...appendedOrder]

    return orderedTypes.reduce(
      (result, type) => {
        result[type] = materializeModeOptionOrder(
          config.control[type] || {}
        ).value
        return result
      },
      { _order: orderedTypes } as ModeControl
    )
  }
  if (
    desired.length === defaultControl.length &&
    desired.every((type, index) => type === defaultControl[index])
  ) {
    return undefined
  }
  return desired
}

function isControlObject(
  control: CardConfig['control']
): control is ModeControl {
  return !!control && typeof control === 'object' && !Array.isArray(control)
}

function isModeControlObject(value: unknown): value is ModeControlObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getConfiguredControlOrder(control: ModeControl) {
  const explicitOrder = control._order
  const configuredTypes = Object.keys(control).filter(
    (key) => !key.startsWith('_')
  )
  if (!Array.isArray(explicitOrder)) return configuredTypes

  const used = new Set<string>()
  const ordered = explicitOrder
    .map(String)
    .filter((type) => configuredTypes.includes(type))
    .filter((type) => {
      if (used.has(type)) return false
      used.add(type)
      return true
    })

  configuredTypes.forEach((type) => {
    if (!used.has(type)) ordered.push(type)
  })

  return ordered
}

function areStringArraysEqual(a: Array<unknown>, b: Array<string>) {
  return (
    a.length === b.length &&
    a.every((value, index) => String(value) === b[index])
  )
}

function materializeModeOptionOrder(value: unknown) {
  if (!isModeControlObject(value)) return { value, changed: false }

  const optionKeys = Object.keys(value).filter((key) => !key.startsWith('_'))
  if (optionKeys.length === 0 && !Array.isArray(value._order)) {
    return { value, changed: false }
  }

  const nextOrder = Array.isArray(value._order)
    ? value._order.map(String)
    : optionKeys
  const changed =
    !Array.isArray(value._order) ||
    !areStringArraysEqual(value._order, nextOrder)

  return {
    value: {
      ...value,
      _order: nextOrder,
    },
    changed,
  }
}

function materializeControlOrder(config: CardConfig) {
  if (!isControlObject(config.control)) return { config, changed: false }

  const control = config.control
  const orderedTypes = getConfiguredControlOrder(control)
  if (orderedTypes.length === 0 && !Array.isArray(control._order)) {
    return { config, changed: false }
  }

  let changed =
    Array.isArray(control._order) &&
    !areStringArraysEqual(control._order, orderedTypes)

  const nextConfig = {
    ...config,
    control: orderedTypes.reduce(
      (result, type) => {
        const materialized = materializeModeOptionOrder(control[type])
        result[type] = materialized.value
        changed = changed || materialized.changed
        return result
      },
      (Array.isArray(control._order)
        ? { _order: orderedTypes }
        : {}) as ModeControl
    ),
  }

  return { config: changed ? nextConfig : config, changed }
}

export function buildSchema(config: CardConfig, hass?: HASS) {
  const supportedControlTypes = getSupportedControlTypes(config, hass)
  const entityDomain = config.entity?.split('.')[0]
  const adapter = getAdapter(config.entity)
  const entity = config.entity ? hass?.states?.[config.entity] : undefined
  const hasSetpoints =
    config.hide_setpoint === true ||
    !entity ||
    Object.keys(adapter.getSetpoints(entity.attributes ?? {})).length > 0
  const hasCurrentValue =
    entityDomain !== 'fan' &&
    (entityDomain === 'climate' || entityDomain === 'humidifier')
  const currentValueSchema: Array<FormSchema> =
    entityDomain === 'fan'
      ? []
      : [
          {
            name: 'current_value_entity',
            selector: { entity: { domain: ['sensor', 'input_number'] } },
          },
        ]
  const visibilitySchema: Array<FormSchema> = [
    ...(hasCurrentValue
      ? [
          { name: 'hide.temperature', selector: { boolean: {} } },
          { name: 'hide_current_value_when_off', selector: { boolean: {} } },
        ]
      : []),
    { name: 'hide.state', selector: { boolean: {} } },
  ]
  const labelsSchema: Array<FormSchema> = [
    ...(hasCurrentValue
      ? [{ name: 'label.temperature', selector: { text: {} } }]
      : []),
    { name: 'label.state', selector: { text: {} } },
    ...(hasSetpoints
      ? [{ name: 'label.setpoint', selector: { text: {} } }]
      : []),
  ]
  const headerSchema =
    config.header === false
      ? []
      : [
          {
            type: 'grid',
            schema: [
              { name: 'name', selector: { text: {} } },
              { name: 'icon', selector: { icon: {} } },
            ],
          },
          { name: 'toggle.entity', selector: { entity: {} } },
          { name: 'toggle.name', selector: { text: {} } },
          ...(config.header &&
          typeof config.header === 'object' &&
          config.header.toggle?.entity
            ? [{ name: 'toggle.icon', selector: { icon: {} } }]
            : []),
        ]

  const schema: Array<FormSchema> = [
    {
      name: 'entity',
      required: true,
      selector: { entity: { domain: SUPPORTED_ENTITY_DOMAINS } },
    },
    {
      type: 'expandable',
      title: 'Card header',
      schema: [
        { name: 'show_header', selector: { boolean: {} } },
        ...headerSchema,
      ],
    },
    ...(supportedControlTypes.length > 0
      ? [
          {
            type: 'expandable',
            title: 'Controls',
            schema: [
              {
                type: 'grid',
                column_min_width: '150px',
                schema: supportedControlTypes.map((type) => ({
                  name: `control.${type}`,
                  selector: { boolean: {} },
                })),
              },
            ],
          },
        ]
      : []),
    ...(hasSetpoints
      ? [
          {
            type: 'expandable',
            title: 'Target',
            schema: [
              {
                type: 'grid',
                schema: [
                  {
                    name: 'layout.step',
                    selector: {
                      select: {
                        mode: 'dropdown',
                        options: STEP_LAYOUT_OPTIONS,
                      },
                    },
                  },
                  {
                    name: 'step_size',
                    selector: {
                      select: {
                        mode: 'dropdown',
                        options: STEP_SIZE_OPTIONS,
                      },
                    },
                  },
                ],
              },
              {
                type: 'grid',
                column_min_width: '160px',
                schema: [
                  { name: 'hide_setpoint', selector: { boolean: {} } },
                  {
                    name: 'hide_setpoint_when_off',
                    selector: { boolean: {} },
                  },
                  { name: 'hide.setpoint_label', selector: { boolean: {} } },
                  {
                    name: 'disable_setpoint_change_when_off',
                    selector: { boolean: {} },
                  },
                ],
              },
            ],
          },
        ]
      : []),
    {
      type: 'expandable',
      title: 'Extra entity rows',
      schema: [
        {
          type: 'grid',
          column_min_width: '160px',
          schema: [
            {
              name: 'layout.entities.type',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: ENTITY_LAYOUT_OPTIONS,
                },
              },
            },
            {
              name: 'layout.entities.display',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: ENTITY_DISPLAY_SELECT_OPTIONS,
                },
              },
            },
            { name: 'layout.entities.labels', selector: { boolean: {} } },
            { name: 'layout.entities.separator', selector: { boolean: {} } },
            {
              name: 'layout.entities.alignment',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: ENTITY_ALIGNMENT_OPTIONS,
                },
              },
            },
          ],
        },
      ],
    },
    {
      type: 'expandable',
      title: 'Appearance',
      schema: [
        { name: 'enhanced_visuals', selector: { boolean: {} } },
        {
          type: 'grid',
          column_min_width: '160px',
          schema: visibilitySchema,
        },
      ].filter(nonEmptySchema),
    },
    {
      type: 'expandable',
      title: 'Advanced',
      schema: [
        ...currentValueSchema,
        ...(hasCurrentValue
          ? [
              {
                type: 'grid',
                schema: [
                  {
                    name: 'decimals',
                    selector: {
                      number: { min: 0, max: 5, step: 1, mode: 'box' },
                    },
                  },
                  { name: 'unit', selector: { text: {} } },
                ],
              },
            ]
          : []),
        { name: 'fallback', selector: { text: {} } },
        {
          name: 'setpoint_debounce_ms',
          selector: { number: { min: 0, step: 100, mode: 'box' } },
        },
        {
          type: 'grid',
          column_min_width: '160px',
          schema: labelsSchema,
        },
        {
          type: 'grid',
          column_min_width: '150px',
          schema: [
            { name: 'layout.mode.names', selector: { boolean: {} } },
            { name: 'layout.mode.icons', selector: { boolean: {} } },
            { name: 'layout.mode.headings', selector: { boolean: {} } },
          ],
        },
        {
          type: 'grid',
          column_min_width: '150px',
          schema: [
            {
              name: 'tap_action.action',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: ACTION_OPTIONS,
                },
              },
            },
            {
              name: 'hold_action.action',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: ACTION_OPTIONS,
                },
              },
            },
            {
              name: 'double_tap_action.action',
              selector: {
                select: {
                  mode: 'dropdown',
                  options: ACTION_OPTIONS,
                },
              },
            },
          ],
        },
      ].filter(nonEmptySchema),
    },
  ]

  return schema
}

export default class SimpleThermostatEditor extends LitElement {
  @state() config!: CardConfig
  @property({ attribute: false }) hass?: HASS

  static override get styles() {
    return styles
  }

  static getStubConfig() {
    return { ...stub }
  }

  setConfig(config: CardConfig) {
    const materialized = materializeControlOrder(
      normalizeConfig(config || ({ ...stub } as CardConfig))
    )
    this.config = materialized.config

    if (materialized.changed) {
      queueMicrotask(() => {
        if (this.config === materialized.config) {
          fireEvent(this, 'config-changed', { config: materialized.config })
        }
      })
    }
  }

  _openLink() {
    window.open(GithubReadMe, '_blank', 'noopener')
  }

  _buildFormData(): FormData {
    const header: HeaderConfig =
      this.config.header && typeof this.config.header === 'object'
        ? this.config.header
        : {}
    return {
      entity: this.config.entity ?? '',
      current_value_entity: this.config.current_value_entity ?? '',
      show_header: this.config.header !== false,
      'layout.mode.names': this.config.layout?.mode?.names !== false,
      'layout.mode.icons': this.config.layout?.mode?.icons !== false,
      'layout.mode.headings': this.config.layout?.mode?.headings === true,
      decimals: this.config.decimals ?? '',
      unit: typeof this.config.unit === 'string' ? this.config.unit : '',
      'layout.step':
        this.config.enhanced_visuals === false
          ? (this.config.layout?.step ?? 'column')
          : (this.config.layout?.step ?? 'row'),
      step_size:
        this.config.step_size != null ? String(this.config.step_size) : 'auto',
      fallback: this.config.fallback ?? '',
      setpoint_debounce_ms: this.config.setpoint_debounce_ms ?? '',
      'hide.temperature': this.config.hide?.temperature === true,
      hide_current_value_when_off:
        this.config.hide_current_value_when_off === true ||
        this.config.hide?.current_value_when_off === true ||
        this.config.hide?.temperature_when_off === true,
      'hide.state': this.config.hide?.state === true,
      hide_setpoint: this.config.hide_setpoint === true,
      disable_setpoint_change_when_off:
        this.config.disable_setpoint_change_when_off === true,
      'hide.setpoint_label': this.config.hide?.setpoint_label === true,
      hide_setpoint_when_off:
        this.config.hide_setpoint_when_off === true ||
        this.config.hide?.setpoint_when_off === true,
      'label.temperature': this.config.label?.temperature ?? '',
      'label.state': this.config.label?.state ?? '',
      'label.setpoint': this.config.label?.setpoint ?? '',
      'layout.entities.type': this.config.layout?.entities?.type ?? 'table',
      'layout.entities.display': this.config.layout?.entities?.display ?? '',
      'layout.entities.labels': this.config.layout?.entities?.labels !== false,
      'layout.entities.separator':
        this.config.layout?.entities?.separator !== false,
      'layout.entities.alignment':
        this.config.layout?.entities?.alignment ?? 'right',
      enhanced_visuals: this.config.enhanced_visuals !== false,
      name: header.name ?? '',
      icon: typeof header.icon === 'string' ? header.icon : '',
      'toggle.entity': header.toggle?.entity ?? '',
      'toggle.name': header.toggle?.name ?? '',
      'toggle.icon':
        typeof header.toggle?.icon === 'string' ? header.toggle.icon : '',
      'tap_action.action': this.config.tap_action?.action ?? 'more-info',
      'hold_action.action': this.config.hold_action?.action ?? 'none',
      'double_tap_action.action':
        this.config.double_tap_action?.action ?? 'none',
      ...getDefaultControlData(this.config),
    }
  }

  _applyFormChange(updated: FormData) {
    const currentFormData = this._buildFormData()
    const changedPaths = getChangedFormPaths(currentFormData, updated)
    ignoreImplicitDefaultChanges(changedPaths, this.config)
    const formData = { ...currentFormData, ...updated }
    const copy = cloneDeep(this.config) as unknown as Record<string, unknown>

    this._applyDirectFormPaths(copy, formData, changedPaths)

    if (formData.enhanced_visuals === false) {
      copy.enhanced_visuals = false
    } else {
      delete copy.enhanced_visuals
    }

    if (HEADER_FORM_PATHS.some((path) => changedPaths.has(path))) {
      if (formData.show_header === false) {
        copy.header = false
      } else {
        this._applyHeaderFormChange(copy, formData)
      }
    }

    if (changedPaths.has('step_size')) {
      this._applyStepSize(copy, formData.step_size)
    }

    if (
      changedPaths.has('entity') ||
      CONTROL_TYPES.some((type) => changedPaths.has(`control.${type}`))
    ) {
      const control = getControlFromForm(formData, this.config, this.hass)
      if (typeof control === 'undefined') delete copy.control
      else copy.control = control
    }

    return copy as unknown as CardConfig
  }

  _applyDirectFormPaths(
    copy: Record<string, unknown>,
    updated: FormData,
    changedPaths: Set<string>
  ) {
    for (const path of DIRECT_FORM_PATHS) {
      if (!changedPaths.has(path)) continue
      const newValue = updated[path]
      if (newValue === undefined || newValue === null || newValue === '') {
        deleteNested(copy, path)
      } else {
        setNested(copy, path, newValue)
      }
    }
  }

  _applyHeaderFormChange(copy: Record<string, unknown>, updated: FormData) {
    if (copy.header === false || copy.header == null) copy.header = {}
    const header = copy.header as HeaderConfig
    const headerName = updated.name
    const headerIcon = updated.icon
    const toggleEntity = updated['toggle.entity']
    const toggleLabel = updated['toggle.name']
    const toggleIcon = updated['toggle.icon']

    if (typeof headerName === 'string' && headerName) header.name = headerName
    else delete header.name
    if (typeof headerIcon === 'string' && headerIcon) header.icon = headerIcon
    else delete header.icon

    if (typeof toggleEntity === 'string' && toggleEntity) {
      header.toggle = header.toggle || { entity: toggleEntity }
      header.toggle.entity = toggleEntity
      if (typeof toggleLabel === 'string' && toggleLabel) {
        header.toggle.name = toggleLabel
      } else {
        delete header.toggle.name
      }
      if (typeof toggleIcon === 'string' && toggleIcon) {
        header.toggle.icon = toggleIcon
      } else {
        delete header.toggle.icon
      }
    } else {
      delete header.toggle
    }
  }

  _applyStepSize(copy: Record<string, unknown>, value: unknown) {
    if (value === 'auto' || value === '' || value == null) {
      delete copy.step_size
      return
    }

    const stepSize = Number(value)
    copy.step_size = Number.isNaN(stepSize) ? value : stepSize
  }

  _valueChanged = (ev: CustomEvent) => {
    const copy = this._applyFormChange(ev.detail.value as FormData)
    this.config = copy
    fireEvent(this, 'config-changed', { config: copy })
  }

  _getExtraEntities() {
    return Array.isArray(this.config.entities) ? this.config.entities : []
  }

  _getFooterRows() {
    return Array.isArray(this.config.footer) ? this.config.footer : []
  }

  _commitEntityRows(entities: Array<ConfigEntity>) {
    const copy = cloneDeep(this.config) as CardConfig
    if (entities.length > 0) copy.entities = entities
    else delete copy.entities
    this.config = copy
    fireEvent(this, 'config-changed', { config: copy })
  }

  _addEntityRow() {
    this._commitEntityRows([...this._getExtraEntities(), { entity: '' }])
  }

  _removeEntityRow(index: number) {
    this._commitEntityRows(
      this._getExtraEntities().filter((_, entityIndex) => entityIndex !== index)
    )
  }

  _updateEntityRow(
    index: number,
    field: keyof Pick<ConfigEntity, 'entity' | 'name' | 'icon' | 'display'>,
    value: unknown
  ) {
    const entities = this._getExtraEntities().map((entity, entityIndex) => {
      if (entityIndex !== index) return entity
      const next = { ...entity }
      if (field === 'display') {
        if (
          typeof value === 'string' &&
          ENTITY_DISPLAY_VALUES.includes(value as EntityDisplay)
        ) {
          next.display = value as EntityDisplay
        } else {
          delete next.display
        }
        return next
      }

      if (typeof value === 'string' && value) next[field] = value
      else delete next[field]
      return next
    })
    this._commitEntityRows(entities)
  }

  _commitFooterRows(footer: Array<FooterEntity>) {
    const copy = cloneDeep(this.config) as CardConfig
    if (footer.length > 0) copy.footer = footer
    else delete copy.footer
    this.config = copy
    fireEvent(this, 'config-changed', { config: copy })
  }

  _addFooterRow() {
    this._commitFooterRows([...this._getFooterRows(), { entity: '' }])
  }

  _removeFooterRow(index: number) {
    this._commitFooterRows(
      this._getFooterRows().filter((_, footerIndex) => footerIndex !== index)
    )
  }

  _updateFooterRow(
    index: number,
    field: keyof Pick<FooterEntity, 'entity' | 'name' | 'icon'>,
    value: unknown
  ) {
    const footer = this._getFooterRows().map((row, footerIndex) => {
      if (footerIndex !== index) return row
      const next = { ...row }
      if (typeof value === 'string' && value) next[field] = value
      else delete next[field]
      return next
    })
    this._commitFooterRows(footer)
  }

  _renderExtraEntityRows() {
    const entities = this._getExtraEntities()

    return html`
      <section class="editor-extra-entities">
        <div class="editor-extra-entities__header">
          <div>
            <h3>Extra entity rows</h3>
            <p>Add the sensors or helpers shown under the main state.</p>
          </div>
          <ha-button @click=${this._addEntityRow}>Add row</ha-button>
        </div>

        ${
          entities.length === 0
            ? html`<p class="editor-extra-entities__empty">
                No extra rows configured.
              </p>`
            : entities.map(
                (entity, index) => html`
                  <div class="editor-entity-row">
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${entity.entity ?? ''}
                      allow-custom-entity
                      @value-changed=${(ev: CustomEvent) =>
                        this._updateEntityRow(index, 'entity', ev.detail.value)}
                    ></ha-entity-picker>
                    <ha-textfield
                      label="Name"
                      .value=${entity.name ?? ''}
                      @input=${(ev: InputEvent) =>
                        this._updateEntityRow(
                          index,
                          'name',
                          (ev.target as HTMLInputElement).value
                        )}
                    ></ha-textfield>
                    <ha-icon-picker
                      .hass=${this.hass}
                      .value=${entity.icon ?? ''}
                      @value-changed=${(ev: CustomEvent) =>
                        this._updateEntityRow(index, 'icon', ev.detail.value)}
                    ></ha-icon-picker>
                    <ha-select
                      label="Display"
                      clearable
                      .value=${entity.display ?? ''}
                      @value-changed=${(ev: Event) =>
                        this._updateEntityRow(
                          index,
                          'display',
                          getSelectValue(ev)
                        )}
                      @selected=${(ev: Event) =>
                        this._updateEntityRow(
                          index,
                          'display',
                          getSelectValue(ev)
                        )}
                      @change=${(ev: Event) =>
                        this._updateEntityRow(
                          index,
                          'display',
                          getSelectValue(ev)
                        )}
                    >
                      <mwc-list-item value="">Default</mwc-list-item>
                      ${ENTITY_DISPLAY_OPTIONS.map(
                        (option) => html`
                          <mwc-list-item value=${option.value}>
                            ${option.label}
                          </mwc-list-item>
                        `
                      )}
                    </ha-select>
                    <ha-button @click=${() => this._removeEntityRow(index)}>
                      Remove
                    </ha-button>
                  </div>
                `
              )
        }
      </section>
    `
  }

  _renderFooterRows() {
    const footer = this._getFooterRows()

    return html`
      <section class="editor-extra-entities">
        <div class="editor-extra-entities__header">
          <div>
            <h3>Footer controls</h3>
            <p>Add switch-style controls shown below the mode rows.</p>
          </div>
          <ha-button @click=${this._addFooterRow}>Add control</ha-button>
        </div>

        ${
          footer.length === 0
            ? html`<p class="editor-extra-entities__empty">
                No footer controls configured.
              </p>`
            : footer.map(
                (row, index) => html`
                  <div class="editor-entity-row">
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${row.entity ?? ''}
                      allow-custom-entity
                      @value-changed=${(ev: CustomEvent) =>
                        this._updateFooterRow(index, 'entity', ev.detail.value)}
                    ></ha-entity-picker>
                    <ha-textfield
                      label="Name override"
                      .value=${row.name ?? ''}
                      @input=${(ev: InputEvent) =>
                        this._updateFooterRow(
                          index,
                          'name',
                          (ev.target as HTMLInputElement).value
                        )}
                    ></ha-textfield>
                    <ha-icon-picker
                      .hass=${this.hass}
                      .value=${row.icon ?? ''}
                      @value-changed=${(ev: CustomEvent) =>
                        this._updateFooterRow(index, 'icon', ev.detail.value)}
                    ></ha-icon-picker>
                    <ha-button @click=${() => this._removeFooterRow(index)}>
                      Remove
                    </ha-button>
                  </div>
                `
              )
        }
      </section>
    `
  }

  _computeLabel = (schema: FormSchema) =>
    LABELS[String(schema.name)] ?? String(schema.name)

  override render() {
    if (!this.hass || !this.config) return html``

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${this._buildFormData()}
          .schema=${buildSchema(this.config, this.hass)}
          .computeLabel=${this._computeLabel}
          @value-changed=${this._valueChanged}
        ></ha-form>

        ${this._renderExtraEntityRows()} ${this._renderFooterRows()}

        <div class="editor-footer">
          <ha-button @click=${this._openLink}>
            <ha-svg-icon .path=${mdiBookOpenVariant} slot="icon"></ha-svg-icon>
            All configuration options
          </ha-button>
          <span class="editor-footer__hint">
            YAML remains available for specialized setups
          </span>
          <span class="editor-footer__version"
            >v${version} - ${BUILD_TIME}</span
          >
        </div>
      </div>
    `
  }
}
