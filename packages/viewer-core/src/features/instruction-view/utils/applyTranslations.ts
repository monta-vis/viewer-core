import type { InstructionData } from '@/features/instruction';

export interface TranslationRow {
  entity_type: string;
  entity_id: string;
  field_name: string;
  text: string | null;
}

/**
 * Applies translations to InstructionData by overwriting text fields.
 * Returns the same reference if no translations apply (zero-allocation fast path).
 */
export function applyTranslationsToStore(
  data: InstructionData,
  translations: TranslationRow[],
): InstructionData {
  // Build O(1) lookup: "entity_type:entity_id:field_name" → text
  const lookup = new Map<string, string>();
  for (const t of translations) {
    if (t.text != null) {
      lookup.set(`${t.entity_type}:${t.entity_id}:${t.field_name}`, t.text);
    }
  }
  if (lookup.size === 0) return data;

  const get = (type: string, id: string, field: string) =>
    lookup.get(`${type}:${id}:${field}`);

  return {
    ...data,
    instructionName: get('instruction', data.instructionId, 'name') ?? data.instructionName,
    instructionDescription: get('instruction', data.instructionId, 'description') ?? data.instructionDescription,
    steps: mapValues(data.steps, s => ({ ...s, title: get('step', s.id, 'title') ?? s.title, repeatLabel: get('step', s.id, 'repeat_label') ?? s.repeatLabel })),
    substeps: mapValues(data.substeps, s => ({ ...s, title: get('substep', s.id, 'title') ?? s.title, repeatLabel: get('substep', s.id, 'repeat_label') ?? s.repeatLabel })),
    substepDescriptions: mapValues(data.substepDescriptions, sd => ({ ...sd, text: get('substep_description', sd.id, 'text') ?? sd.text })),
    notes: mapValues(data.notes, n => ({ ...n, text: get('note', n.id, 'text') ?? n.text })),
    partTools: mapValues(data.partTools, pt => ({ ...pt, name: get('part_tool', pt.id, 'name') ?? pt.name })),
    drawings: mapValues(data.drawings, d => ({ ...d, content: get('drawing', d.id, 'content') ?? d.content })),
  };
}

function mapValues<T>(record: Record<string, T>, fn: (v: T) => T): Record<string, T> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, fn(v)]));
}
