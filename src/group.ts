import { LitElement, html, css, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { name as CARD_NAME } from '../package.json'
import { CardConfig } from './config/card'
import parseHeader from './config/header'
import { getEntityAction } from './entityAction'
import { HASS, LooseObject } from './types'

type AutoSelectMode = 'off' | 'recent_activity'

export type GroupTargetConfig =
  | string
  | (LooseObject & {
      entity: string
      name?: string
      icon?: string
    })

export interface GroupConfig {
  type?: string
  cards?: Array<GroupTargetConfig>
  entities?: Array<GroupTargetConfig>
  selected?: string
  storage_key?: string
  remember_selection?: boolean
  auto_select?:
    | boolean
    | AutoSelectMode
    | {
        mode?: AutoSelectMode
        cooldown_ms?: number
        manual_pause_ms?: number
      }
  selector?: {
    icons?: boolean
    names?: boolean
    states?: boolean
  }
  card?: Partial<CardConfig>
}

interface GroupTarget {
  entity: string
  config: LooseObject
}

interface ActivityRecord {
  entity: string
  signature: string
  timestamp: number
}

interface ActivityCandidate {
  target: GroupTarget
  timestamp: number
  activeRank: number
}

const DEFAULT_SELECTOR = {
  icons: true,
  names: true,
  states: false,
}

const SUPPORTED_DOMAINS = ['climate', 'fan', 'humidifier']
const DEFAULT_AUTO_SELECT_MANUAL_PAUSE_MS = 30000

function getDomain(entityId: string) {
  return entityId.split('.')[0]
}

function safeClass(value: unknown) {
  return typeof value === 'string' ? value.replace(/[^a-z0-9_-]/gi, '') : ''
}

function getCardStyle(entityDomain: string, attributes: LooseObject = {}) {
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

function normalizeTarget(target: GroupTargetConfig): GroupTarget | null {
  if (typeof target === 'string') {
    const entity = target.trim()
    return entity
      ? {
          entity,
          config: { type: `custom:${CARD_NAME}`, entity },
        }
      : null
  }

  if (!target?.entity) return null

  const { entity, name, icon, ...config } = target
  const header =
    typeof config.header === 'object' && config.header
      ? { ...config.header }
      : {}

  if (name && config.header !== false && typeof header.name === 'undefined') {
    header.name = name
  }

  if (icon && config.header !== false && typeof header.icon === 'undefined') {
    header.icon = icon
  }

  return {
    entity,
    config: {
      type: config.type ?? `custom:${CARD_NAME}`,
      ...config,
      entity,
      ...(config.header === false ? { header: false } : { header }),
    },
  }
}

export default class SimpleThermostatGroup extends LitElement {
  @property({ attribute: false }) hass?: HASS
  @state() private config?: GroupConfig
  @state() private targets: Array<GroupTarget> = []
  @state() private selectedEntity = ''
  @state() private menuOpen = false
  @state() private cardFading = false
  private embeddedCard?: HTMLElement & {
    hass?: HASS
    setConfig?: (config: LooseObject) => void
  }
  private removeOutsideClickListener?: () => void
  private fadeInAfterSync = false
  private activitySignatures = new Map<string, string>()
  private activitySignaturesInitialized = false
  private persistedActivityApplied = false
  private lastManualSelectionAt = 0
  private autoSelectResumeTimer?: number

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .group-shell {
        display: block;
        position: relative;
      }

      .group-card {
        display: block;
        overflow: visible;
      }

      .group-selector {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 78px;
        grid-template-areas: 'content nav';
        align-items: center;
        gap: 4px;
        padding: calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 4)
          calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 2) 0
          calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 4);
        color: var(--primary-text-color);
        position: absolute;
        z-index: 2;
        inset: 0 0 auto 0;
        min-width: 0;
        box-sizing: border-box;
        transform: translateY(var(--st-group-header-top-buffer, 6px));
      }

      .group-title {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: clip;
        white-space: nowrap;
        font-size: var(
          --st-group-title-fit-size,
          var(
            --st-group-title-font-size,
            calc(
              var(--st-font-size-title, var(--ha-card-header-font-size, 24px)) *
                0.9
            )
          )
        );
        line-height: var(
          --st-group-title-fit-line-height,
          calc(
            var(
                --st-group-title-font-size,
                var(--st-font-size-title, var(--ha-card-header-font-size, 24px))
              ) *
              0.9
          )
        );
        font-weight: normal;
      }

      .group-header-content {
        grid-area: content;
        display: flex;
        align-items: center;
        min-width: 0;
      }

      .group-nav-cluster {
        grid-area: nav;
        justify-self: end;
        width: 78px;
        display: grid;
        grid-template-columns: auto auto auto;
        grid-template-areas:
          'prev next menu'
          'count count menu';
        align-items: center;
        justify-items: center;
        column-gap: 2px;
        row-gap: 0;
        margin-left: 4px;
      }

      .group-nav,
      .group-menu {
        flex: 0 0 auto;
        appearance: none;
        border: 0;
        border-radius: 8px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        cursor: pointer;
      }

      .group-nav ha-icon,
      .group-menu ha-icon {
        --mdc-icon-size: 19px;
        --iron-icon-width: 19px;
        --iron-icon-height: 19px;
      }

      .group-nav:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .group-count {
        grid-area: count;
        min-width: 0;
        margin-top: 2px;
        text-align: center;
        font-size: var(--ha-font-size-2xs, 10px);
        line-height: 1;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }

      .group-menu {
        grid-area: menu;
        width: 20px;
        background: transparent;
        color: var(--secondary-text-color);
      }

      .group-menu ha-icon {
        transform: translateY(-1px);
      }

      .group-nav.previous {
        grid-area: prev;
      }

      .group-nav.next {
        grid-area: next;
      }

      .group-toggles {
        flex: 0 0 auto;
        max-width: 48px;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        margin-left: 4px;
        margin-right: 2px;
      }

      .group-toggle {
        flex: 0 0 auto;
        max-width: 44px;
        min-width: 34px;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        color: var(--primary-text-color);
      }

      .group-toggle-label {
        display: block;
        width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
        font-size: var(--ha-font-size-xs, 11px);
        line-height: 1.1;
        color: var(--secondary-text-color);
      }

      .group-toggle ha-icon {
        --mdc-icon-size: 16px;
        --iron-icon-width: 16px;
        --iron-icon-height: 16px;
      }

      .group-toggle ha-switch {
        transform: scale(0.72);
        transform-origin: center;
      }

      .group-picker {
        position: absolute;
        z-index: 5;
        top: calc(100% + 4px);
        right: 0;
        min-width: min(280px, 100%);
        max-width: 100%;
        max-height: min(320px, 60vh);
        overflow: auto;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 4px;
        background: var(--ha-card-background, var(--card-background-color));
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.25));
      }

      .group-picker button {
        appearance: none;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--primary-text-color);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        width: 100%;
        min-height: 36px;
        padding: 6px 8px;
        text-align: left;
        font: inherit;
        cursor: pointer;
      }

      .group-picker button:hover,
      .group-picker button.selected {
        background: var(--secondary-background-color);
      }

      .group-picker ha-icon {
        --mdc-icon-size: 22px;
        --iron-icon-width: 22px;
        --iron-icon-height: 22px;
        color: var(--primary-color);
      }

      .group-picker span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .embedded-card-host {
        display: block;
        overflow: hidden;
        opacity: 1;
        padding-top: var(--st-group-body-top-buffer, 14px);
        transition: opacity 120ms ease;
        will-change: opacity;
      }

      .embedded-card-host.fading {
        opacity: 0;
        pointer-events: none;
      }

      .embedded-card-host simple-thermostat {
        display: block;
      }

      @media (prefers-reduced-motion: reduce) {
        .embedded-card-host {
          transition: none;
        }
      }

      .header__main {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1 1 auto;
      }

      .header__icon-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--st-control-icon-size, 32px);
        height: var(--st-control-icon-size, 32px);
        margin-right: calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 2);
        color: var(--state-icon-color, var(--secondary-text-color));
        isolation: isolate;
        flex: 0 0 auto;
      }

      .header__icon-wrap.off {
        color: var(--state-icon-color, var(--disabled-text-color));
      }

      .header__icon-wrap::before {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(
          var(--st-control-icon-size, 32px) +
            (var(--st-active-icon-glow-max-size, 6px) * 2)
        );
        height: calc(
          var(--st-control-icon-size, 32px) +
            (var(--st-active-icon-glow-max-size, 6px) * 2)
        );
        z-index: 0;
        border-radius: 999px;
        pointer-events: none;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.72);
        transform-origin: center;
        background: radial-gradient(
          circle,
          color-mix(
              in srgb,
              var(--st-active-icon-glow-color, currentColor)
                var(--st-active-icon-glow-max-strength, 60%),
              transparent
            )
            0%,
          color-mix(
              in srgb,
              var(--st-active-icon-glow-color, currentColor)
                var(--st-active-icon-glow-mid-strength, 44%),
              transparent
            )
            42%,
          transparent 72%
        );
        will-change: opacity, transform;
      }

      .header__icon-wrap.slash-off::before,
      .header__icon-wrap.slash-off::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: calc(var(--st-control-icon-size, 32px) * 1.05);
        border-radius: 999px;
        pointer-events: none;
        transform-origin: center;
        z-index: 3;
      }

      .header__icon-wrap.slash-off::before {
        height: max(4px, calc(var(--st-control-icon-size, 32px) * 0.115));
        background: var(
          --ha-card-background,
          var(--card-background-color, var(--primary-background-color))
        );
        transform: translate(
            -50%,
            calc(-50% - (var(--st-control-icon-size, 32px) * 0.055))
          )
          rotate(45deg);
      }

      .header__icon-wrap.slash-off::after {
        height: max(2px, calc(var(--st-control-icon-size, 32px) * 0.08));
        background: currentColor;
        transform: translate(-50%, -50%) rotate(45deg);
      }

      .header__icon {
        --iron-icon-width: var(--st-control-icon-size, 32px);
        --iron-icon-height: var(--st-control-icon-size, 32px);
        --mdc-icon-size: var(--st-control-icon-size, 32px);
        position: relative;
        z-index: 1;
        width: var(--st-control-icon-size, 32px);
        height: var(--st-control-icon-size, 32px);
        color: inherit;
        transform-origin: center;
      }

      @keyframes st-group-fan-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes st-group-active-icon-glow {
        0%,
        100% {
          opacity: 0.16;
          transform: translate(-50%, -50%) scale(0.72);
        }

        50% {
          opacity: 0.42;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      .group-card.domain-fan:not(.state-off) .header__icon-wrap,
      .group-card.humidifying .header__icon-wrap {
        --st-active-icon-glow-color: var(--primary-color);
      }

      .group-card.dehumidifying .header__icon-wrap,
      .group-card.drying .header__icon-wrap {
        --st-active-icon-glow-color: var(
          --state-climate-dry-color,
          var(--primary-color)
        );
      }

      .group-card.heating .header__icon-wrap {
        --st-active-icon-glow-color: var(
          --state-climate-heat-color,
          var(--primary-color)
        );
      }

      .group-card.cooling .header__icon-wrap {
        --st-active-icon-glow-color: var(
          --state-climate-cool-color,
          var(--primary-color)
        );
      }

      .group-card.domain-fan:not(.state-off) .header__icon-wrap::before,
      .group-card.humidifying .header__icon-wrap::before,
      .group-card.dehumidifying .header__icon-wrap::before,
      .group-card.drying .header__icon-wrap::before,
      .group-card.heating .header__icon-wrap::before,
      .group-card.cooling .header__icon-wrap::before {
        animation: st-group-active-icon-glow
          var(--st-active-icon-glow-duration, 4s) ease-in-out infinite;
      }

      .group-card.domain-fan:not(.state-off) .header__icon {
        animation: st-group-fan-spin var(--st-fan-spin-duration, 2.4s) linear
          infinite;
      }
    `
  }

  static getConfigElement() {
    return window.document.createElement(`${CARD_NAME}-group-editor`)
  }

  static getStubConfig(hass: HASS) {
    const entities = Object.keys(hass?.states ?? {}).filter((id) =>
      SUPPORTED_DOMAINS.includes(getDomain(id))
    )

    return {
      entities: entities.slice(0, 2),
      card: {},
    }
  }

  setConfig(config: GroupConfig) {
    this.clearAutoSelectResumeTimer()
    const sourceTargets = config.cards ?? config.entities ?? []
    const targets = sourceTargets
      .map(normalizeTarget)
      .filter(Boolean) as Array<GroupTarget>

    if (!targets.length) {
      throw new Error('Simple Thermostat Group requires at least one card')
    }

    this.config = {
      ...config,
      selector: {
        ...DEFAULT_SELECTOR,
        ...(config.selector ?? {}),
      },
    }
    this.targets = targets
    this.selectedEntity = this.getInitialSelection(config, targets)
    this.activitySignatures.clear()
    this.activitySignaturesInitialized = false
    this.persistedActivityApplied = false
  }

  protected updated() {
    this.syncAutoSelectRecentActivity()
    this.syncEmbeddedCard()
    this.syncOutsideClickListener()
    this.syncTitleFit()
  }

  disconnectedCallback() {
    this.clearOutsideClickListener()
    this.clearAutoSelectResumeTimer()
    super.disconnectedCallback()
  }

  private getInitialSelection(
    config: GroupConfig,
    targets: Array<GroupTarget>
  ) {
    const valid = new Set(targets.map((target) => target.entity))
    const stored =
      config.remember_selection === false
        ? ''
        : this.readStoredSelection(config)

    if (stored && valid.has(stored)) return stored
    if (config.selected && valid.has(config.selected)) return config.selected
    return targets[0].entity
  }

  private readStoredSelection(config: GroupConfig) {
    try {
      return window.localStorage?.getItem(this.getStorageKey(config)) ?? ''
    } catch (_err) {
      return ''
    }
  }

  private writeStoredSelection(entity: string) {
    if (!this.config || this.config.remember_selection === false) return

    try {
      window.localStorage?.setItem(this.getStorageKey(this.config), entity)
    } catch (_err) {
      // Browsers can block localStorage in private contexts; selection still works.
    }
  }

  private readStoredActivity(config: GroupConfig): ActivityRecord | undefined {
    try {
      const value = window.localStorage?.getItem(this.getActivityStorageKey(config))
      if (!value) return undefined

      const parsed = JSON.parse(value) as Partial<ActivityRecord>
      if (
        typeof parsed.entity === 'string' &&
        typeof parsed.signature === 'string' &&
        Number.isFinite(parsed.timestamp)
      ) {
        return {
          entity: parsed.entity,
          signature: parsed.signature,
          timestamp: Number(parsed.timestamp),
        }
      }
    } catch (_err) {
      return undefined
    }

    return undefined
  }

  private writeStoredActivity(record: ActivityRecord) {
    if (!this.config) return

    try {
      window.localStorage?.setItem(
        this.getActivityStorageKey(this.config),
        JSON.stringify(record)
      )
    } catch (_err) {
      // Browsers can block localStorage in private contexts; live auto-select still works.
    }
  }

  private getStorageKey(config: GroupConfig) {
    if (config.storage_key)
      return `simple-thermostat-group:${config.storage_key}`

    const entities = this.targets.map((target) => target.entity).join('|')
    return `simple-thermostat-group:${entities}`
  }

  private getActivityStorageKey(config: GroupConfig) {
    return `${this.getStorageKey(config)}:recent-activity`
  }

  private clearAutoSelectResumeTimer() {
    if (this.autoSelectResumeTimer === undefined) return

    window.clearTimeout(this.autoSelectResumeTimer)
    this.autoSelectResumeTimer = undefined
  }

  private getSelectedTarget() {
    return (
      this.targets.find((target) => target.entity === this.selectedEntity) ??
      this.targets[0]
    )
  }

  private getSelectedState() {
    const target = this.getSelectedTarget()
    return this.hass?.states?.[target.entity]
  }

  private getGroupCardClasses() {
    const state = this.getSelectedState()
    if (!state) return 'group-card group-shell'

    const domain = getDomain(state.entity_id)
    const action = getEntityAction(state)
    const unavailable = ['unavailable', 'unknown'].includes(String(state.state))
    const classes = [
      'group-card',
      'group-shell',
      `domain-${safeClass(domain)}`,
      `state-${safeClass(state.state)}`,
      safeClass(action),
      unavailable && safeClass(state.state),
    ].filter(Boolean)

    return classes.join(' ')
  }

  private getGroupCardStyle() {
    const state = this.getSelectedState()
    if (!state) return ''

    return getCardStyle(getDomain(state.entity_id), state.attributes)
  }

  private getSelectedIndex() {
    const index = this.targets.findIndex(
      (target) => target.entity === this.selectedEntity
    )
    return index === -1 ? 0 : index
  }

  private isRecentActivityAutoSelectEnabled() {
    const autoSelect = this.config?.auto_select
    if (!autoSelect) return false
    if (autoSelect === true || autoSelect === 'recent_activity') return true
    if (typeof autoSelect === 'object') {
      return autoSelect.mode === 'recent_activity'
    }

    return false
  }

  private getAutoSelectManualPauseMs() {
    const autoSelect = this.config?.auto_select
    if (autoSelect && typeof autoSelect === 'object') {
      const manualPause = Number(
        autoSelect.manual_pause_ms ?? autoSelect.cooldown_ms
      )
      if (Number.isFinite(manualPause) && manualPause >= 0) return manualPause
    }

    return DEFAULT_AUTO_SELECT_MANUAL_PAUSE_MS
  }

  private pauseAutoSelectAfterManualSelection() {
    this.lastManualSelectionAt = Date.now()
    this.clearAutoSelectResumeTimer()

    if (!this.isRecentActivityAutoSelectEnabled()) return

    this.autoSelectResumeTimer = window.setTimeout(() => {
      this.autoSelectResumeTimer = undefined
      this.lastManualSelectionAt = 0

      if (!this.isRecentActivityAutoSelectEnabled() || this.menuOpen) return

      this.selectMostRecentStateActivity()
    }, this.getAutoSelectManualPauseMs())
  }

  private getActivitySignature(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    if (!state) return ''

    const domain = getDomain(target.entity)
    const attributes = state.attributes ?? {}
    const action = getEntityAction(state) ?? ''
    const keys =
      domain === 'climate'
        ? [
            'hvac_action',
            'temperature',
            'target_temp_low',
            'target_temp_high',
            'preset_mode',
            'fan_mode',
            'swing_mode',
            'swing_horizontal_mode',
            'swing_vertical_mode',
          ]
        : domain === 'fan'
          ? ['percentage', 'preset_mode', 'direction', 'oscillating']
          : domain === 'humidifier'
            ? ['action', 'humidity', 'mode']
            : []

    const parts = [`state:${state.state}`, `action:${action}`]
    keys.forEach((key) => {
      parts.push(`${key}:${JSON.stringify(attributes[key] ?? null)}`)
    })

    return parts.join('|')
  }

  private getActivityTimestamp(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    const activeRank = this.getActivityActiveRank(target)
    const value =
      activeRank > 1
        ? state?.last_updated ?? state?.last_changed
        : state?.last_changed ?? state?.last_updated
    const timestamp = typeof value === 'string' ? Date.parse(value) : NaN
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  private getActivityCandidate(
    target: GroupTarget,
    timestamp = this.getActivityTimestamp(target)
  ): ActivityCandidate {
    return {
      target,
      timestamp,
      activeRank: this.getActivityActiveRank(target),
    }
  }

  private isBetterActivityCandidate(
    candidate: ActivityCandidate,
    selected?: ActivityCandidate
  ) {
    if (!selected) return true
    if (candidate.activeRank !== selected.activeRank) {
      return candidate.activeRank > selected.activeRank
    }

    return candidate.timestamp >= selected.timestamp
  }

  private getMostRecentStateActivityCandidate() {
    return this.targets
      .map((target) => this.getActivityCandidate(target))
      .filter((candidate) => candidate.timestamp > 0)
      .reduce<ActivityCandidate | undefined>((selected, candidate) => {
        return this.isBetterActivityCandidate(candidate, selected)
          ? candidate
          : selected
      }, undefined)
  }

  private applyPersistedActivitySelection(nextSignatures: Map<string, string>) {
    if (
      this.persistedActivityApplied ||
      !this.config ||
      !this.isRecentActivityAutoSelectEnabled()
    ) {
      return
    }

    this.persistedActivityApplied = true

    const stored = this.readStoredActivity(this.config)
    if (!stored) {
      this.selectMostRecentStateActivity(nextSignatures)
      return
    }

    const valid = this.targets.some((target) => target.entity === stored.entity)
    if (!valid) {
      this.selectMostRecentStateActivity(nextSignatures)
      return
    }

    const storedTarget = this.targets.find(
      (target) => target.entity === stored.entity
    )
    const currentSignature = nextSignatures.get(stored.entity)
    if (storedTarget && currentSignature && currentSignature === stored.signature) {
      const storedCandidate = this.getActivityCandidate(
        storedTarget,
        stored.timestamp
      )
      const latest = this.getMostRecentStateActivityCandidate()
      if (latest && this.isBetterActivityCandidate(latest, storedCandidate)) {
        this.selectMostRecentStateActivity(nextSignatures)
        return
      }

      this.selectEntity(stored.entity, false)
      return
    }

    this.selectMostRecentStateActivity(nextSignatures)
  }

  private selectMostRecentStateActivity(
    nextSignatures?: Map<string, string>
  ) {
    const latest = this.getMostRecentStateActivityCandidate()

    if (latest && latest.target.entity !== this.selectedEntity) {
      this.selectEntity(latest.target.entity, false)
    }

    if (latest && nextSignatures) {
      const signature = nextSignatures.get(latest.target.entity)
      if (signature) {
        this.writeStoredActivity({
          entity: latest.target.entity,
          signature,
          timestamp: latest.timestamp,
        })
      }
    }
  }

  private getActivityActiveRank(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    if (!state) return 0

    const domain = getDomain(target.entity)
    const action = getEntityAction(state) ?? state.attributes?.action
    const normalizedState =
      typeof state.state === 'string' ? state.state.toLowerCase() : ''
    const normalizedAction =
      typeof action === 'string' ? action.toLowerCase() : ''

    if (domain === 'climate') {
      if (['heating', 'cooling', 'drying'].includes(normalizedAction)) {
        return 2
      }

      return normalizedState && normalizedState !== 'off' ? 1 : 0
    }

    if (domain === 'fan') {
      const percentage = Number(state.attributes?.percentage)
      if (normalizedState === 'on' || percentage > 0) return 2
      return 0
    }

    if (domain === 'humidifier') {
      if (['drying', 'humidifying'].includes(normalizedAction)) {
        return 2
      }

      return normalizedState && !['off', 'idle'].includes(normalizedState)
        ? 1
        : 0
    }

    return normalizedState && normalizedState !== 'off' ? 1 : 0
  }

  private syncAutoSelectRecentActivity() {
    if (!this.config || !this.hass || !this.targets.length) return

    const changedTargets: ActivityCandidate[] = []
    const nextSignatures = new Map<string, string>()

    this.targets.forEach((target) => {
      const signature = this.getActivitySignature(target)
      nextSignatures.set(target.entity, signature)

      if (
        this.activitySignaturesInitialized &&
        signature &&
        signature !== this.activitySignatures.get(target.entity)
      ) {
        this.writeStoredActivity({
          entity: target.entity,
          signature,
          timestamp: Date.now(),
        })
        changedTargets.push(this.getActivityCandidate(target, Date.now()))
      }
    })

    this.activitySignatures = nextSignatures
    if (!this.activitySignaturesInitialized) {
      this.activitySignaturesInitialized = true
      this.applyPersistedActivitySelection(nextSignatures)
      return
    }

    if (
      !changedTargets.length ||
      !this.isRecentActivityAutoSelectEnabled() ||
      this.menuOpen ||
      Date.now() - this.lastManualSelectionAt < this.getAutoSelectManualPauseMs()
    ) {
      return
    }

    const latest = changedTargets.reduce((selected, candidate) =>
      this.isBetterActivityCandidate(candidate, selected) ? candidate : selected
    )
    this.selectEntity(latest.target.entity, false)
  }

  private getTargetLabel(target: GroupTarget) {
    const parsedHeader = this.parseTargetHeader(target)
    if (parsedHeader && typeof parsedHeader.name === 'string') {
      return parsedHeader.name
    }

    const state = this.hass?.states?.[target.entity]
    if (state && typeof this.hass?.formatEntityName === 'function') {
      return this.hass.formatEntityName(state)
    }

    return state?.attributes?.friendly_name ?? target.entity
  }

  private getTargetIcon(target: GroupTarget) {
    const selector = this.config?.selector ?? DEFAULT_SELECTOR
    if (!selector.icons) return ''

    const parsedHeader = this.parseTargetHeader(target)
    if (parsedHeader && parsedHeader.icon) {
      return this.resolveHeaderIcon(parsedHeader.icon, target)
    }

    const state = this.hass?.states?.[target.entity]
    if (state?.attributes?.icon) return state.attributes.icon

    const domain = getDomain(target.entity)
    if (domain === 'fan') return 'mdi:fan'
    if (domain === 'humidifier') return 'mdi:air-humidifier'
    return 'mdi:air-conditioner'
  }

  private getTargetHeaderData(target: GroupTarget) {
    return this.parseTargetHeader(target)
  }

  private parseTargetHeader(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    if (!state || !this.hass) return null

    const config = this.getTargetCardConfig(target)
    return parseHeader(
      config.header,
      state,
      this.hass,
      config.enhanced_visuals !== false
    )
  }

  private resolveHeaderIcon(icon: unknown, target: GroupTarget) {
    if (typeof icon === 'string') return icon
    if (!icon || typeof icon !== 'object') return ''

    const state = this.hass?.states?.[target.entity]
    if (!state) return ''

    const action = getEntityAction(state) || String(state.state)
    const resolved = (icon as LooseObject)[action]
    return typeof resolved === 'string' ? resolved : ''
  }

  private getHeaderToggleConfigs(target: GroupTarget) {
    const header = target.config.header
    if (!header || typeof header !== 'object') return []

    return [
      ...(header.toggle ? [header.toggle] : []),
      ...(Array.isArray(header.toggles) ? header.toggles : []),
    ].filter((toggle) => toggle?.entity && this.hass?.states?.[toggle.entity])
  }

  private getEmbeddedConfig() {
    const target = this.getSelectedTarget()
    return this.getTargetCardConfig(target)
  }

  private getTargetCardConfig(target: GroupTarget) {
    return {
      ...(this.config?.card ?? {}),
      ...target.config,
      entity: target.entity,
      type: target.config.type ?? `custom:${CARD_NAME}`,
    }
  }

  private syncEmbeddedCard() {
    if (!this.config || !this.hass) return

    const host = this.renderRoot.querySelector('.embedded-card-host')
    if (!host) return

    const embeddedConfig = this.getEmbeddedConfig()

    if (!this.embeddedCard) {
      this.embeddedCard = window.document.createElement(CARD_NAME) as HTMLElement & {
        hass?: HASS
        setConfig?: (config: LooseObject) => void
      }
      host.replaceChildren(this.embeddedCard)
    }

    if (typeof this.embeddedCard.setConfig === 'function') {
      this.embeddedCard.setConfig(embeddedConfig)
    }
    this.embeddedCard.hass = this.hass
    this.syncEmbeddedPresentation()
  }

  private syncEmbeddedPresentation() {
    const embedded = this.embeddedCard as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | undefined
    const updateComplete = embedded?.updateComplete ?? Promise.resolve()

    updateComplete
      .catch(() => undefined)
      .then(() =>
        window.requestAnimationFrame(() => this.applyEmbeddedPresentation())
      )
  }

  private applyEmbeddedPresentation() {
    const host = this.renderRoot.querySelector(
      '.embedded-card-host'
    ) as HTMLElement | null
    const root = this.embeddedCard?.shadowRoot
    const card = root?.querySelector('ha-card') as HTMLElement | null
    const header = root?.querySelector('header') as HTMLElement | null

    if (!host || !card) return

    host.style.removeProperty('--st-group-cropped-header-height')

    if (header) {
      header.style.visibility = 'hidden'
      header.style.pointerEvents = 'none'
    }

    if (this.fadeInAfterSync) {
      this.fadeInAfterSync = false
      window.requestAnimationFrame(() => {
        this.cardFading = false
      })
    }
  }

  private selectEntity(entity: string, manual = true) {
    if (entity === this.selectedEntity) return

    this.menuOpen = false
    if (manual) this.pauseAutoSelectAfterManualSelection()

    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (!this.embeddedCard || prefersReducedMotion) {
      this.fadeInAfterSync = false
      this.cardFading = false
      this.selectedEntity = entity
      if (manual) this.writeStoredSelection(entity)
      return
    }

    this.cardFading = true
    this.fadeInAfterSync = true
    this.selectedEntity = entity
    if (manual) this.writeStoredSelection(entity)
  }

  private selectOffset(offset: number) {
    if (this.targets.length < 2) return

    const next =
      (this.getSelectedIndex() + offset + this.targets.length) %
      this.targets.length
    this.selectEntity(this.targets[next].entity)
  }

  private toggleHeaderEntity(ev: Event, entityId: string) {
    ev.stopPropagation()
    const checked = Boolean((ev.target as HTMLInputElement).checked)
    this.hass?.callService?.('homeassistant', `turn_${checked ? 'on' : 'off'}`, {
      entity_id: entityId,
    })
  }

  private renderHeaderToggles(target: GroupTarget) {
    const toggles = this.getHeaderToggleConfigs(target)
    if (!toggles.length) return nothing

    return html`
      <div class="group-toggles">
        ${toggles.map((toggle) => {
          const state = this.hass?.states?.[toggle.entity]
          const label =
            toggle.name === true
              ? state?.attributes?.friendly_name
              : typeof toggle.name === 'string'
                ? toggle.name
                : state?.attributes?.friendly_name
          const icon = toggle.icon || state?.attributes?.icon

          return html`
            <div class="group-toggle">
              <ha-switch
                .checked=${state?.state === 'on'}
                @change=${(ev: Event) =>
                  this.toggleHeaderEntity(ev, toggle.entity)}
              ></ha-switch>
              ${icon
                ? html`<ha-icon
                    title=${label || toggle.entity}
                    icon=${icon}
                  ></ha-icon>`
                : label
                  ? html`<span class="group-toggle-label">${label}</span>`
                  : nothing}
              ${label && icon
                ? html`<span class="group-toggle-label" title=${label}
                    >${label}</span
                  >`
                : nothing}
            </div>
          `
        })}
      </div>
    `
  }

  private toggleMenu() {
    if (this.targets.length < 2) return
    this.menuOpen = !this.menuOpen
  }

  private clearOutsideClickListener() {
    this.removeOutsideClickListener?.()
    this.removeOutsideClickListener = undefined
  }

  private syncTitleFit() {
    window.requestAnimationFrame(() => {
      const title = this.renderRoot.querySelector(
        '.group-title'
      ) as HTMLElement | null
      if (!title) return

      title.style.removeProperty('--st-group-title-fit-size')
      title.style.removeProperty('--st-group-title-fit-line-height')

      const availableWidth = title.clientWidth
      const requiredWidth = title.scrollWidth
      if (!availableWidth || requiredWidth <= availableWidth) return

      const styles = window.getComputedStyle(title)
      const baseSize = Number.parseFloat(styles.fontSize) || 24
      const fittedSize = Math.max(
        14,
        Math.floor(baseSize * (availableWidth / requiredWidth) * 100) / 100
      )

      title.style.setProperty('--st-group-title-fit-size', `${fittedSize}px`)
      title.style.setProperty(
        '--st-group-title-fit-line-height',
        `${fittedSize}px`
      )
    })
  }

  private syncOutsideClickListener() {
    if (!this.menuOpen) {
      this.clearOutsideClickListener()
      return
    }

    if (this.removeOutsideClickListener) return

    const closeOnOutsideClick = (ev: PointerEvent) => {
      const path = ev.composedPath()
      if (path.includes(this)) return

      this.menuOpen = false
    }

    window.addEventListener('pointerdown', closeOnOutsideClick, {
      capture: true,
    })
    this.removeOutsideClickListener = () =>
      window.removeEventListener('pointerdown', closeOnOutsideClick, {
        capture: true,
      } as EventListenerOptions)
  }

  private renderPicker() {
    if (!this.menuOpen) return nothing

    return html`
      <div class="group-picker" role="menu">
        ${this.targets.map((target) => {
          const label = this.getTargetLabel(target)
          const icon = this.getTargetIcon(target)
          const selected = target.entity === this.selectedEntity

          return html`
            <button
              type="button"
              role="menuitemradio"
              aria-checked=${selected ? 'true' : 'false'}
              class=${selected ? 'selected' : ''}
              @click=${() => this.selectEntity(target.entity)}
            >
              ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}
              <span>${label}</span>
            </button>
          `
        })}
      </div>
    `
  }

  private renderHeaderIcon(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    const header = this.getTargetHeaderData(target)
    if (!state || !header || !header.icon) return nothing

    const action = getEntityAction(state) || String(state.state)
    const icon =
      typeof header.icon === 'object'
        ? header.icon?.[action] ?? false
        : header.icon
    if (!icon) return nothing

    const actionClass =
      action && action !== state.state ? ` ${safeClass(action)}` : ''
    const stateClass = safeClass(state.state)

    return html`
      <span
        class="header__icon-wrap ${stateClass}${actionClass} ${header.slashOffIcon
          ? 'slash-off'
          : ''}"
      >
        <ha-icon
          class="header__icon ${stateClass}${actionClass}"
          .icon=${icon}
        ></ha-icon>
      </span>
    `
  }

  private renderSelector() {
    const target = this.getSelectedTarget()
    const index = this.getSelectedIndex()
    const label = this.getTargetLabel(target)

    return html`
      <div class="group-selector">
        <div class="group-header-content">
          <div class="header__main">
            ${this.renderHeaderIcon(target)}
            <div class="group-title header__title" title=${label}>${label}</div>
          </div>
          ${this.renderHeaderToggles(target)}
        </div>
        <div class="group-nav-cluster">
          <button
            class="group-nav previous"
            type="button"
            aria-label="Previous device"
            ?disabled=${this.targets.length < 2}
            @click=${() => this.selectOffset(-1)}
          >
            <ha-icon icon="mdi:chevron-left"></ha-icon>
          </button>
          <button
            class="group-nav next"
            type="button"
            aria-label="Next device"
            ?disabled=${this.targets.length < 2}
            @click=${() => this.selectOffset(1)}
          >
            <ha-icon icon="mdi:chevron-right"></ha-icon>
          </button>
          <span class="group-count">${index + 1} / ${this.targets.length}</span>
          <button
            class="group-menu"
            type="button"
            aria-label="Select device"
            aria-haspopup="menu"
            aria-expanded=${this.menuOpen ? 'true' : 'false'}
            ?disabled=${this.targets.length < 2}
            @click=${() => this.toggleMenu()}
          >
            <ha-icon icon="mdi:dots-vertical"></ha-icon>
          </button>
        </div>
        ${this.renderPicker()}
      </div>
    `
  }

  render() {
    if (!this.config) return html`<ha-card></ha-card>`

    return html`
      <div class=${this.getGroupCardClasses()} style=${this.getGroupCardStyle()}>
        ${this.renderSelector()}
        <div
          class=${`embedded-card-host${this.cardFading ? ' fading' : ''}`}
        ></div>
      </div>
    `
  }
}
