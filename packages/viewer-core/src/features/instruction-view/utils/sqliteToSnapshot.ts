/**
 * Convert ElectronProjectData (SQLite row arrays) into an InstructionSnapshot
 * that can be passed to transformSnapshotToStore().
 *
 * Media URLs use the mvis-media:// protocol so Electron's custom protocol
 * handler serves files directly from disk.
 */
import type { InstructionSnapshot } from '@/types/snapshot';
import { buildMediaUrl } from '@/lib/media';

/** Type for ElectronProjectData from main process - matches electron.d.ts */
type ElectronProjectData = {
  instruction: {
    id: string;
    name: string;
    description: string | null;
    article_number?: string | null;
    estimated_duration?: number | null;
    revision: number;
    cover_image_area_id: string | null;
    use_blurred?: boolean;
    folderName: string;
    created_at: string;
    updated_at: string;
  };
  assemblies: Record<string, unknown>[];
  steps: Record<string, unknown>[];
  substeps: Record<string, unknown>[];
  videos: Record<string, unknown>[];
  videoSections: Record<string, unknown>[];
  videoFrameAreas: Record<string, unknown>[];
  viewportKeyframes: Record<string, unknown>[];
  drawings: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  partTools: Record<string, unknown>[];
  substepDescriptions: Record<string, unknown>[];
  substepNotes: Record<string, unknown>[];
  substepPartTools: Record<string, unknown>[];
  substepImages: Record<string, unknown>[];
  substepVideoSections: Record<string, unknown>[];
  partToolVideoFrameAreas: Record<string, unknown>[];
  branding: Record<string, unknown>[];
  images: Record<string, unknown>[];
  substepReferences?: Record<string, unknown>[];
  safetyIcons?: Record<string, unknown>[];
};

/** Helper: key an array of rows by their `id` field. */
function keyById<T extends { id: string }>(rows: Record<string, unknown>[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const row of rows) {
    const r = row as T;
    map[r.id] = r;
  }
  return map;
}

/** Helper: group row IDs by a foreign-key field. */
function groupIds(rows: Record<string, unknown>[], foreignKey: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    const fk = row[foreignKey] as string;
    if (!fk) continue;
    if (!map[fk]) map[fk] = [];
    map[fk].push(row.id as string);
  }
  return map;
}

