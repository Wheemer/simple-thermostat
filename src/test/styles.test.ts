import fs from 'fs'
import path from 'path'

test('card styles do not use CSS containment for responsive layout', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )

  expect(styles).not.toContain('container-type')
  expect(styles).not.toContain('@container')
})

test('base ha-card keeps the default Home Assistant display contract', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const baseCardRule = styles.match(/ha-card\s*\{[^}]*\}/)?.[0] ?? ''

  expect(baseCardRule).not.toContain('display:')
  expect(baseCardRule).not.toContain('row-gap')
})

test('host isolates internal z-index layers from wrapper overlays', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const hostRule = styles.match(/:host\s*\{[^}]*\}/)?.[0] ?? ''

  expect(hostRule).toContain('isolation: isolate')
})

test('card body cannot overflow wrapper overlay width', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const hostRule = styles.match(/:host\s*\{[^}]*\}/)?.[0] ?? ''
  const baseCardRule = styles.match(/ha-card\s*\{[^}]*\}/)?.[0] ?? ''
  const bodyRule = styles.match(/\.body\s*\{[^}]*\}/)?.[0] ?? ''
  const bodyChildrenRule =
    styles.match(/\.body\s*>\s*\*\s*\{[^}]*\}/)?.[0] ?? ''

  expect(hostRule).toContain('max-width: 100%')
  expect(hostRule).toContain('min-width: 0')
  expect(baseCardRule).toContain('max-width: 100%')
  expect(baseCardRule).toContain('overflow: hidden')
  expect(bodyRule).toContain('grid-auto-columns: minmax(0, 1fr)')
  expect(bodyRule).toContain('overflow: hidden')
  expect(bodyChildrenRule).toContain('min-width: 0')
  expect(styles).toContain('.body.has-entities.setpoint-count-2')
  expect(styles).toContain('minmax(min-content, max-content)')
  expect(styles).toContain('minmax(max-content, 1fr)')
})

test('inactive mode buttons use a consistent theme-derived overlay surface', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const baseCardRule = styles.match(/ha-card\s*\{[^}]*\}/)?.[0] ?? ''
  const modeItemRule = styles.match(/\.mode-item\s*\{[^}]*\}/)?.[0] ?? ''

  expect(baseCardRule).toContain('--st-mode-surface-background')
  expect(baseCardRule).toContain('var(--primary-text-color) 14%')
  expect(baseCardRule).toContain('transparent')
  expect(baseCardRule).not.toContain(
    '--st-mode-surface-background: var(--secondary-background-color)'
  )
  expect(baseCardRule).toContain(
    '--st-mode-surface-background: color-mix'
  )
  expect(modeItemRule).toContain(
    'background: var(--st-mode-background, var(--st-mode-surface-background))'
  )
})

test('active header glow is applied to the icon wrapper for active domains', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )

  expect(styles).toContain(
    'ha-card.domain-fan:not(.state-off) .header__icon-wrap'
  )
  expect(styles).toContain('ha-card.humidifying .header__icon-wrap')
  expect(styles).toContain('ha-card.dehumidifying .header__icon-wrap')
  expect(styles).toContain('ha-card.drying .header__icon-wrap')
  expect(styles).toContain('ha-card.heating .header__icon-wrap')
  expect(styles).toContain('ha-card.cooling .header__icon-wrap')
  expect(styles).toContain('--st-active-icon-glow-duration: 4s')
  expect(styles).toContain('--st-active-icon-glow-max-size: 6px')
  expect(styles).toContain('--st-active-icon-glow-max-strength: 60%')
  expect(styles).toContain('opacity: 0.42')
  expect(styles).toContain('--st-active-icon-glow-color: var(--dry-color)')
  expect(styles).toContain('.header__icon-wrap::before')
  expect(styles).toContain('will-change: opacity, transform')
  expect(styles).toContain('ha-card.cooling .header__icon-wrap::before')
  const glowStart = styles.indexOf('@keyframes st-active-icon-glow')
  const glowEnd = styles.indexOf('@keyframes st-value-pulse')
  const glowKeyframes = styles.slice(glowStart, glowEnd)
  expect(glowKeyframes).not.toContain('filter:')
  expect(styles).toContain('left: 50%')
  expect(styles).toContain('top: 50%')
  expect(glowKeyframes).toContain('translate(-50%, -50%) scale')
  expect(glowKeyframes).not.toContain('25%')
  expect(glowKeyframes).not.toContain('75%')
  expect(styles).toContain(
    'ha-card.standard-visuals .header__icon-wrap'
  )
})

test('group card has no shared embedded stylesheet path in the normal card', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )

  expect(styles).not.toContain('ha-card.embedded')
  expect(styles).not.toContain('.embedded .body')
  expect(styles).not.toContain('.embedded .controls')
  expect(styles).not.toContain('.embedded .entities')
})
