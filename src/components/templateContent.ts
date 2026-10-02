import { LitElement, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'

// HA's datetime is a property, not an attribute. Hydrate only our template output.
class TemplateContent extends LitElement {
  @property({ attribute: false }) markup = ''
  @property({ attribute: false }) hass: any

  override createRenderRoot() {
    return this
  }

  override render() {
    return unsafeHTML(this.markup)
  }

  override updated() {
    this.querySelectorAll('ha-relative-time').forEach((element) => {
      const relative = element as HTMLElement & {
        datetime?: string
        hass?: any
      }
      relative.datetime = element.getAttribute('datetime') ?? undefined
      relative.hass = this.hass
    })
  }
}

if (!customElements.get('simple-thermostat-template-content')) {
  customElements.define('simple-thermostat-template-content', TemplateContent)
}

export function renderTemplateContent(
  markup: string,
  hass: any
): TemplateResult | ReturnType<typeof unsafeHTML> {
  return markup.includes('<ha-relative-time')
    ? html`<simple-thermostat-template-content
        style="display: contents"
        .markup=${markup}
        .hass=${hass}
      ></simple-thermostat-template-content>`
    : unsafeHTML(markup)
}
