const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  onNavigate: (callback: (path: string) => void) => {
    const handler = (_event: unknown, navPath: string) => callback(navPath);
    ipcRenderer.on("navigate", handler);
    return () => { ipcRenderer.removeListener("navigate", handler); };
  },
  catalogs: {
    getSafetyIcons: () => ipcRenderer.invoke("catalogs:get-safety-icons"),
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
    uploadSubstepVideo: (
      folderName: string,
      substepId: string,
      args: { sourceVideoPath: string },
    ) =>
      ipcRenderer.invoke(
        "projects:upload-substep-video",
        folderName,
        substepId,
        args,
      ),
    copyCatalogIcon: (folderName: string, catalogType: string, iconId: string, entryId: string) =>
      ipcRenderer.invoke("projects:copy-catalog-icon", folderName, catalogType, iconId, entryId),
    exportProject: (folderName: string, type: "mvis" | "mweb" | "pdf") =>
      ipcRenderer.invoke("projects:export", folderName, type),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
