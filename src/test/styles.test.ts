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
  expect(styles).toContain('.body.has-entities.step-column.setpoint-count-1')
  expect(styles).toContain('grid-template-columns: minmax(0, 1fr) max-content')
  expect(styles).toContain('.body.has-entities.step-column.setpoint-count-2')
  expect(styles).toContain('minmax(160px, max-content)')
  expect(styles).toContain('minmax(max-content, 1fr)')
})

test('entity table labels can wrap while values stay on one line', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const tableLabelsRule =
    styles.match(/&\.with-labels\s*\{[^}]*\}/)?.[0] ?? ''
  const headingRule = styles.match(/\.entity-heading\s*\{[^}]*\}/)?.[0] ?? ''
  const valueRule = styles.match(/\.entity-value\s*\{[^}]*\}/)?.[0] ?? ''

  expect(tableLabelsRule).toContain('grid-template-columns: auto auto')
  expect(tableLabelsRule).toContain('grid-auto-flow: row')
  expect(tableLabelsRule).toContain('column-gap: 8px')
  expect(headingRule).toContain('min-width: 0')
  expect(headingRule).toContain('white-space: normal')
  expect(valueRule).toContain('min-width: max-content')
  expect(valueRule).toContain('white-space: nowrap')
})

test('entity table labels can opt into left alignment', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const headingRule = styles.match(/\.entity-heading\s*\{[^}]*\}/)?.[0] ?? ''
  const leftAlignRule =
    styles.match(/\.entities\.align-left \.entity-heading\s*\{[^}]*\}/)?.[0] ??
    ''

  expect(headingRule).toContain('justify-content: flex-end')
  expect(headingRule).toContain('justify-self: end')
  expect(headingRule).toContain('text-align: right')
  expect(leftAlignRule).toContain('justify-content: flex-start')
  expect(leftAlignRule).toContain('justify-self: start')
  expect(leftAlignRule).toContain('text-align: left')
})

test('entity list rows keep a gap between value-only items', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const listRule = styles.match(/\.entities\.as-list\s*\{[^}]*\}/)?.[0] ?? ''

  expect(listRule).toContain(
    'column-gap: calc(var(--st-spacing, var(--st-default-spacing)) * 2)'
  )
})

test('standard visuals keep upstream-style intrinsic body sizing', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const standardBodyRule =
    styles.match(/ha-card\.standard-visuals \.body\s*\{[^}]*\}/)?.[0] ?? ''

  expect(standardBodyRule).toContain(
    'grid-auto-columns: minmax(min-content, auto)'
  )
})

test('standard visuals keep upstream-style header icon sizing', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const standardHeaderIconRule =
    styles.match(/ha-card\.standard-visuals \.header__icon\s*\{[^}]*\}/)
      ?.[0] ?? ''

  expect(standardHeaderIconRule).toContain('--iron-icon-width: 24px')
  expect(standardHeaderIconRule).toContain('--iron-icon-height: 24px')
  expect(standardHeaderIconRule).toContain('--mdc-icon-size: 24px')
  expect(standardHeaderIconRule).toContain('width: 24px')
  expect(standardHeaderIconRule).toContain('height: 24px')
})

test('layout compatibility fixes do not retune semantic colors or icons', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const headerConfig = fs.readFileSync(
    path.join(__dirname, '..', 'config', 'header.ts'),
    'utf8'
  )

  const baseCardRule = styles.match(/ha-card\s*\{[^}]*\}/)?.[0] ?? ''
  expect(baseCardRule).toContain('--auto-color: green')
  expect(baseCardRule).toContain('--heat_cool-color: springgreen')
  expect(baseCardRule).toContain('--cool-color: #2b9af9')
  expect(baseCardRule).toContain('--heat-color: #ff8100')
  expect(baseCardRule).toContain('--dry-color: #efbd07')
  expect(styles).not.toContain('--auto-color: #66bb6a')
  expect(styles).not.toContain('--heat_cool-color: #4ade80')
  expect(styles).not.toContain('--cool-color: #60a5fa')
  expect(styles).not.toContain('--heat-color: #fb923c')
  expect(styles).not.toContain('--dry-color: #facc15')
  expect(headerConfig).toContain("idle: 'mdi:air-conditioner'")
  expect(headerConfig).not.toContain("idle: 'mdi:thermostat'")
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

test('mode colors keep the original simple-thermostat assignments', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const baseCardRule = styles.match(/ha-card\s*\{[^}]*\}/)?.[0] ?? ''

  expect(baseCardRule).toContain('--auto-color: green')
  expect(baseCardRule).toContain('--heat_cool-color: springgreen')
  expect(baseCardRule).toContain('--cool-color: #2b9af9')
  expect(baseCardRule).toContain('--heat-color: #ff8100')
  expect(baseCardRule).toContain('--manual-color: #44739e')
  expect(baseCardRule).toContain('--off-color: #8a8a8a')
  expect(baseCardRule).toContain('--fan_only-color: #8a8a8a')
  expect(baseCardRule).toContain('--dry-color: #efbd07')
  expect(baseCardRule).not.toContain('--state-climate-heat-color')
  expect(baseCardRule).not.toContain('--state-climate-cool-color')
  expect(baseCardRule).not.toContain('--state-climate-heat-cool-color')
})

test('active mode backgrounds keep semantic mode colors', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const activeRule =
    styles.match(/&\.active,\s*&\.active:hover\s*\{[^}]*\}/)?.[0] ?? ''

  expect(activeRule).toContain(
    'var(--st-mode-color, var(--primary-color))'
  )

  const modeColors: Record<string, string> = {
    heat: '--heat-color',
    cool: '--cool-color',
    heat_cool: '--heat_cool-color',
    auto: '--auto-color',
    dry: '--dry-color',
    fan_only: '--fan_only-color',
  }

  for (const [mode, color] of Object.entries(modeColors)) {
    const rule =
      styles.match(
        new RegExp(
          `ha-card\\.standard-visuals \\.mode-item\\.active\\.${mode} \\{[^}]*\\}`
        )
      )?.[0] ?? ''

    expect(rule).toContain(
      `background: var(--st-mode-active-background, var(${color}))`
    )
  }
})

test('card-level active mode accent overrides are not shadowed by mode defaults', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )

  expect(styles).not.toContain(
    '--st-mode-active-accent-color: var(--st-mode-accent-color)'
  )
  expect(styles).toContain(
    '--st-mode-default-active-accent-color: var(--st-mode-accent-color)'
  )
  expect(styles).toContain(
    'var(\n        --st-mode-active-accent-color,\n        var('
  )
  expect(styles).toContain(
    'var(\n    --st-mode-active-accent-color,\n    var(--st-mode-default-active-accent-color)'
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

test('header icons keep their own compact size without shrinking controls', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const hostRule = styles.match(/:host\s*\{[^}]*\}/)?.[0] ?? ''
  const headerIconRule = styles.match(/\.header__icon\s*\{[^}]*\}/)?.[0] ?? ''
  const triggerIconRule =
    styles.match(/\.thermostat-trigger ha-icon\s*\{[^}]*\}/)?.[0] ?? ''

  expect(hostRule).toContain('--st-control-icon-size: var(--st-font-size-xl, 32px)')
  expect(hostRule).toContain(
    '--st-header-icon-size: var(--st-font-size-header-icon, 26px)'
  )
  expect(headerIconRule).toContain('var(--st-header-icon-size)')
  expect(headerIconRule).not.toContain('var(--st-control-icon-size)')
  expect(triggerIconRule).toContain('var(--st-control-icon-size)')
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
