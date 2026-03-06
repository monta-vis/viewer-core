/**
 * Shared path configuration for Electron main process and worker threads.
 *
 * On the main thread, initialized from `app.*` APIs.
 * On worker threads, initialized from `workerData`.
 */

export interface ElectronPaths {
  documentsPath: string;
  homePath: string;
  isPackaged: boolean;
  resourcesPath: string;
  appPath: string;
}

let _paths: ElectronPaths | null = null;

export function initElectronPaths(p: ElectronPaths): void {
  _paths = p;
}

export function getElectronPaths(): ElectronPaths {
  if (!_paths) {
    throw new Error(
      "ElectronPaths not initialized — call initElectronPaths() first",
    );
  }
  return _paths;
}
