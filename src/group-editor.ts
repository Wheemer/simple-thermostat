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
        gap: 12px;
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
        gap: 12px;
        margin-top: 16px;
      }

      label {
        display: grid;
        gap: 4px;
        color: var(--secondary-text-color);
        font-size: 12px;
      }

      input,
      select {
        min-height: 40px;
        box-sizing: border-box;
        border-radius: 6px;
        border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
        background: var(--card-background-color);
        color: var(--primary-text-color);
        padding: 0 10px;
        font: inherit;
      }

      ha-icon-button {
        color: var(--secondary-text-color);
      }
    `
  }

  setConfig(config: GroupConfig) {
    this.config = {
      ...config,
      cards: normalizeTargets(config),
      entities: undefined,
      selector: {
        mode: config.selector?.mode ?? 'auto',
        icons: config.selector?.icons !== false,
        names: config.selector?.names !== false,
        states: config.selector?.states === true,
      },
    }
  }

  private commit(config: GroupConfig) {
    this.config = config
    fireEvent(this, 'config-changed', { config })
  }

  private getTargets() {
    return normalizeTargets(this.config)
  }

  private updateTarget(index: number, patch: Partial<EditableTarget>) {
    const targets = this.getTargets()
    targets[index] = { ...targets[index], ...patch }
    this.commit({ ...this.config, cards: this.cleanTargets(targets) })
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
    this.commit({ ...this.config, cards: this.cleanTargets(targets) })
  }

  private removeTarget(index: number) {
    const targets = this.getTargets().filter(
      (_, targetIndex) => targetIndex !== index
    )
    this.commit({
      ...this.config,
      cards: this.cleanTargets(targets.length ? targets : [{ entity: '' }]),
    })
  }

  private updateSelector(
    path: 'mode' | 'icons' | 'names' | 'states',
    value: unknown
  ) {
    const selector = { ...(this.config.selector ?? {}) }
    if (path === 'mode')
      selector.mode = value as GroupConfig['selector']['mode']
    else selector[path] = Boolean(value)

    this.commit({ ...this.config, selector })
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
    this.commit({ ...this.config, cards: this.cleanTargets(targets) })
  }

  private toggleTargetEditor(index: number) {
    this.expandedTargetIndex =
      this.expandedTargetIndex === index ? null : index
  }

  private renderEntityPicker(target: EditableTarget, index: number) {
    const domains = SUPPORTED_DOMAINS.map((domain) => ({ domain }))

    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .value=${target.entity}
        .includeDomains=${SUPPORTED_DOMAINS}
        .include_entities=${domains}
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
            <label>
              Name
              <input
                .value=${target.name ?? ''}
                @input=${(ev: Event) =>
                  this.updateTarget(index, {
                    name: (ev.currentTarget as HTMLInputElement).value,
                  })}
              />
            </label>
            <label>
              Icon
              <input
                .value=${target.icon ?? ''}
                placeholder="mdi:air-conditioner"
                @input=${(ev: Event) =>
                  this.updateTarget(index, {
                    icon: (ev.currentTarget as HTMLInputElement).value,
                  })}
              />
            </label>
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
      <div class="section">
        ${targets.map((target, index) => this.renderTarget(target, index))}
        <div class="actions">
          <ha-button size="s" @click=${this.addTarget}>Add entity</ha-button>
        </div>
      </div>

      <div class="selector-options">
        <label>
          Selector style
          <select
            .value=${selector.mode ?? 'auto'}
            @change=${(ev: Event) =>
              this.updateSelector(
                'mode',
                (ev.currentTarget as HTMLSelectElement).value
              )}
          >
            <option value="auto">Auto</option>
            <option value="carousel">Arrows</option>
            <option value="tabs">Tabs</option>
          </select>
        </label>
        <ha-formfield label="Show icons">
          <ha-switch
            .checked=${selector.icons !== false}
            @change=${(ev: Event) =>
              this.updateSelector(
                'icons',
                (ev.currentTarget as HTMLInputElement).checked
              )}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield label="Show names">
          <ha-switch
            .checked=${selector.names !== false}
            @change=${(ev: Event) =>
              this.updateSelector(
                'names',
                (ev.currentTarget as HTMLInputElement).checked
              )}
          ></ha-switch>
        </ha-formfield>
        <ha-formfield label="Show states">
          <ha-switch
            .checked=${selector.states === true}
            @change=${(ev: Event) =>
              this.updateSelector(
                'states',
                (ev.currentTarget as HTMLInputElement).checked
              )}
          ></ha-switch>
        </ha-formfield>
      </div>
    `
  }
}
