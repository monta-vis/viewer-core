import { app, BrowserWindow, ipcMain, protocol } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { createReadStream, existsSync, statSync } from "fs";
import { extname } from "path";
import { listProjects, getProjectData, resolveMediaPath } from "./projects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

// ---------------------------------------------------------------------------
// Custom protocol registration (must happen before app.ready)
// ---------------------------------------------------------------------------

protocol.registerSchemesAsPrivileged([
  { scheme: "mvis-media", privileges: { stream: true, supportFetchAPI: true } },
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
      },
    });
  });
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  ipcMain.handle("projects:list", () => listProjects());
  ipcMain.handle("projects:get-data", (_event, folderName: string) =>
    getProjectData(folderName),
  );

  ipcMain.handle(
    "projects:get-media-url",
    (_event, folderName: string, relativePath: string) => {
      return `mvis-media://${encodeURIComponent(folderName)}/${encodeURIComponent(relativePath)}`;
    },
  );
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env["VITE_DEV_SERVER_URL"]) {
    void win.loadURL(process.env["VITE_DEV_SERVER_URL"]);
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // F12 toggles DevTools
  win.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12") {
      win.webContents.toggleDevTools();
    }
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

void app.whenReady().then(() => {
  registerProtocol();
  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
