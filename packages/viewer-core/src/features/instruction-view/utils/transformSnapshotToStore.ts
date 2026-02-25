import { v4 as uuidv4 } from 'uuid';
import type { InstructionSnapshot } from '@/types/snapshot';
import type { InstructionData } from '@/features/instruction';

export function transformSnapshotToStore(snapshot: InstructionSnapshot): InstructionData {
  const versionId = '';  // Local .mvis files have no version tracking

  // Build video sectionIds and frameAreaIds
  const videoSectionsByVideo: Record<string, string[]> = {};
  for (const vs of Object.values(snapshot.videoSections)) {
    (videoSectionsByVideo[vs.video_id] ??= []).push(vs.id);
  }
  const frameAreasByVideo: Record<string, string[]> = {};
  for (const vfa of Object.values(snapshot.videoFrameAreas)) {
    if (vfa.video_id) (frameAreasByVideo[vfa.video_id] ??= []).push(vfa.id);
  }

  // Auto-create default viewport keyframe for videos with none
  const autoKeyframes: Record<string, InstructionData['viewportKeyframes'][string]> = {};
  const autoKeyframeByVideo: Record<string, string> = {};
  for (const v of Object.values(snapshot.videos)) {
    if (v.viewport_keyframe_ids.length === 0) {
      const kfId = uuidv4();
      const aspectRatio = 16 / 9;
      const heightNorm = 0.5;
      const widthNorm = heightNorm / aspectRatio;
      autoKeyframes[kfId] = {
        id: kfId,
        videoId: v.id,
        versionId,
        frameNumber: 0,
        x: (1 - widthNorm) / 2,
        y: (1 - heightNorm) / 2,
        width: widthNorm,
        height: heightNorm,
      };
      autoKeyframeByVideo[v.id] = kfId;
    }
  }

  return {
    instructionId: snapshot.instruction.id,
    instructionName: snapshot.instruction.name,
    instructionDescription: snapshot.instruction.description ?? null,
    instructionPreviewImageId: null,
    coverImageAreaId: snapshot.instruction.cover_image_area_id ?? null,
    articleNumber: snapshot.instruction.article_number ?? null,
    estimatedDuration: snapshot.instruction.estimated_duration ?? null,
    sourceLanguage: snapshot.instruction.source_language ?? 'de',
    useBlurred: !!snapshot.instruction.use_blurred,
    currentVersionId: versionId,
    liteSubstepLimit: null,
    assemblies: {},
    steps: Object.fromEntries(
      Object.values(snapshot.steps).map(s => [s.id, {
        id: s.id,
        versionId,
        instructionId: s.instruction_id,
        assemblyId: null,
        stepNumber: s.step_number,
        title: s.title,
        description: null,
        repeatCount: s.repeat_count ?? 1,
        repeatLabel: s.repeat_label ?? null,
        substepIds: s.substep_ids,
      }])
    ),
    substeps: Object.fromEntries(
      Object.values(snapshot.substeps).map(s => [s.id, {
        id: s.id,
        versionId,
        stepId: s.step_id,
        stepOrder: s.step_order,
        creationOrder: s.step_order,
        title: s.title,
        description: null,
        displayMode: s.display_mode ?? 'normal',
        repeatCount: s.repeat_count ?? 1,
        repeatLabel: s.repeat_label ?? null,
        imageRowIds: s.image_row_ids,
        videoSectionRowIds: s.video_section_row_ids,
        partToolRowIds: s.part_tool_row_ids,
        noteRowIds: s.note_row_ids,
        descriptionRowIds: s.description_row_ids,
        referenceRowIds: s.reference_row_ids ?? [],
      }])
    ),
    videos: Object.fromEntries(
      Object.values(snapshot.videos).map(v => [v.id, {
        id: v.id,
        instructionId: snapshot.instruction.id,
        orderId: '',
        userId: null,
        videoPath: v.video_path ?? '',
        fps: v.fps,
        order: v.order,
        proxyStatus: 'NotNeeded' as const,
        width: null,
        height: null,
        sectionIds: videoSectionsByVideo[v.id] || [],
        frameAreaIds: frameAreasByVideo[v.id] || [],
        viewportKeyframeIds: autoKeyframeByVideo[v.id]
          ? [autoKeyframeByVideo[v.id]]
          : v.viewport_keyframe_ids,
      }])
    ),
    videoSections: Object.fromEntries(
      Object.values(snapshot.videoSections).map(vs => [vs.id, {
        id: vs.id,
        versionId,
        videoId: vs.video_id,
        startFrame: vs.start_frame,
        endFrame: vs.end_frame,
        localPath: vs.url_720p || null,
      }])
    ),
    videoFrameAreas: Object.fromEntries(
      Object.values(snapshot.videoFrameAreas).map(vfa => [vfa.id, {
        id: vfa.id,
        versionId,
        videoId: vfa.video_id,
        frameNumber: vfa.frame_number,
        x: vfa.x,
        y: vfa.y,
        width: vfa.width,
        height: vfa.height,
        type: vfa.type as 'SubstepImage',
        localPath: vfa.url_720p || null,
      }])
    ),
    viewportKeyframes: {
      ...Object.fromEntries(
        Object.values(snapshot.viewportKeyframes).map(kf => [kf.id, {
          id: kf.id,
          videoId: kf.video_id,
          versionId,
          frameNumber: kf.frame_number,
          x: kf.x,
          y: kf.y,
          width: kf.width,
          height: kf.height,
          interpolation: kf.interpolation,
        }])
      ),
      ...autoKeyframes,
    },
    partTools: Object.fromEntries(
      Object.values(snapshot.partTools).map(pt => [pt.id, {
        id: pt.id,
        versionId,
        instructionId: pt.instruction_id,
        previewImageId: null,
        name: pt.name,
        type: pt.type as 'Part' | 'Tool',
        partNumber: pt.part_number,
        amount: pt.amount ?? 0,
        description: pt.description ?? null,
        unit: pt.unit ?? null,
        material: pt.material ?? null,
        dimension: pt.dimension ?? null,
        iconId: pt.icon_id ?? null,
        iconIsPreview: !!(pt as unknown as Record<string, unknown>).icon_is_preview,
      }])
    ),
    notes: Object.fromEntries(
      Object.values(snapshot.notes).map(n => [n.id, {
        id: n.id,
        versionId,
        instructionId: n.instruction_id,
        text: n.text,
        level: n.level as 'Info' | 'Quality' | 'Warning' | 'Critical',
        safetyIconId: n.safety_icon_id ?? null,
        safetyIconCategory: n.safety_icon_category ?? null,
      }])
    ),
    substepImages: Object.fromEntries(
      Object.values(snapshot.substepImages).map(si => [si.id, {
        id: si.id,
        versionId,
        videoFrameAreaId: si.video_frame_area_id,
        substepId: si.substep_id,
        order: si.order,
      }])
    ),
    substepPartTools: Object.fromEntries(
      Object.values(snapshot.substepPartTools).map(spt => [spt.id, {
        id: spt.id,
        versionId,
        substepId: spt.substep_id,
        partToolId: spt.part_tool_id,
        amount: spt.amount,
        order: 0,
      }])
    ),
    substepNotes: Object.fromEntries(
      Object.values(snapshot.substepNotes).map(sn => [sn.id, {
        id: sn.id,
        versionId,
        substepId: sn.substep_id,
        noteId: sn.note_id,
        order: 0,
      }])
    ),
    substepDescriptions: Object.fromEntries(
      Object.values(snapshot.substepDescriptions).map(sd => [sd.id, {
        id: sd.id,
        versionId,
        substepId: sd.substep_id,
        text: sd.text,
        order: sd.order,
      }])
    ),
    substepVideoSections: Object.fromEntries(
      Object.values(snapshot.substepVideoSections).map(svs => [svs.id, {
        id: svs.id,
        versionId,
        substepId: svs.substep_id,
        videoSectionId: svs.video_section_id,
        order: svs.order,
      }])
    ),
    partToolVideoFrameAreas: Object.fromEntries(
      Object.values(snapshot.partToolVideoFrameAreas).map(row => [row.id, {
        id: row.id,
        versionId,
        partToolId: row.part_tool_id,
        videoFrameAreaId: row.video_frame_area_id,
        order: row.order,
        isPreviewImage: !!row.is_preview_image,
      }])
    ),
    drawings: Object.fromEntries(
      Object.values(snapshot.drawings).map(d => [d.id, {
        id: d.id,
        versionId,
        substepImageId: d.substep_image_id,
        substepId: d.substep_id,
        startFrame: d.start_frame,
        endFrame: d.end_frame,
        type: d.type as import('@/features/instruction').ShapeType,
        color: d.color,
        strokeWidth: d.stroke_width,
        x1: d.x1,
        y1: d.y1,
        x2: d.x2,
        y2: d.y2,
        x: d.x,
        y: d.y,
        content: d.content,
        fontSize: d.font_size,
        points: d.points,
        order: d.order,
      }])
    ),
    substepReferences: Object.fromEntries(
      Object.values(snapshot.substepReferences ?? {}).map(sr => [sr.id, {
        id: sr.id,
        versionId,
        substepId: sr.substep_id,
        targetType: sr.target_type as 'step' | 'substep',
        targetId: sr.target_id,
        sourceInstructionId: sr.source_instruction_id,
        order: sr.order,
        sourceLanguage: sr.source_language,
        kind: sr.kind ?? 'see',
        label: sr.label ?? null,
      }])
    ),
    safetyIcons: Object.fromEntries(
      Object.values(snapshot.safetyIcons ?? {}).map(si => [si.id, {
        id: si.id,
        filename: si.filename,
        category: si.category,
        label: si.label,
        description: si.description,
      }])
    ),
  };
}
