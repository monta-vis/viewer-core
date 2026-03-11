import { app, BrowserWindow, ipcMain, Menu, protocol } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { createReadStream, existsSync, statSync } from "fs";
import { extname } from "path";
import log from "electron-log/main";
import { resolveMediaPath } from "./projects.js";
import { resolveCatalogIconPath } from "./catalogs.js";
import type { CatalogType } from "./catalogs.js";
import type { ProjectChanges } from "./projects.js";
import { importMvisFromPath } from "./import-mvis.js";
import { exportProject } from "./export.js";
import type { ExportType } from "./export.js";
import type { VideoUploadArgs } from "./video.js";
import { initElectronPaths } from "./electronPaths.js";
import { DbWorker } from "./dbWorker.js";

log.initialize();
log.info('[main] electron-log initialized. Log file:', log.transports.file.getFile().path);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// ---------------------------------------------------------------------------
// Single-instance lock & .mvis file open handling
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;
let pendingMvisPath: string | null = null;

/** Extract the first .mvis path from an argv array. */
function findMvisArg(argv: string[]): string | null {
  return argv.find((arg) => arg.toLowerCase().endsWith(".mvis")) ?? null;
}

/** Import a .mvis file and navigate the renderer to the project. */
async function handleOpenMvisFile(filePath: string): Promise<void> {
  log.info('[main] handleOpenMvisFile called:', filePath);
  const fileName = path.basename(filePath, ".mvis");

  try {
    // Navigate to dashboard and show importing card immediately
    if (mainWindow) {
      log.info('[main] Sending navigate + mvis-import:start to renderer');
      mainWindow.webContents.send("navigate", "/");
      mainWindow.webContents.send("mvis-import:start", { fileName });
    } else {
      log.warn('[main] mainWindow is null, cannot send import signals');
    }

    const result = await importMvisFromPath(filePath);
    log.info('[main] importMvisFromPath result:', JSON.stringify(result));

    // Signal import complete
    if (mainWindow) {
      mainWindow.webContents.send("mvis-import:complete", {
        success: result.success,
        folderName: result.folderName,
      });
    }

    if (result.success && result.folderName && mainWindow) {
      const navPath = `/view/${encodeURIComponent(result.folderName)}`;
      log.info('[main] Navigating to:', navPath);
      mainWindow.webContents.send("navigate", navPath);
    } else if (!result.success) {
      log.error('[main] Import failed:', result.error);
    }
  } catch (err) {
    log.error('[main] handleOpenMvisFile unexpected error:', err);
    if (mainWindow) {
      mainWindow.webContents.send("mvis-import:complete", { success: false });
    }
  }
}

// Request single-instance lock — if we're a second instance, forward args and quit
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    log.info('[main] second-instance event, argv:', argv);
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // Handle .mvis arg from second instance
    const mvisPath = findMvisArg(argv);
    if (mvisPath) {
      log.info('[main] second-instance: found .mvis arg:', mvisPath);
      void handleOpenMvisFile(mvisPath);
    }
  });

  // macOS: file opened while app is running or before ready
  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    log.info('[main] open-file event:', filePath);
    if (mainWindow) {
      void handleOpenMvisFile(filePath);
    } else {
      pendingMvisPath = filePath;
    }
  });

  // Windows/Linux: check argv on first launch
  const argMvis = findMvisArg(process.argv);
  if (argMvis) {
    log.info('[main] Found .mvis in process.argv:', argMvis);
    pendingMvisPath = argMvis;
  }
}

// ---------------------------------------------------------------------------
// Custom protocol registration (must happen before app.ready)
// ---------------------------------------------------------------------------

protocol.registerSchemesAsPrivileged([
  { scheme: "mvis-media", privileges: { stream: true, supportFetchAPI: true } },
  { scheme: "mvis-catalog", privileges: { supportFetchAPI: true } },
]);

// ---------------------------------------------------------------------------
// MIME types for media files
// ---------------------------------------------------------------------------

const MEDIA_MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".m4v": "video/x-m4v",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

// ---------------------------------------------------------------------------
// Stream helper
// ---------------------------------------------------------------------------

function createWebReadableStream(
  nodeStream: import("fs").ReadStream,
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) =>
        controller.enqueue(chunk),
      );
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

// ---------------------------------------------------------------------------
// Protocol handler
// ---------------------------------------------------------------------------

