const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    getData: (folderName: string) =>
      ipcRenderer.invoke("projects:get-data", folderName),
    getMediaUrl: (folderName: string, relativePath: string) =>
      ipcRenderer.invoke("projects:get-media-url", folderName, relativePath),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
