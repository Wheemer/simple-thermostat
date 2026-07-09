import { html } from 'lit'

export function wrapEntities(config, content) {
  const {
    type = 'table',
    labels: showLabels = true,
    alignment,
  } = config?.layout?.entities ?? {}

  const visibleRows = content.filter(
    (it) => it !== null && typeof it !== 'undefined'
  )
  const classes = [
    showLabels ? 'with-labels' : 'without-labels',
    type === 'list' ? 'as-list' : 'as-table',
    alignment === 'left' ? 'align-left' : '',
    visibleRows.length === 1 ? 'single-row' : '',
  ]

  return html` <div class="entities ${classes.join(' ')}">${content}</div> `
}