function registerProtocol(): void {
  protocol.handle("mvis-media", (request) => {
    const url = new URL(request.url);
    const folderName = decodeURIComponent(url.hostname);
    const relativePath = decodeURIComponent(url.pathname.slice(1));

    const filePath = resolveMediaPath(folderName, relativePath);
    if (!filePath || !existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }

    const stat = statSync(filePath);
    const fileSize = stat.size;
    const mimeType =
      MEDIA_MIME_TYPES[extname(filePath).toLowerCase()] ??
      "application/octet-stream";
    const rangeHeader = request.headers.get("Range");

    // Add CSP to disable script execution in SVG files
    const securityHeaders: Record<string, string> = mimeType === "image/svg+xml"
      ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }
      : {};

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const stream = createReadStream(filePath, { start, end });
        return new Response(createWebReadableStream(stream), {
          status: 206,
          headers: {
            "Content-Type": mimeType,
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Content-Length": String(chunkSize),
            "Accept-Ranges": "bytes",
            ...securityHeaders,
          },
        });
      }
    }

    const stream = createReadStream(filePath);
    return new Response(createWebReadableStream(stream), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        ...securityHeaders,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Catalog protocol handler
// ---------------------------------------------------------------------------

function registerCatalogProtocol(): void {
  protocol.handle("mvis-catalog", (request) => {
    const url = new URL(request.url);
    const catalogType = decodeURIComponent(url.hostname);
    const pathParts = url.pathname.slice(1).split("/").map(decodeURIComponent);

    if (pathParts.length < 2) {
      return new Response("Not Found", { status: 404 });
    }

    const validTypes = ["parttoolicons", "safetyicons"];
    if (!validTypes.includes(catalogType.toLowerCase())) {
      return new Response("Not Found", { status: 404 });
    }

    const filePath = resolveCatalogIconPath(
      catalogType as CatalogType,
      pathParts[0],
      pathParts[1],
    );

    if (!filePath || !existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }

    const stat = statSync(filePath);
    const mimeType =
      MEDIA_MIME_TYPES[extname(filePath).toLowerCase()] ??
      "application/octet-stream";

    // Add CSP to disable script execution in SVG files
    const securityHeaders: Record<string, string> = mimeType === "image/svg+xml"
      ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }
      : {};

    const stream = createReadStream(filePath);
    return new Response(createWebReadableStream(stream), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(stat.size),
        ...securityHeaders,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// DB Worker
// ---------------------------------------------------------------------------

let dbWorker: DbWorker;

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  dbWorker = new DbWorker(
    path.join(__dirname, "dbWorkerThread.cjs"),
    {
      documentsPath: app.getPath("documents"),
      homePath: app.getPath("home"),
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
    },
  );

  ipcMain.handle("projects:list", () =>
    dbWorker.request("listProjects"),
  );

  ipcMain.handle("projects:get-data", (_event, folderName: string) =>
    dbWorker.request("getProjectData", folderName),
  );

  ipcMain.handle(
    "projects:save-data",
    (_event, folderName: string, changes: ProjectChanges) =>
      dbWorker.request("saveProjectData", folderName, changes),
  );

  ipcMain.handle(
    "projects:upload-parttool-image",
    (_event, folderName: string, partToolId: string, imagePath: string, crop?: { x: number; y: number; width: number; height: number }) =>
      dbWorker.request("uploadPartToolImage", folderName, partToolId, imagePath, crop),
  );

  ipcMain.handle(
    "projects:upload-cover-image",
    (_event, folderName: string, imagePath: string, crop?: { x: number; y: number; width: number; height: number }) =>
      dbWorker.request("uploadCoverImage", folderName, imagePath, crop),
  );

  ipcMain.handle(
    "projects:upload-substep-image",
    (_event, folderName: string, substepId: string, imagePath: string, crop?: { x: number; y: number; width: number; height: number }) =>
      dbWorker.request("uploadSubstepImage", folderName, substepId, imagePath, crop),
  );

  ipcMain.handle(
    "projects:upload-step-preview-image",
    (_event, folderName: unknown, stepId: unknown, imagePath: unknown, crop?: { x: number; y: number; width: number; height: number }) => {
      if (typeof folderName !== "string" || typeof stepId !== "string" || typeof imagePath !== "string") {
        return { success: false, error: "Invalid arguments" };
      }
      return dbWorker.request("uploadStepPreviewImage", folderName, stepId, imagePath, crop);
    },
  );

  ipcMain.handle(
    "projects:upload-assembly-preview-image",
    (_event, folderName: unknown, assemblyId: unknown, imagePath: unknown, crop?: { x: number; y: number; width: number; height: number }) => {
      if (typeof folderName !== "string" || typeof assemblyId !== "string" || typeof imagePath !== "string") {
        return { success: false, error: "Invalid arguments" };
      }
      return dbWorker.request("uploadAssemblyPreviewImage", folderName, assemblyId, imagePath, crop);
    },
  );

  ipcMain.handle(
    "projects:upload-repeat-preview-image",
    (_event, folderName: unknown, substepId: unknown, imagePath: unknown, crop?: { x: number; y: number; width: number; height: number }) => {
      if (typeof folderName !== "string" || typeof substepId !== "string" || typeof imagePath !== "string") {
        return { success: false, error: "Invalid arguments" };
      }
      return dbWorker.request("uploadRepeatPreviewImage", folderName, substepId, imagePath, crop);
    },
  );

  ipcMain.handle(
    "projects:upload-substep-video",
    (_event, folderName: unknown, substepId: unknown, args: unknown) => {
      if (typeof folderName !== "string" || typeof substepId !== "string") {
        return { success: false, error: "Invalid arguments" };
      }
      if (
        !args ||
        typeof args !== "object" ||
        typeof (args as Record<string, unknown>).sourceVideoPath !== "string"
      ) {
        return { success: false, error: "Invalid video upload arguments" };
      }
      return dbWorker.request("uploadSubstepVideo", folderName, substepId, args as VideoUploadArgs);
    },
  );

  ipcMain.handle(
    "projects:copy-catalog-icon",
    (_event, folderName: unknown, catalogType: unknown, iconId: unknown, entryId: unknown) => {
      if (typeof folderName !== "string" || typeof catalogType !== "string" || typeof iconId !== "string" || typeof entryId !== "string") {
        return { success: false, error: "Invalid arguments" };
      }
      if (catalogType !== "SafetyIcons" && catalogType !== "PartToolIcons") {
        return { success: false, error: `Invalid catalog type: ${catalogType}` };
      }
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(entryId)) {
        return { success: false, error: "entryId must be a valid UUID" };
      }
      return dbWorker.request("copyCatalogIcon", folderName, catalogType, iconId, entryId);
    },
  );

  ipcMain.handle("catalogs:get-safety-icons", () =>
    dbWorker.request("getSafetyIconCatalogs"),
  );

  ipcMain.handle("catalogs:get-parttool-icons", () =>
    dbWorker.request("getPartToolIconCatalogs"),
  );

  // Export stays on main thread (uses dialog.showSaveDialog)
  ipcMain.handle(
    "projects:export",
    (_event, folderName: unknown, type: unknown) => {
      if (typeof folderName !== "string")
        throw new Error("Invalid folderName");
      if (
        typeof type !== "string" ||
        !["mvis", "mweb"].includes(type)
      )
        throw new Error("Invalid export type");
      return exportProject(folderName, type as ExportType);
    },
  );

  // PDF generation — creates a hidden BrowserWindow, renders PrintView, calls printToPDF
  ipcMain.handle("print:generate-pdf", async (_event, folderName: unknown) => {
    if (typeof folderName !== "string") {
      return { success: false, error: "Invalid folderName" };
    }
    // Reject path traversal and dangerous characters
    if (/[/\\]|\.\./.test(folderName)) {
      return { success: false, error: "Invalid folderName: contains illegal characters" };
    }

    const hiddenWin = new BrowserWindow({
      show: false,
      width: 1024,
      height: 768,
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    try {
      if (isDev && process.env["VITE_DEV_SERVER_URL"]) {
        await hiddenWin.loadURL(
          `${process.env["VITE_DEV_SERVER_URL"]}#/view/${encodeURIComponent(folderName)}?print=true`,
        );
      } else {
        await hiddenWin.loadFile(
          path.join(__dirname, "../dist/index.html"),
          { hash: `/view/${encodeURIComponent(folderName)}?print=true` },
        );
      }

      // Poll for data-pdf-ready (max 30s)
      await hiddenWin.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('PDF render timeout')), 30000);
          const check = () => {
            if (document.querySelector('[data-pdf-ready="true"]')) {
              clearTimeout(timeout);
              resolve(true);
            } else setTimeout(check, 200);
          };
          check();
        });
      `);

      const pdfData = await hiddenWin.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: "A4",
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
      });

      return { success: true, data: pdfData.toString("base64") };
    } catch (err) {
      log.error("[print:generate-pdf] Failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      hiddenWin.close();
    }
  });
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function getIconPath(): string {
  if (isDev) {
    return path.join(process.cwd(), "resources", "icon.ico");
  }
  return path.join(app.getAppPath(), "resources", "icon.ico");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  win.on("closed", () => {
    mainWindow = null;
  });

  if (isDev && process.env["VITE_DEV_SERVER_URL"]) {
    void win.loadURL(process.env["VITE_DEV_SERVER_URL"]);

    // F12 to toggle DevTools (dev only)
    win.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F12") {
        win.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Process pending .mvis file after React has mounted and registered IPC listeners
  const readyTimeout = setTimeout(() => {
    if (pendingMvisPath) {
      log.warn('[main] renderer:ready not received after 10s, processing pending .mvis anyway');
      const mvisPath = pendingMvisPath;
      pendingMvisPath = null;
      void handleOpenMvisFile(mvisPath);
    }
  }, 10_000);

  ipcMain.once("renderer:ready", () => {
    clearTimeout(readyTimeout);
    log.info('[main] renderer:ready received');
    if (pendingMvisPath) {
      log.info('[main] Processing pending .mvis:', pendingMvisPath);
      const mvisPath = pendingMvisPath;
      pendingMvisPath = null;
      void handleOpenMvisFile(mvisPath);
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

void app.whenReady().then(() => {
  // Initialize shared path config so modules that replaced direct `app.*`
  // calls with `getElectronPaths()` work on the main thread too (protocol
  // handler, import-mvis, export modules).
  initElectronPaths({
    documentsPath: app.getPath("documents"),
    homePath: app.getPath("home"),
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
  });

  Menu.setApplicationMenu(null);
  registerProtocol();
  registerCatalogProtocol();
  registerIpcHandlers();
  createWindow();
});

app.on("will-quit", () => {
  dbWorker?.terminate();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
