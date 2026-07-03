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
})

test('inactive mode buttons use a lifted card surface by default', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'styles.css'),
    'utf8'
  )
  const baseCardRule = styles.match(/ha-card\s*\{[^}]*\}/)?.[0] ?? ''
  const modeItemRule = styles.match(/\.mode-item\s*\{[^}]*\}/)?.[0] ?? ''

  expect(baseCardRule).toContain('--st-mode-surface-background')
  expect(modeItemRule).toContain(
    'background: var(--st-mode-background, var(--st-mode-surface-background))'
  )
})