export function sqliteToSnapshot(data: ElectronProjectData): InstructionSnapshot {
  const { instruction } = data;
  const { folderName } = instruction;
  const useBlurred = !!instruction.use_blurred;

  // Group substeps by step_id → step.substep_ids
  const substepsByStep = groupIds(data.substeps, 'step_id');

  // Group junction rows by substep_id
  const imagesBySubstep = groupIds(data.substepImages, 'substep_id');
  const vsBySubstep = groupIds(data.substepVideoSections, 'substep_id');
  const ptBySubstep = groupIds(data.substepPartTools, 'substep_id');
  const notesBySubstep = groupIds(data.substepNotes, 'substep_id');
  const descsBySubstep = groupIds(data.substepDescriptions, 'substep_id');
  const refsBySubstep = groupIds(data.substepReferences ?? [], 'substep_id');

  // Group viewport keyframes by video_id
  const kfByVideo = groupIds(data.viewportKeyframes, 'video_id');

  // Build steps with substep_ids
  const steps: InstructionSnapshot['steps'] = {};
  for (const row of data.steps) {
    const r = row as { id: string; instruction_id: string; step_number: number; title: string | null; repeat_count?: number; repeat_label?: string | null };
    steps[r.id] = {
      id: r.id,
      instruction_id: r.instruction_id,
      step_number: r.step_number,
      title: r.title,
      substep_ids: substepsByStep[r.id] || [],
      repeat_count: r.repeat_count ?? 1,
      repeat_label: r.repeat_label ?? null,
    };
  }

  // Build substeps with relation arrays
  const substeps: InstructionSnapshot['substeps'] = {};
  for (const row of data.substeps) {
    const r = row as { id: string; step_id: string; step_order: number; title: string | null; display_mode?: string; repeat_count?: number; repeat_label?: string | null };
    substeps[r.id] = {
      id: r.id,
      step_id: r.step_id,
      step_order: r.step_order,
      title: r.title,
      display_mode: (r.display_mode as 'normal' | 'reference') || 'normal',
      repeat_count: r.repeat_count ?? 1,
      repeat_label: r.repeat_label ?? null,
      image_row_ids: imagesBySubstep[r.id] || [],
      video_section_row_ids: vsBySubstep[r.id] || [],
      part_tool_row_ids: ptBySubstep[r.id] || [],
      note_row_ids: notesBySubstep[r.id] || [],
      description_row_ids: descsBySubstep[r.id] || [],
      reference_row_ids: refsBySubstep[r.id] || [],
    };
  }

  // Build videos with viewport_keyframe_ids
  const videos: InstructionSnapshot['videos'] = {};
  for (const row of data.videos) {
    const r = row as { id: string; fps: number; order: number; video_path?: string };
    videos[r.id] = {
      id: r.id,
      fps: r.fps,
      order: r.order,
      viewport_keyframe_ids: kfByVideo[r.id] || [],
      video_path: r.video_path,
    };
  }

  // Build video sections with mvis-media:// URLs
  const sectionFile = useBlurred ? 'video_blurred.mp4' : 'video.mp4';
  const videoSections: InstructionSnapshot['videoSections'] = {};
  for (const row of data.videoSections) {
    const r = row as { id: string; video_id: string; start_frame: number; end_frame: number };
    videoSections[r.id] = {
      id: r.id,
      video_id: r.video_id,
      start_frame: r.start_frame,
      end_frame: r.end_frame,
      url_720p: buildMediaUrl(folderName, `media/sections/${r.id}/${sectionFile}`),
      url_1080p: '',
      url_480p: '',
    };
  }

  // Build video frame areas with mvis-media:// URLs
  const frameFile = useBlurred ? 'image_blurred.jpg' : 'image.jpg';
  const videoFrameAreas: InstructionSnapshot['videoFrameAreas'] = {};
  for (const row of data.videoFrameAreas) {
    const r = row as {
      id: string; video_id: string | null; frame_number: number | null;
      image_id: string | null; type: string;
      x: number | null; y: number | null;
      width: number | null; height: number | null;
    };
    videoFrameAreas[r.id] = {
      id: r.id,
      video_id: r.video_id,
      frame_number: r.frame_number,
      image_id: r.image_id,
      type: r.type,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      url_720p: buildMediaUrl(folderName, `media/frames/${r.id}/${frameFile}`),
      url_1080p: '',
      url_480p: '',
    };
  }

  // Build images
  const images: InstructionSnapshot['images'] = {};
  for (const row of (data.images || [])) {
    const r = row as { id: string; instruction_id: string; original_path: string | null; width: number | null; height: number | null; order: number };
    images[r.id] = {
      id: r.id,
      instruction_id: r.instruction_id,
      original_path: r.original_path,
      width: r.width,
      height: r.height,
      order: r.order,
    };
  }

  // Build drawings
  const drawings: InstructionSnapshot['drawings'] = {};
  for (const row of (data.drawings || [])) {
    const r = row as {
      id: string; instruction_id: string | null; substep_image_id: string | null;
      substep_id: string | null; start_frame: number | null; end_frame: number | null;
      type: string; color: string; stroke_width: number | null;
      x1: number | null; y1: number | null; x2: number | null; y2: number | null;
      x: number | null; y: number | null; content: string | null;
      font_size: number | null; points: string | null; order: number;
    };
    drawings[r.id] = {
      id: r.id,
      instruction_id: r.instruction_id,
      substep_image_id: r.substep_image_id,
      substep_id: r.substep_id,
      start_frame: r.start_frame,
      end_frame: r.end_frame,
      type: r.type,
      color: r.color,
      stroke_width: r.stroke_width,
      x1: r.x1,
      y1: r.y1,
      x2: r.x2,
      y2: r.y2,
      x: r.x,
      y: r.y,
      content: r.content,
      font_size: r.font_size,
      points: r.points,
      order: r.order ?? 0,
    };
  }

  return {
    meta: {
      instruction_id: instruction.id,
      revision: instruction.revision,
      generated_at: instruction.updated_at,
      languages: [],
      cdn_base_url: '',
    },
    instruction: {
      id: instruction.id,
      name: instruction.name,
      description: instruction.description,
      article_number: instruction.article_number ?? null,
      estimated_duration: instruction.estimated_duration ?? null,
      cover_image_area_id: instruction.cover_image_area_id ?? null,
      use_blurred: useBlurred,
    },
    translations: {
      instruction: {},
      steps: {},
      substeps: {},
      notes: {},
      partTools: {},
      substepDescriptions: {},
      drawings: {},
    },
    steps,
    substeps,
    videos,
    videoSections,
    videoFrameAreas,
    viewportKeyframes: keyById(data.viewportKeyframes),
    images,
    drawings,
    notes: keyById(data.notes),
    partTools: keyById(data.partTools),
    substepImages: keyById(data.substepImages),
    substepVideoSections: keyById(data.substepVideoSections),
    substepPartTools: keyById(data.substepPartTools),
    substepNotes: keyById(data.substepNotes),
    substepDescriptions: keyById(data.substepDescriptions),
    partToolVideoFrameAreas: keyById(data.partToolVideoFrameAreas),
    substepReferences: keyById(data.substepReferences ?? []),
    safetyIcons: keyById(data.safetyIcons ?? []),
  };
}
