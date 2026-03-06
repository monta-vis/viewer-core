import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electronSimple from "vite-plugin-electron/simple";
import electron from "vite-plugin-electron";

export default defineConfig(({ mode }) => {
  const isElectron = mode === "electron";

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isElectron
        ? [
            electronSimple({
              main: {
                entry: "electron/main/index.ts",
                vite: {
                  build: {
                    rollupOptions: {
                      external: ["better-sqlite3"],
                    },
                  },
                },
              },
              preload: {
                input: "electron/preload/preload.ts",
              },
              renderer: {},
            }),
            ...electron([
              {
                entry: "electron/main/dbWorkerThread.ts",
                vite: {
                  build: {
                    rollupOptions: {
                      external: ["better-sqlite3"],
                    },
                  },
                },
              },
            ]),
          ]
        : []),
    ],
    build: {
      outDir: "dist",
    },
  };
});
