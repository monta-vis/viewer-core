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
    getMediaUrl: (folderName: string, relativePath: string) =>
      ipcRenderer.invoke("projects:get-media-url", folderName, relativePath),
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
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
