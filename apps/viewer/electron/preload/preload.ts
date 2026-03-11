const { contextBridge, ipcRenderer, webUtils } = require("electron");

const electronAPI = {
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  print: {
    generatePdf: (folderName: string) => ipcRenderer.invoke("print:generate-pdf", folderName),
  },
  onNavigate: (callback: (path: string) => void) => {
    const handler = (_event: unknown, navPath: string) => callback(navPath);
    ipcRenderer.on("navigate", handler);
    return () => { ipcRenderer.removeListener("navigate", handler); };
  },
  signalReady: () => ipcRenderer.send("renderer:ready"),
  catalogs: {
    getSafetyIcons: () => ipcRenderer.invoke("catalogs:get-safety-icons"),
    getPartToolIcons: () => ipcRenderer.invoke("catalogs:get-parttool-icons"),
  },
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    getData: (folderName: string) =>
      ipcRenderer.invoke("projects:get-data", folderName),
    saveData: (
      folderName: string,
      changes: { changed: Record<string, Record<string, unknown>[]>; deleted: Record<string, string[]> },
    ) => ipcRenderer.invoke("projects:save-data", folderName, changes),
    uploadPartToolImage: (
      folderName: string,
      partToolId: string,
      imagePath: string,
      crop?: { x: number; y: number; width: number; height: number },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-parttool-image",
        folderName,
        partToolId,
        imagePath,
        crop,
      ),
    uploadCoverImage: (
      folderName: string,
      imagePath: string,
      crop?: { x: number; y: number; width: number; height: number },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-cover-image",
        folderName,
        imagePath,
        crop,
      ),
    uploadSubstepImage: (
      folderName: string,
      substepId: string,
      imagePath: string,
      crop?: { x: number; y: number; width: number; height: number },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-substep-image",
        folderName,
        substepId,
        imagePath,
        crop,
      ),
    uploadStepPreviewImage: (
      folderName: string,
      stepId: string,
      imagePath: string,
      crop?: { x: number; y: number; width: number; height: number },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-step-preview-image",
        folderName,
        stepId,
        imagePath,
        crop,
      ),
    uploadAssemblyPreviewImage: (
      folderName: string,
      assemblyId: string,
      imagePath: string,
      crop?: { x: number; y: number; width: number; height: number },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-assembly-preview-image",
        folderName,
        assemblyId,
        imagePath,
        crop,
      ),
    uploadRepeatPreviewImage: (
      folderName: string,
      substepId: string,
      imagePath: string,
      crop?: { x: number; y: number; width: number; height: number },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-repeat-preview-image",
        folderName,
        substepId,
        imagePath,
        crop,
      ),
    uploadSubstepVideo: (
      folderName: string,
      substepId: string,
      args: { sourceVideoPath: string; sections?: Array<{ startFrame: number; endFrame: number }> | null },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-substep-video",
        folderName,
        substepId,
        args,
      ),
    copyCatalogIcon: (folderName: string, catalogType: string, iconId: string, entryId: string) =>
      ipcRenderer.invoke("projects:copy-catalog-icon", folderName, catalogType, iconId, entryId),
    exportProject: (folderName: string, type: "mvis" | "mweb") =>
      ipcRenderer.invoke("projects:export", folderName, type),
    onImportStart: (callback: (data: { fileName: string }) => void) => {
      const handler = (_event: unknown, data: { fileName: string }) => callback(data);
      ipcRenderer.on("mvis-import:start", handler);
      return () => { ipcRenderer.removeListener("mvis-import:start", handler); };
    },
    onImportComplete: (callback: (data: { success: boolean; folderName?: string }) => void) => {
      const handler = (_event: unknown, data: { success: boolean; folderName?: string }) => callback(data);
      ipcRenderer.on("mvis-import:complete", handler);
      return () => { ipcRenderer.removeListener("mvis-import:complete", handler); };
    },
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
