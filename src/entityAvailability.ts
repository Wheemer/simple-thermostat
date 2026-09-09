export function isEntityAvailable(
  entity: { state?: unknown; entity_id?: string } | null | undefined
): boolean {
  if (typeof entity?.state !== 'string' || entity.state === 'unavailable')
    return false
  // Momentary entities can be unknown until their first activation.
  return (
    entity.state !== 'unknown' ||
    ['button', 'input_button', 'scene'].includes(
      entity.entity_id?.split('.')[0] ?? ''
    )
  )
}
