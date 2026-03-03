/**
 * Renderer-side logger backed by electron-log.
 * In non-Electron environments (Vite dev server) the default console
 * transport from @monta-vis/logger is used — no extra setup needed.
 */
import { configureLogger } from "@monta-vis/logger";

const isElectron = typeof window !== "undefined" && "electronAPI" in window;

if (isElectron) {
  import("electron-log/renderer").then((mod) => {
    const log = mod.default;
    log.errorHandler.startCatching();
    configureLogger(log);
  });
}
