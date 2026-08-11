import { LitElement, html, css, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { name as CARD_NAME } from '../package.json'
import { CardConfig } from './config/card'
import parseHeader from './config/header'
import { getEntityAction } from './entityAction'
import fireEvent from './fireEvent'
import { HASS, LooseObject } from './types'

type AutoSelectMode = 'off' | 'recent_activity'
type SelectorStyle = 'header' | 'tabs'

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
    style?: SelectorStyle
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

interface StoredSelection {
  entity: string
  timestamp: number
}

type LovelaceCardElement = HTMLElement & {
  hass?: HASS
  setConfig?: (config: LooseObject) => void
  updateComplete?: Promise<unknown>
}

interface LovelaceCardHelpers {
  createCardElement(config: LooseObject): LovelaceCardElement
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<LovelaceCardHelpers>
  }
}

const DEFAULT_SELECTOR = {
  style: 'header' as SelectorStyle,
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
  private embeddedCard?: LovelaceCardElement
  private embeddedCardEntity = ''
  private embeddedCardConfigSignature = ''
  private embeddedCardPendingSignature = ''
  private cardHelpersPromise?: Promise<LovelaceCardHelpers>
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
        grid-template-columns: minmax(0, 1fr) 96px;
        grid-template-rows: var(--st-group-header-control-height, 34px);
        grid-template-areas: 'content nav';
        align-items: start;
        gap: 4px;
        padding: calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 4)
          calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 2) 0
          calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 4);
        color: var(--primary-text-color);
        position: absolute;
        z-index: 2;
        inset: 0 0 auto 0;
        height: calc(
          var(--st-group-header-control-height, 34px) +
            calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 4)
        );
        min-width: 0;
        box-sizing: border-box;
        transform: translateY(var(--st-group-header-top-buffer, 2px));
      }

      .group-selector.tabs {
        display: block;
        padding: calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 3)
          calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 3) 0;
        height: auto;
        transform: translateY(var(--st-group-header-top-buffer, 2px));
      }

      .group-tabs {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(var(--st-group-tab-min-width, 120px), 1fr)
        );
        gap: calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 2);
        min-width: 0;
      }

      .group-tab {
        appearance: none;
        border: 0;
        border-radius: var(--st-group-tab-radius, 10px);
        min-width: 0;
        min-height: var(--st-group-tab-height, 46px);
        padding: 7px 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--st-group-tab-color, var(--primary-text-color));
        background: var(
          --st-group-tab-background,
          color-mix(in srgb, var(--primary-text-color) 12%, transparent)
        );
        font: inherit;
        font-weight: 600;
        line-height: 1.15;
        cursor: pointer;
        transition:
          background 160ms var(--st-motion-ease, ease),
          color 160ms var(--st-motion-ease, ease),
          opacity 160ms var(--st-motion-ease, ease);
      }

      .group-tab:hover,
      .group-tab:focus-visible {
        background: var(
          --st-group-tab-hover-background,
          color-mix(in srgb, currentColor 22%, transparent)
        );
      }

      .group-tab:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      .group-tab.selected {
        color: var(--st-group-tab-selected-color, #fff);
        background: var(
          --st-group-tab-selected-background,
          var(--primary-color)
        );
      }

      .group-tab ha-icon {
        --mdc-icon-size: 21px;
        --iron-icon-width: 21px;
        --iron-icon-height: 21px;
        flex: 0 0 auto;
      }

      .group-tab-labels {
        display: grid;
        min-width: 0;
        gap: 1px;
        text-align: center;
      }

      .group-tab-name,
      .group-tab-state {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .group-tab-state {
        color: currentColor;
        opacity: 0.78;
        font-size: var(--ha-font-size-xs, 11px);
        font-weight: 500;
      }

      .group-tab.state-off {
        --st-group-tab-background: color-mix(
          in srgb,
          var(--state-icon-color, var(--secondary-text-color)) 20%,
          transparent
        );
        --st-group-tab-color: var(--secondary-text-color);
      }

      .group-tab.cooling,
      .group-tab.state-cool {
        --st-group-tab-background: color-mix(
          in srgb,
          var(--state-climate-cool-color, var(--cool-color, #2b9af9)) 22%,
          transparent
        );
        --st-group-tab-color: var(
          --state-climate-cool-color,
          var(--cool-color, #2b9af9)
        );
        --st-group-tab-selected-background: var(
          --state-climate-cool-color,
          var(--cool-color, #2b9af9)
        );
      }

      .group-tab.heating,
      .group-tab.state-heat {
        --st-group-tab-background: color-mix(
          in srgb,
          var(--state-climate-heat-color, var(--heat-color, #ff8100)) 22%,
          transparent
        );
        --st-group-tab-color: var(
          --state-climate-heat-color,
          var(--heat-color, #ff8100)
        );
        --st-group-tab-selected-background: var(
          --state-climate-heat-color,
          var(--heat-color, #ff8100)
        );
      }

      .group-tab.drying,
      .group-tab.state-dry {
        --st-group-tab-background: color-mix(
          in srgb,
          var(--state-climate-dry-color, var(--dry-color, #efbd07)) 24%,
          transparent
        );
        --st-group-tab-color: var(
          --state-climate-dry-color,
          var(--dry-color, #efbd07)
        );
        --st-group-tab-selected-background: var(
          --state-climate-dry-color,
          var(--dry-color, #efbd07)
        );
      }

      .group-tab.domain-fan:not(.state-off),
      .group-tab.humidifying {
        --st-group-tab-background: color-mix(
          in srgb,
          var(--primary-color) 22%,
          transparent
        );
        --st-group-tab-color: var(--primary-color);
        --st-group-tab-selected-background: var(--primary-color);
      }

      .group-title {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: clip;
        white-space: nowrap;
        transition: color 180ms var(--st-motion-ease, ease);
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
        align-self: start;
        height: var(--st-group-header-control-height, 34px);
        min-width: 0;
      }

      .group-nav-cluster {
        grid-area: nav;
        justify-self: end;
        align-self: start;
        width: 96px;
        display: grid;
        grid-template-columns: auto auto auto;
        grid-template-areas: 'prev next menu';
        align-items: center;
        justify-items: center;
        column-gap: 4px;
        margin-left: 4px;
      }

      .group-nav,
      .group-menu {
        flex: 0 0 auto;
        appearance: none;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--primary-text-color);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        padding: 0;
        cursor: pointer;
      }

      .group-nav:hover:not(:disabled),
      .group-nav:focus-visible,
      .group-menu:hover,
      .group-menu:focus-visible {
        background: color-mix(
          in srgb,
          var(--primary-text-color) 10%,
          transparent
        );
      }

      .group-nav ha-icon,
      .group-menu ha-icon {
        --mdc-icon-size: 24px;
        --iron-icon-width: 24px;
        --iron-icon-height: 24px;
      }

      .group-nav:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .group-menu {
        grid-area: menu;
        width: 20px;
        height: 34px;
        color: var(--secondary-text-color);
      }

      .group-menu ha-icon {
        --mdc-icon-size: 22px;
        --iron-icon-width: 22px;
        --iron-icon-height: 22px;
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
        grid-template-columns: auto minmax(0, 1fr) auto;
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

      .group-picker button.selected {
        color: var(--primary-color);
      }

      .group-picker ha-icon {
        --mdc-icon-size: 22px;
        --iron-icon-width: 22px;
        --iron-icon-height: 22px;
        color: var(--primary-color);
      }

      .group-picker .icon-placeholder {
        width: 22px;
        height: 22px;
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

      .header__main.clickable {
        cursor: pointer;
      }

      .header__main.clickable:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
        border-radius: 4px;
      }

      .header__main.clickable:focus-visible .header__title {
        color: var(--st-interactive-tint, var(--primary-color));
      }

      @media (hover: hover) {
        .header__main.clickable:hover .header__title {
          color: var(--st-interactive-tint, var(--primary-color));
        }
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

  getCardSize() {
    if (!this.config || !this.targets.length) return 1

    const target = this.getSelectedTarget()
    const cardConfig = this.getTargetCardConfig(target)
    const entityCount = Array.isArray(cardConfig.entities)
      ? cardConfig.entities.length
      : 0
    const entityRows = entityCount ? Math.max(1, Math.ceil(entityCount / 2)) : 0
    const modeRows = this.getConfiguredModeRowCount(cardConfig)
    const setpointRows = cardConfig.hide_setpoint === true ? 0 : 1

    return Math.max(2, 1 + entityRows + setpointRows + modeRows)
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
    return this.readStoredSelectionRecord(config)?.entity ?? ''
  }

  private readStoredSelectionRecord(config: GroupConfig): StoredSelection | undefined {
    try {
      const value = window.localStorage?.getItem(this.getStorageKey(config))
      if (!value) return undefined

      if (!value.trim().startsWith('{')) {
        return {
          entity: value,
          timestamp: 0,
        }
      }

      const parsed = JSON.parse(value) as Partial<StoredSelection>
      if (typeof parsed.entity === 'string') {
        return {
          entity: parsed.entity,
          timestamp: Number.isFinite(parsed.timestamp)
            ? Number(parsed.timestamp)
            : 0,
        }
      }
    } catch (_err) {
      return undefined
    }

    return undefined
  }

  private writeStoredSelection(entity: string) {
    if (!this.config || this.config.remember_selection === false) return

    try {
      window.localStorage?.setItem(
        this.getStorageKey(this.config),
        JSON.stringify({
          entity,
          timestamp: Date.now(),
        })
      )
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

  private getConfiguredModeRowCount(cardConfig: LooseObject) {
    const control = cardConfig.control

    if (control === false) return 0
    if (Array.isArray(control)) {
      return control.filter(Boolean).length
    }
    if (control && typeof control === 'object') {
      return Object.entries(control).filter(
        ([key, value]) => !key.startsWith('_') && value !== false
      ).length
    }

    return 1
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

  private openSelectedPopover() {
    const target = this.getSelectedTarget()
    if (!target?.entity) return

    fireEvent(this, 'hass-more-info', {
      entityId: target.entity,
    })
  }

  private onSelectorHeaderKeyDown(ev: KeyboardEvent) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return

    ev.preventDefault()
    this.openSelectedPopover()
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

  private getTargetClasses(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    if (!state) return ''

    const domain = getDomain(state.entity_id)
    const action = getEntityAction(state)
    return [
      `domain-${safeClass(domain)}`,
      `state-${safeClass(state.state)}`,
      safeClass(action),
    ]
      .filter(Boolean)
      .join(' ')
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

    const storedSelection = this.readStoredSelectionRecord(this.config)
    const validStoredSelection =
      storedSelection &&
      this.targets.some((target) => target.entity === storedSelection.entity)
    const latest = this.getMostRecentStateActivityCandidate()
    if (
      validStoredSelection &&
      (!latest || latest.timestamp <= storedSelection.timestamp)
    ) {
      this.selectEntity(storedSelection.entity, false)
      return
    }

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

  private getEmbeddedConfigSignature(config: LooseObject) {
    return JSON.stringify(config, (_key, value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value
      }

      return Object.keys(value)
        .sort()
        .reduce<LooseObject>((result, key) => {
          result[key] = value[key]
          return result
        }, {})
    })
  }

  private getTargetCardConfig(target: GroupTarget): LooseObject {
    const commonConfig = (this.config?.card ?? {}) as LooseObject
    const sourceConfig = this.getSourceTargetConfig(target)
    const targetConfig = target.config
    const mergedConfig = {
      ...commonConfig,
      ...sourceConfig,
      ...targetConfig,
    }

    if (!mergedConfig.card_mod) {
      const fallbackCardMod = this.getFallbackCardMod()
      if (fallbackCardMod) mergedConfig.card_mod = fallbackCardMod
    }

    return {
      ...mergedConfig,
      embedded: true,
      entity: target.entity,
      type: target.config.type ?? `custom:${CARD_NAME}`,
    }
  }

  private getSourceTargetConfig(target: GroupTarget): LooseObject {
    const sourceTargets = this.config?.cards ?? this.config?.entities ?? []
    const source = sourceTargets.find(
      (item) =>
        !!item &&
        typeof item === 'object' &&
        (item as LooseObject).entity === target.entity
    )

    return source && typeof source === 'object' ? (source as LooseObject) : {}
  }

  private getFallbackCardMod() {
    const commonCardMod = ((this.config?.card ?? {}) as LooseObject).card_mod
    if (commonCardMod) return commonCardMod

    const sourceTargets = this.config?.cards ?? this.config?.entities ?? []
    const styledTarget = sourceTargets.find(
      (item) => !!item && typeof item === 'object' && !!(item as LooseObject).card_mod
    ) as LooseObject | undefined

    return styledTarget?.card_mod
  }

  private getCardHelpers() {
    if (!this.cardHelpersPromise) {
      this.cardHelpersPromise =
        typeof window.loadCardHelpers === 'function'
          ? window.loadCardHelpers()
          : Promise.reject(new Error('Home Assistant card helpers unavailable'))
    }

    return this.cardHelpersPromise
  }

  private createFallbackEmbeddedCardElement(config: LooseObject) {
    const element = window.document.createElement(CARD_NAME) as LovelaceCardElement
    if (typeof element.setConfig === 'function') {
      element.setConfig(config)
      return element
    }

    return undefined
  }

  private installEmbeddedCard(
    host: Element,
    embedded: LovelaceCardElement | undefined,
    embeddedConfig: LooseObject,
    configSignature: string
  ) {
    if (!this.config || !this.hass) return
    if (!embedded || typeof embedded.setConfig !== 'function') {
      this.embeddedCardPendingSignature = ''
      return
    }
    if (this.getEmbeddedConfigSignature(this.getEmbeddedConfig()) !== configSignature) {
      return
    }

    this.embeddedCard = embedded
    this.embeddedCardEntity = String(embeddedConfig.entity ?? '')
    this.embeddedCardConfigSignature = configSignature
    this.embeddedCardPendingSignature = ''
    host.replaceChildren(embedded)

    if (typeof embedded.setConfig === 'function') {
      embedded.setConfig(embeddedConfig)
    }
    embedded.hass = this.hass
    this.syncEmbeddedPresentation()
  }

  private syncEmbeddedCard() {
    if (!this.config || !this.hass) return

    const host = this.renderRoot.querySelector('.embedded-card-host')
    if (!host) return

    const embeddedConfig = this.getEmbeddedConfig()
    const configSignature = this.getEmbeddedConfigSignature(embeddedConfig)

    if (
      !this.embeddedCard ||
      this.embeddedCardEntity !== embeddedConfig.entity ||
      this.embeddedCardConfigSignature !== configSignature
    ) {
      if (typeof window.loadCardHelpers !== 'function') {
        const fallback = window.customElements.get(CARD_NAME)
          ? this.createFallbackEmbeddedCardElement(embeddedConfig)
          : undefined

        if (!fallback) {
          this.embeddedCardPendingSignature = ''
          return
        }

        this.installEmbeddedCard(
          host,
          fallback,
          embeddedConfig,
          configSignature
        )
        return
      }

      if (this.embeddedCardPendingSignature === configSignature) return
      this.embeddedCardPendingSignature = configSignature

      this.getCardHelpers()
        .then((helpers) => helpers.createCardElement(embeddedConfig))
        .catch(() => {
          const fallback = window.customElements.get(CARD_NAME)
            ? this.createFallbackEmbeddedCardElement(embeddedConfig)
            : undefined
          return fallback
        })
        .then((embedded) =>
          this.installEmbeddedCard(
            host,
            embedded,
            embeddedConfig,
            configSignature
          )
        )
      return
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
    const selector = this.renderRoot.querySelector(
      '.group-selector'
    ) as HTMLElement | null
    const embedded = this.embeddedCard as HTMLElement | undefined

    if (!host || !embedded) return

    host.style.removeProperty('--st-group-cropped-header-height')
    embedded.style.setProperty(
      '--st-group-embedded-header-min-height',
      this.getEmbeddedHeaderReserve(embedded, selector)
    )

    if (this.fadeInAfterSync) {
      this.fadeInAfterSync = false
      window.requestAnimationFrame(() => {
        this.cardFading = false
      })
    }
  }

  private getEmbeddedHeaderReserve(
    embedded: HTMLElement,
    selector: HTMLElement | null
  ) {
    const fallback =
      'calc(var(--st-group-header-control-height, 34px) + var(--st-group-header-top-buffer, 2px) + calc(var(--st-spacing, var(--st-default-spacing, 4px)) * 6))'
    const minimum = this.getEmbeddedHeaderReserveMinimum()

    if (!selector) return fallback

    const embeddedRect = embedded.getBoundingClientRect()
    const selectorRect = selector.getBoundingClientRect()
    const measured = Math.ceil(selectorRect.bottom - embeddedRect.top + 8)
    const reserve = Math.max(measured, minimum)

    return Number.isFinite(reserve) && reserve > 24 ? `${reserve}px` : fallback
  }

  private getEmbeddedHeaderReserveMinimum() {
    const styles = getComputedStyle(this)
    const controlHeight =
      parseFloat(styles.getPropertyValue('--st-group-header-control-height')) ||
      34
    const topBuffer =
      parseFloat(styles.getPropertyValue('--st-group-header-top-buffer')) || 2
    const spacing =
      parseFloat(styles.getPropertyValue('--st-spacing')) ||
      parseFloat(styles.getPropertyValue('--st-default-spacing')) ||
      4

    return Math.ceil(controlHeight + topBuffer + spacing * 4)
  }

  private selectEntity(entity: string, manual = true) {
    this.menuOpen = false
    if (entity === this.selectedEntity) return

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
              ${icon
                ? html`<ha-icon icon=${icon}></ha-icon>`
                : html`<span class="icon-placeholder"></span>`}
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

  private getTargetStateLabel(target: GroupTarget) {
    const state = this.hass?.states?.[target.entity]
    if (!state) return ''

    if (typeof this.hass?.formatEntityState === 'function') {
      return this.hass.formatEntityState(state)
    }

    return String(state.state)
  }

  private renderTabSelector() {
    const selector = this.config?.selector ?? DEFAULT_SELECTOR

    return html`
      <div class="group-selector tabs">
        <div class="group-tabs" role="tablist">
          ${this.targets.map((target) => {
            const label = this.getTargetLabel(target)
            const icon = this.getTargetIcon(target)
            const selected = target.entity === this.selectedEntity
            const stateLabel = selector.states
              ? this.getTargetStateLabel(target)
              : ''

            return html`
              <button
                class=${[
                  'group-tab',
                  this.getTargetClasses(target),
                  selected && 'selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="button"
                role="tab"
                aria-selected=${selected ? 'true' : 'false'}
                title=${label}
                @click=${() => this.selectEntity(target.entity)}
              >
                ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}
                ${selector.names !== false
                  ? html`
                      <span class="group-tab-labels">
                        <span class="group-tab-name">${label}</span>
                        ${stateLabel
                          ? html`<span class="group-tab-state"
                              >${stateLabel}</span
                            >`
                          : nothing}
                      </span>
                    `
                  : nothing}
              </button>
            `
          })}
        </div>
      </div>
    `
  }

  private renderSelector() {
    if (this.config?.selector?.style === 'tabs') {
      return this.renderTabSelector()
    }

    const target = this.getSelectedTarget()
    const label = this.getTargetLabel(target)

    return html`
      <div class="group-selector">
        <div class="group-header-content">
          <div
            class="header__main clickable"
            role="button"
            tabindex="0"
            @click=${() => this.openSelectedPopover()}
            @keydown=${(ev: KeyboardEvent) => this.onSelectorHeaderKeyDown(ev)}
          >
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
      <div
        class=${this.getGroupCardClasses()}
        style=${this.getGroupCardStyle()}
      >
        ${this.renderSelector()}
        <div
          class=${`embedded-card-host${this.cardFading ? ' fading' : ''}`}
        ></div>
      </div>
    `
  }
}
