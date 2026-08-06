export type ModeLabelLayout = 'inline' | 'stacked' | 'column'

export interface ModeLabelPresentation {
  layout: ModeLabelLayout
  lines: string[]
}

const STACKABLE_MODES = new Set(['heat_cool', 'fan_only'])

export function getModeLabelPresentation(
  modeValue: string,
  label: string | null | undefined,
  sparse: boolean
): ModeLabelPresentation {
  if (!label || !sparse) {
    return { layout: 'inline', lines: label ? [label] : [] }
  }

  const trimmed = label.trim()
  if (!trimmed) {
    return { layout: 'inline', lines: [] }
  }

  if (modeValue === 'heat_cool') {
    const slashParts = trimmed.split(/\s*\/\s*/).filter(Boolean)
    if (
      slashParts.length === 2 &&
      slashParts.every((part) => part.length > 0 && part.length <= 12)
    ) {
      return { layout: 'stacked', lines: slashParts }
    }
  }

  if (modeValue === 'fan_only') {
    const wordParts = trimmed.split(/\s+/).filter(Boolean)
    if (
      wordParts.length === 2 &&
      wordParts.every((part) => part.length > 0 && part.length <= 10)
    ) {
      return { layout: 'stacked', lines: wordParts }
    }
  }

  if (STACKABLE_MODES.has(modeValue) && trimmed.length > 10) {
    return { layout: 'column', lines: [trimmed] }
  }

  return { layout: 'inline', lines: [trimmed] }
}
