const FAN_SPEED_ICONS = [
  'mdi:fan-speed-1',
  'mdi:fan-speed-2',
  'mdi:fan-speed-3',
  'st:fan-speed-4',
  'st:fan-speed-5',
]

const normalizeMode = (mode: unknown) =>
  String(mode).toLowerCase().replace(/\s+/g, '_')

const FAN_SPEED_LEVELS: Record<string, number> = {
  low: 1,
  medlow: 2,
  medium_low: 2,
  mid: 2,
  medium: 2,
  medium_high: 3,
  medhigh: 3,
  max: 5,
  turbo: 5,
  full: 5,
}

function getNumericSpeedLevel(mode: string) {
  if (!/^\d+$/.test(mode)) return undefined

  const level = Number(mode)
  return level >= 1 && level <= FAN_SPEED_ICONS.length ? level : undefined
}

function getNamedSpeedLevel(mode: string, modeOptions: Array<unknown>) {
  if (mode === 'high') {
    const modes = new Set(modeOptions.map(normalizeMode))
    return modes.has('medium_high') ||
      modes.has('medhigh') ||
      modes.has('max') ||
      modes.has('turbo') ||
      modes.has('full')
      ? 4
      : 3
  }

  return FAN_SPEED_LEVELS[mode]
}

export default function getFanModeIcon(
  mode: string,
  modeOptions: Array<unknown>
) {
  const normalizedMode = normalizeMode(mode)
  const numericLevel = getNumericSpeedLevel(normalizedMode)
  if (numericLevel) return FAN_SPEED_ICONS[numericLevel - 1]

  const namedLevel = getNamedSpeedLevel(normalizedMode, modeOptions)

  return namedLevel ? FAN_SPEED_ICONS[namedLevel - 1] : undefined
}
