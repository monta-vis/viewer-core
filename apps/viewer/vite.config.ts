import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electronSimple from "vite-plugin-electron/simple";
import electron from "vite-plugin-electron";

/**
 * Forces CJS output format for electron builds.
 * vite-plugin-electron sets lib.formats based on package.json "type",
 * and Vite's mergeConfig concatenates arrays instead of replacing them.
 * This plugin runs after merge and overrides formats to ["cjs"] only.
 */
function forceCjs(): Plugin {
  return {
    name: "force-cjs",
    config(config) {
      if (config.build?.lib && typeof config.build.lib === "object") {
        config.build.lib.formats = ["cjs"];
        config.build.lib.fileName = () => "[name].cjs";
      }
    },
  };
}

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
                  plugins: [forceCjs()],
                  build: {
                    target: "node18",
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
                  plugins: [forceCjs()],
                  build: {
                    target: "node18",
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
