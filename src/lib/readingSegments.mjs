export const READING_SEGMENTS_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: { cardIndex: { type: 'integer', enum: [0, 1, 2, -1] }, text: { type: 'string' } },
    required: ['cardIndex', 'text'], additionalProperties: false,
  },
};

export function normalizeReadingSegments(segments) {
  if (!Array.isArray(segments) || segments.length !== 4 || segments.some((segment, index) => segment?.cardIndex !== [0, 1, 2, -1][index] || typeof segment.text !== 'string' || !segment.text.trim())) throw new Error('Invalid reading sections');
  // Preserve every complete section; length is guided by the prompt, never sliced.
  return segments.map(segment => ({ cardIndex: segment.cardIndex, text: segment.text.trim() }));
}
