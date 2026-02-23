import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";

export default defineConfig(({ mode }) => {
  const isElectron = mode === "electron";

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isElectron
        ? [
            electron({
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
          ]
        : []),
    ],
    build: {
      outDir: "dist",
    },
  };
});
