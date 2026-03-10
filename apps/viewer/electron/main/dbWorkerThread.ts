/**
 * Worker thread that owns all `better-sqlite3` database connections and
 * heavy file-I/O (FFmpeg image/video processing).
 *
 * Receives `{ id, method, args }` messages from the main thread,
 * dispatches to the appropriate handler, and returns the result.
 */

import { parentPort, workerData } from "worker_threads";
import {
  initElectronPaths,
  type ElectronPaths,
} from "./electronPaths.js";
import {
  listProjects,
  getProjectData,
  saveProjectData,
  uploadPartToolImage,
  uploadSubstepImage,
  uploadStepPreviewImage,
  uploadAssemblyPreviewImage,
  uploadRepeatPreviewImage,
  uploadCoverImage,
  copyCatalogIcon,
} from "./projects.js";
import type { ProjectChanges } from "./projects.js";
import { uploadSubstepVideo } from "./video.js";
import type { VideoUploadArgs } from "./video.js";
import { getSafetyIconCatalogs } from "./catalogs.js";
import type { CatalogType } from "./catalogs.js";

// Initialize path config from workerData (passed by DbWorker constructor)
initElectronPaths(workerData as ElectronPaths);

// ---------------------------------------------------------------------------
// Handler dispatch table
// ---------------------------------------------------------------------------

type HandlerFn = (...args: never[]) => unknown | Promise<unknown>;

const handlers: Record<string, HandlerFn> = {
  listProjects: (() => listProjects()) as HandlerFn,

  getProjectData: ((folderName: string) =>
    getProjectData(folderName)) as HandlerFn,

  saveProjectData: ((folderName: string, changes: ProjectChanges) =>
    saveProjectData(folderName, changes)) as HandlerFn,

  uploadPartToolImage: ((
    folderName: string,
    partToolId: string,
    imagePath: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => uploadPartToolImage(folderName, partToolId, imagePath, crop)) as HandlerFn,

  uploadCoverImage: ((
    folderName: string,
    imagePath: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => uploadCoverImage(folderName, imagePath, crop)) as HandlerFn,

  uploadSubstepImage: ((
    folderName: string,
    substepId: string,
    imagePath: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => uploadSubstepImage(folderName, substepId, imagePath, crop)) as HandlerFn,

  uploadStepPreviewImage: ((
    folderName: string,
    stepId: string,
    imagePath: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => uploadStepPreviewImage(folderName, stepId, imagePath, crop)) as HandlerFn,

  uploadAssemblyPreviewImage: ((
    folderName: string,
    assemblyId: string,
    imagePath: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => uploadAssemblyPreviewImage(folderName, assemblyId, imagePath, crop)) as HandlerFn,

  uploadRepeatPreviewImage: ((
    folderName: string,
    substepId: string,
    imagePath: string,
    crop?: { x: number; y: number; width: number; height: number },
  ) => uploadRepeatPreviewImage(folderName, substepId, imagePath, crop)) as HandlerFn,

  uploadSubstepVideo: ((
    folderName: string,
    substepId: string,
    args: VideoUploadArgs,
  ) => uploadSubstepVideo(folderName, substepId, args)) as HandlerFn,

  copyCatalogIcon: ((
    folderName: string,
    catalogType: CatalogType,
    iconId: string,
    entryId: string,
  ) => copyCatalogIcon(folderName, catalogType, iconId, entryId)) as HandlerFn,

  getSafetyIconCatalogs: (() => getSafetyIconCatalogs()) as HandlerFn,
};

// ---------------------------------------------------------------------------
// Message loop
// ---------------------------------------------------------------------------

interface WorkerMessage {
  id: number;
  method: string;
  args: unknown[];
}

parentPort?.on("message", async (msg: WorkerMessage) => {
  const { id, method, args } = msg;
  try {
    const fn = handlers[method];
    if (!fn) throw new Error(`Unknown worker method: ${method}`);
    const result = await (fn as (...a: unknown[]) => unknown)(...args);
    parentPort?.postMessage({ id, result });
  } catch (err) {
    parentPort?.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
