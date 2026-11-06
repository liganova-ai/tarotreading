import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOT_ANGLES, SLOT_RADIUS, SLOT_FIELD_SCALE, alignPersonalitySlot } from '../src/lib/personalityMotion.mjs';

const pointAt = (angle, radius) => ({ x: 50 + Math.cos(angle * Math.PI / 180) * radius, y: 50 + Math.sin(angle * Math.PI / 180) * radius });

test('every personality rotates its empty slot toward the source using the shortest turn', () => {
  for (let personality = 0; personality < 8; personality++) {
    const source = pointAt(-90 + personality * 45, 37.5);
    for (let index = 0; index < 3; index++) {
      for (const previous of [-900, -180, 0, 150, 900]) {
        const result = alignPersonalitySlot(source, index, previous);
        assert.ok(Math.abs(result.rotation - previous) <= 180);
        const slot = pointAt(SLOT_ANGLES[index] + result.rotation, SLOT_RADIUS * SLOT_FIELD_SCALE);
        assert.ok(Math.hypot(slot.x - result.destination.x, slot.y - result.destination.y) < 1e-10);
        // Other slots remain behind the receiving slot, outside the incoming radial path.
        const direction = { x: source.x - 50, y: source.y - 50 };
        for (let other = 0; other < 3; other++) {
          if (other === index) continue;
          const otherSlot = pointAt(SLOT_ANGLES[other] + result.rotation, SLOT_RADIUS * SLOT_FIELD_SCALE);
          assert.ok((otherSlot.x - slot.x) * direction.x + (otherSlot.y - slot.y) * direction.y < 0);
        }
      }
    }
  }
});
