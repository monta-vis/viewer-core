import { describe, it, expect } from "vitest";
import { buildSnapshotFromRows } from "../snapshot.js";
import type { SnapshotRowData } from "../snapshot.js";

function makeMinimalData(
  overrides?: Partial<SnapshotRowData>,
): SnapshotRowData {
  return {
    instruction: {
      id: "inst-1",
      name: "Test Instruction",
      description: "A test",
      revision: 1,
      cover_image_area_id: null,
      article_number: null,
      estimated_duration: null,
      source_language: "de",
      use_blurred: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    steps: [],
    substeps: [],
    videos: [],
    videoSections: [],
    videoFrameAreas: [],
    viewportKeyframes: [],
    notes: [],
    partTools: [],
    substepDescriptions: [],
    substepNotes: [],
    substepPartTools: [],
    substepImages: [],
    substepVideoSections: [],
    substepReferences: [],
    drawings: [],
    partToolVideoFrameAreas: [],
    branding: [],
    assemblies: [],
    translations: [],
    languages: [],
    ...overrides,
  };
}

describe("buildSnapshotFromRows", () => {
  it("returns correct meta for minimal data", () => {
    const result = buildSnapshotFromRows(makeMinimalData());
    const meta = result.meta as Record<string, unknown>;

    expect(meta.instruction_id).toBe("inst-1");
    expect(meta.revision).toBe(1);
    expect(meta.cdn_base_url).toBe("./media");
    expect(meta.languages).toEqual([]);
  });

  it("includes instruction fields", () => {
    const result = buildSnapshotFromRows(makeMinimalData());
    const inst = result.instruction as Record<string, unknown>;

    expect(inst.id).toBe("inst-1");
    expect(inst.name).toBe("Test Instruction");
    expect(inst.source_language).toBe("de");
  });

  it("builds steps with substep_ids", () => {
    const data = makeMinimalData({
      steps: [
        { id: "step-1", instruction_id: "inst-1", step_number: 1, title: "Step 1" },
      ],
      substeps: [
        { id: "sub-1", step_id: "step-1", step_order: 1, title: "Sub 1" },
        { id: "sub-2", step_id: "step-1", step_order: 2, title: "Sub 2" },
      ],
    });

    const result = buildSnapshotFromRows(data);
    const steps = result.steps as Record<string, Record<string, unknown>>;

    expect(steps["step-1"].substep_ids).toEqual(["sub-1", "sub-2"]);
  });

  it("builds video sections with relative URLs", () => {
    const data = makeMinimalData({
      videoSections: [
        {
          id: "vs-1",
          video_id: "v-1",
          start_frame: 0,
          end_frame: 100,
          fps: null,
          has_blurred_version: 0,
        },
      ],
    });

    const result = buildSnapshotFromRows(data);
    const sections = result.videoSections as Record<
      string,
      Record<string, unknown>
    >;

    expect(sections["vs-1"].url_1080p).toBe("./media/sections/vs-1/video.mp4");
  });

  it("always uses video.mp4 URL even when use_blurred is set (blur handled at archive level)", () => {
    const data = makeMinimalData({
      instruction: {
        id: "inst-1",
        name: "Test",
        description: null,
        revision: 1,
        cover_image_area_id: null,
        article_number: null,
        estimated_duration: null,
        source_language: "de",
        use_blurred: 1,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      videoSections: [
        {
          id: "vs-1",
          video_id: "v-1",
          start_frame: 0,
          end_frame: 100,
          fps: null,
          has_blurred_version: 1,
        },
      ],
    });

    const result = buildSnapshotFromRows(data);
    const sections = result.videoSections as Record<
      string,
      Record<string, unknown>
    >;

    expect(sections["vs-1"].url_1080p).toBe(
      "./media/sections/vs-1/video.mp4",
    );
  });

  it("builds video frame areas with custom image_ext", () => {
    const data = makeMinimalData({
      videoFrameAreas: [
        {
          id: "vfa-1",
          video_id: "v-1",
          frame_number: 10,
          type: "SafetyIcon",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          image_ext: ".png",
        },
      ],
    });

    const result = buildSnapshotFromRows(data);
    const vfas = result.videoFrameAreas as Record<
      string,
      Record<string, unknown>
    >;

    expect(vfas["vfa-1"].url_1080p).toBe(
      "./media/frames/vfa-1/image.png",
    );
  });

  it("builds translations map", () => {
    const data = makeMinimalData({
      translations: [
        {
          entity_type: "instruction",
          entity_id: "inst-1",
          field_name: "name",
          language_code: "en",
          text: "English Name",
          is_auto: 0,
        },
      ],
      languages: ["en"],
    });

    const result = buildSnapshotFromRows(data);
    const translations = result.translations as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;

    expect(translations.instruction["inst-1"]["en"].name).toBe("English Name");
    expect(translations.instruction["inst-1"]["en"].is_auto).toBe(false);
  });

  it("places viewport_keyframe_ids on videoSections (not videos)", () => {
    const data = makeMinimalData({
      videos: [{ id: "v-1", fps: 30, order: 0, video_path: "video.mp4" }],
      videoSections: [
        {
          id: "vs-1",
          video_id: "v-1",
          start_frame: 0,
          end_frame: 100,
        },
        {
          id: "vs-2",
          video_id: "v-1",
          start_frame: 100,
          end_frame: 200,
        },
      ],
      viewportKeyframes: [
        { id: "kf-1", video_section_id: "vs-1", video_id: "v-1" },
        { id: "kf-2", video_section_id: "vs-1", video_id: "v-1" },
        { id: "kf-3", video_section_id: "vs-2", video_id: "v-1" },
      ],
    });

    const result = buildSnapshotFromRows(data);
    const sections = result.videoSections as Record<string, Record<string, unknown>>;
    const vids = result.videos as Record<string, Record<string, unknown>>;

    expect(sections["vs-1"].viewport_keyframe_ids).toEqual(["kf-1", "kf-2"]);
    expect(sections["vs-2"].viewport_keyframe_ids).toEqual(["kf-3"]);
    expect(vids["v-1"]).not.toHaveProperty("viewport_keyframe_ids");
  });

  it("uses tutorial_row_ids (not reference_row_ids) on substeps", () => {
    const data = makeMinimalData({
      steps: [{ id: "step-1", instruction_id: "inst-1", step_number: 1, title: "S" }],
      substeps: [{ id: "sub-1", step_id: "step-1", step_order: 1, title: "SS" }],
      substepReferences: [{ id: "ref-1", substep_id: "sub-1" }],
    });

    const result = buildSnapshotFromRows(data);
    const substeps = result.substeps as Record<string, Record<string, unknown>>;

    expect(substeps["sub-1"].tutorial_row_ids).toEqual(["ref-1"]);
    expect(substeps["sub-1"]).not.toHaveProperty("reference_row_ids");
  });

  it("groups substep relations correctly", () => {
    const data = makeMinimalData({
      steps: [{ id: "step-1", instruction_id: "inst-1", step_number: 1, title: "S" }],
      substeps: [{ id: "sub-1", step_id: "step-1", step_order: 1, title: "SS" }],
      substepNotes: [{ id: "sn-1", substep_id: "sub-1" }],
      substepPartTools: [{ id: "spt-1", substep_id: "sub-1" }],
      substepDescriptions: [{ id: "sd-1", substep_id: "sub-1" }],
    });

    const result = buildSnapshotFromRows(data);
    const substeps = result.substeps as Record<
      string,
      Record<string, unknown>
    >;

    expect(substeps["sub-1"].note_row_ids).toEqual(["sn-1"]);
    expect(substeps["sub-1"].part_tool_row_ids).toEqual(["spt-1"]);
    expect(substeps["sub-1"].description_row_ids).toEqual(["sd-1"]);
  });
});
