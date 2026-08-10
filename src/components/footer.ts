import { html, nothing } from 'lit'
import { FooterToggle, HVAC_MODES } from '../types'
import { renderModeIcon } from './modeIcon'

interface FooterOptions {
  toggles: Array<FooterToggle>
  mainState: string
  toggleFooterEntity
  openEntityPopover
}

const safeClass = (value: unknown) =>
  String(value).replace(/[^a-z0-9_-]/gi, '')

export default function renderFooter({
  toggles,
  mainState,
  toggleFooterEntity,
  openEntityPopover,
}: FooterOptions) {
  const visibleToggles = toggles.filter(
    (toggle) =>
      !(toggle.hide_when_off === true && mainState === HVAC_MODES.OFF)
  )

  if (!visibleToggles.length) return nothing

  return html`
    <section class="footer-controls controls">
      <div
        class="modes footer compact ${visibleToggles.length > 4
          ? 'dense'
          : ''}"
        role="group"
        aria-label="Footer controls"
      >
        ${visibleToggles.map((toggle) => {
          const entityId = toggle.state.entity_id
          const state = String(toggle.state.state ?? '')
          const active = state === 'on'
          const label =
            toggle.name === false
              ? false
              : toggle.name || toggle.state.attributes?.friendly_name || entityId
          const icon = toggle.icon ?? toggle.state.attributes?.icon
          const domain = entityId.split('.')[0]

          return html`
            <div
              class="mode-item footer-toggle ${safeClass(state)} domain-${safeClass(
                domain
              )} ${active ? 'active' : ''}"
              role="button"
              tabindex="0"
              aria-pressed=${active ? 'true' : 'false'}
              aria-label=${label || entityId}
              title=${label || entityId}
              @click=${() => toggleFooterEntity(entityId, !active)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleFooterEntity(entityId, !active)
                }
              }}
              @contextmenu=${(e: MouseEvent) => {
                e.preventDefault()
                openEntityPopover(entityId)
              }}
            >
              ${icon ? renderModeIcon(icon) : nothing}
              ${label ? html`<span class="mode-label">${label}</span>` : nothing}
            </div>
          `
        })}
      </div>
    </section>
  `
}
