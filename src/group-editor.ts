import { LitElement, html, css, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { ref } from 'lit/directives/ref.js'
import { name as CARD_NAME } from '../package.json'
import fireEvent from './fireEvent'
import { HASS } from './types'
import { GroupConfig, GroupTargetConfig } from './group'

type EditableTarget = Record<string, any> & {
  entity: string
  name?: string
  icon?: string
}

const SUPPORTED_DOMAINS = ['climate', 'fan', 'humidifier']
const DEFAULT_SELECTOR = {
  style: 'header',
  icons: true,
  names: true,
  states: false,
}

function toEditableTarget(target: GroupTargetConfig): EditableTarget {
  if (typeof target === 'string') return { entity: target }
  const header =
    target?.header && typeof target.header === 'object' ? target.header : {}

  return {
    ...target,
    entity: target?.entity ?? '',
    name: target?.name ?? header.name,
    icon: target?.icon ?? header.icon,
  }
}

function normalizeTargets(config: GroupConfig): Array<EditableTarget> {
  const targets = (config.cards ?? config.entities ?? []).map(toEditableTarget)
  return targets.length ? targets : [{ entity: '' }, { entity: '' }]
}

export default class SimpleThermostatGroupEditor extends LitElement {
  @property({ attribute: false }) hass?: HASS
  @state() private config: GroupConfig = { entities: [] }
  @state() private expandedTargetIndex: number | null = null

  private editorConfigKeys = new WeakMap<Element, string>()

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .section {
        display: grid;
        gap: 16px;
      }

      .target {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: end;
        padding: 12px;
        border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
        border-radius: 8px;
      }

      .editor-section {
        display: grid;
        gap: 10px;
      }

      .section-heading {
        display: grid;
        gap: 2px;
      }

      .section-heading h3 {
        margin: 0;
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-l, 16px);
        font-weight: 500;
      }

      .section-heading p {
        margin: 0;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 13px);
        line-height: 1.35;
      }

      .target-fields {
        display: grid;
        gap: 8px;
      }

      .target-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .target-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }

      .target-editor {
        grid-column: 1 / -1;
        border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
        margin-top: 4px;
        padding-top: 12px;
      }

      .selector-options {
        display: grid;
        gap: 8px;
      }

      .selector-style-row {
        display: grid;
        gap: 6px;
      }

      .selector-style-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .selector-style-actions ha-button {
        width: 100%;
      }

      .selector-style-actions ha-button.selected {
        --mdc-theme-primary: var(--primary-color);
      }

      .option-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 40px;
      }

      .option-text {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .option-title {
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-m, 14px);
      }

      .option-description {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 13px);
        line-height: 1.25;
      }

      ha-icon-button {
        color: var(--secondary-text-color);
      }

      @media (max-width: 500px) {
        .target {
          grid-template-columns: 1fr;
        }

        .target-actions {
          flex-direction: row;
          justify-content: flex-end;
        }

        .target-meta {
          grid-template-columns: 1fr;
        }
      }
    `
  }

  setConfig(config: GroupConfig) {
    this.config = { ...config }
  }

  private commit(config: GroupConfig) {
    const cleanConfig = this.cleanConfig(config)
    this.config = cleanConfig
    fireEvent(this, 'config-changed', { config: cleanConfig })
  }

  private cleanConfig(config: GroupConfig): GroupConfig {
    const clean = { ...config }
    for (const key of Object.keys(clean)) {
      if ((clean as Record<string, unknown>)[key] === undefined) {
        delete (clean as Record<string, unknown>)[key]
      }
    }
    if (clean.selector && Object.keys(clean.selector).length === 0) {
      delete clean.selector
    }
    return clean
  }

  private getTargets() {
    return normalizeTargets(this.config)
  }

  private updateTarget(index: number, patch: Partial<EditableTarget>) {
    const targets = this.getTargets()
    targets[index] = { ...targets[index], ...patch }
    this.commitTargets(targets)
  }

  private cleanTargets(
    targets: Array<EditableTarget>
  ): Array<GroupTargetConfig> {
    return targets.map((target) => {
      const entity = target.entity?.trim() ?? ''
      const name = target.name?.trim()
      const icon = target.icon?.trim()
      const { name: _name, icon: _icon, entity: _entity, ...rest } = target

      if (!name && !icon && Object.keys(rest).length === 0) return entity

      return {
        ...rest,
        entity,
        ...(name ? { name } : {}),
        ...(icon ? { icon } : {}),
      }
    })
  }

  private addTarget() {
    const targets = [...this.getTargets(), { entity: '' }]
    this.commitTargets(targets)
  }

  private removeTarget(index: number) {
    const targets = this.getTargets().filter(
      (_, targetIndex) => targetIndex !== index
    )
    this.commitTargets(targets.length ? targets : [{ entity: '' }])
  }

  private commitTargets(targets: Array<EditableTarget>) {
    const { entities: _entities, ...config } = this.config
    this.commit({ ...config, cards: this.cleanTargets(targets) })
  }

  private updateSelector(path: 'icons' | 'names' | 'states', value: unknown) {
    const selector = { ...(this.config.selector ?? {}) }
    const boolValue = Boolean(value)

    if (boolValue === DEFAULT_SELECTOR[path]) {
      delete selector[path]
    } else {
      selector[path] = boolValue
    }

    this.commit({ ...this.config, selector })
  }

  private updateSelectorStyle(value: unknown) {
    const selector = { ...(this.config.selector ?? {}) }
    const style = value === 'tabs' ? 'tabs' : 'header'

    if (style === DEFAULT_SELECTOR.style) {
      delete selector.style
    } else {
      selector.style = style
    }

    this.commit({ ...this.config, selector })
  }

  private renderSelectorStyleOption(
    label: string,
    value: 'header' | 'tabs',
    selected: boolean
  ) {
    return html`
      <ha-button
        class=${selected ? 'selected' : ''}
        appearance=${selected ? 'filled' : 'outlined'}
        @click=${() => this.updateSelectorStyle(value)}
      >
        ${label}
      </ha-button>
    `
  }

  private isAutoSelectEnabled() {
    const autoSelect = this.config.auto_select
    return (
      autoSelect === true ||
      autoSelect === 'recent_activity' ||
      (typeof autoSelect === 'object' &&
        autoSelect?.mode === 'recent_activity')
    )
  }

  private updateAutoSelect(enabled: boolean) {
    const { auto_select: _autoSelect, ...config } = this.config
    this.commit({
      ...config,
      ...(enabled ? { auto_select: { mode: 'recent_activity' } } : {}),
    })
  }

  private updateRememberSelection(enabled: boolean) {
    const { remember_selection: _rememberSelection, ...config } = this.config
    this.commit({
      ...config,
      ...(enabled ? {} : { remember_selection: false }),
    })
  }

  private updateStorageKey(value: string) {
    const storageKey = value.trim()
    const { storage_key: _storageKey, ...config } = this.config
    this.commit({
      ...config,
      ...(storageKey ? { storage_key: storageKey } : {}),
    })
  }

  private getTargetCardConfig(target: EditableTarget) {
    const { name, icon, ...config } = target
    const header =
      config.header && typeof config.header === 'object'
        ? { ...config.header }
        : {}

    if (name && config.header !== false && typeof header.name === 'undefined') {
      header.name = name
    }

    if (icon && config.header !== false && typeof header.icon === 'undefined') {
      header.icon = icon
    }

    return {
      type: config.type ?? `custom:${CARD_NAME}`,
      ...config,
      ...(config.header === false ? { header: false } : { header }),
    }
  }

  private configureNestedEditor(
    element: Element | undefined,
    target: EditableTarget
  ) {
    if (!element) return

    const editor = element as Element & {
      hass?: HASS
      setConfig?: (config: Record<string, unknown>) => void
    }
    const config = this.getTargetCardConfig(target)
    const key = JSON.stringify(config)

    editor.hass = this.hass
    if (this.editorConfigKeys.get(element) !== key) {
      editor.setConfig?.(config)
      this.editorConfigKeys.set(element, key)
    }
  }

  private updateTargetCardConfig(index: number, ev: CustomEvent) {
    ev.stopPropagation()
    const targets = this.getTargets()
    targets[index] = toEditableTarget(ev.detail.config)
    this.commitTargets(targets)
  }

  private toggleTargetEditor(index: number) {
    this.expandedTargetIndex =
      this.expandedTargetIndex === index ? null : index
  }

  private renderEntityPicker(target: EditableTarget, index: number) {
    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .value=${target.entity}
        .includeDomains=${SUPPORTED_DOMAINS}
        allow-custom-entity
        label="Entity"
        @value-changed=${(ev: CustomEvent) =>
          this.updateTarget(index, { entity: ev.detail.value })}
      ></ha-entity-picker>
    `
  }

  private renderTarget(target: EditableTarget, index: number) {
    const expanded = this.expandedTargetIndex === index

    return html`
      <div class="target">
        <div class="target-fields">
          ${this.renderEntityPicker(target, index)}
          <div class="target-meta">
            <ha-textfield
              label="Name"
              .value=${target.name ?? ''}
              @input=${(ev: Event) =>
                this.updateTarget(index, {
                  name: (ev.currentTarget as HTMLInputElement).value,
                })}
            ></ha-textfield>
            <ha-icon-picker
              .hass=${this.hass}
              label="Icon"
              .value=${target.icon ?? ''}
              @value-changed=${(ev: CustomEvent) =>
                this.updateTarget(index, { icon: ev.detail.value })}
            ></ha-icon-picker>
          </div>
        </div>
        <div class="target-actions">
          <ha-button size="s" @click=${() => this.toggleTargetEditor(index)}>
            ${expanded ? 'Close' : 'Configure'}
          </ha-button>
          ${this.getTargets().length > 1
            ? html`
                <ha-icon-button
                  label="Remove"
                  .path=${'M19,13H5V11H19V13Z'}
                  @click=${() => this.removeTarget(index)}
                ></ha-icon-button>
              `
            : nothing}
        </div>
        ${expanded
          ? html`
              <div class="target-editor">
                <simple-thermostat-editor
                  .hass=${this.hass}
                  ${ref((element) =>
                    this.configureNestedEditor(element, target)
                  )}
                  @config-changed=${(ev: CustomEvent) =>
                    this.updateTargetCardConfig(index, ev)}
                ></simple-thermostat-editor>
              </div>
            `
          : nothing}
      </div>
    `
  }

  render() {
    const selector = this.config.selector ?? {}
    const targets = this.getTargets()

    return html`
      <div class="section editor-section">
        <div class="section-heading">
          <h3>Cards</h3>
          <p>Choose the cards this group switches between.</p>
        </div>
        ${targets.map((target, index) => this.renderTarget(target, index))}
        <div class="actions">
          <ha-button size="s" @click=${this.addTarget}>Add card</ha-button>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-heading">
          <h3>Behavior</h3>
          <p>Control how the group chooses and labels the active card.</p>
        </div>
        <div class="selector-options">
          <div class="selector-style-row">
            <div class="option-text">
              <span class="option-title">Selector style</span>
              <span class="option-description"
                >Choose the normal arrow/menu header or visible tab
                buttons.</span
              >
            </div>
            <div class="selector-style-actions">
              ${this.renderSelectorStyleOption(
                'Header navigation',
                'header',
                (selector.style ?? DEFAULT_SELECTOR.style) === 'header'
              )}
              ${this.renderSelectorStyleOption(
                'Tabbed buttons',
                'tabs',
                selector.style === 'tabs'
              )}
            </div>
          </div>
          ${this.renderOption(
            'Follow active device',
            'Switch to a card when its mode or on/off activity changes.',
            this.isAutoSelectEnabled(),
            (checked) => this.updateAutoSelect(checked)
          )}
          ${this.renderOption(
            'Remember selection',
            'Keep the last selected card after the dashboard reloads.',
            this.config.remember_selection !== false,
            (checked) => this.updateRememberSelection(checked)
          )}
          ${this.renderOption(
            'Show icons',
            'Show each card icon in the selector and menu.',
            selector.icons !== false,
            (checked) => this.updateSelector('icons', checked)
          )}
          ${this.renderOption(
            'Show names',
            'Show card names in the selector and menu.',
            selector.names !== false,
            (checked) => this.updateSelector('names', checked)
          )}
          ${this.renderOption(
            'Show states',
            'Show current states in the selector menu.',
            selector.states === true,
            (checked) => this.updateSelector('states', checked)
          )}
        </div>
        <ha-textfield
          label="Storage key"
          .value=${this.config.storage_key ?? ''}
          @input=${(ev: InputEvent) =>
            this.updateStorageKey((ev.target as HTMLInputElement).value)}
        ></ha-textfield>
      </div>
    `
  }

  private renderOption(
    title: string,
    description: string,
    checked: boolean,
    update: (checked: boolean) => void
  ) {
    return html`
      <div class="option-row">
        <div class="option-text">
          <span class="option-title">${title}</span>
          <span class="option-description">${description}</span>
        </div>
        <ha-switch
          .checked=${checked}
          @change=${(ev: Event) =>
            update((ev.currentTarget as HTMLInputElement).checked)}
        ></ha-switch>
      </div>
    `
  }
}
