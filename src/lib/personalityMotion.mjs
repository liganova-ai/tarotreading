export const SLOT_ANGLES = [-90, 30, 150];
export const SLOT_RADIUS = 16;
export const SLOT_FIELD_SCALE = .34;

export function alignPersonalitySlot(source, slotIndex, previousRotation) {
  const sourceAngle = Math.atan2(source.y - 50, source.x - 50) * 180 / Math.PI;
  const desired = sourceAngle - SLOT_ANGLES[slotIndex];
  const turn = ((desired - previousRotation + 180) % 360 + 360) % 360 - 180;
  const radians = sourceAngle * Math.PI / 180;
  return {
    rotation: previousRotation + turn,
    destination: {
      x: 50 + Math.cos(radians) * SLOT_RADIUS * SLOT_FIELD_SCALE,
      y: 50 + Math.sin(radians) * SLOT_RADIUS * SLOT_FIELD_SCALE,
    },
  };
}
