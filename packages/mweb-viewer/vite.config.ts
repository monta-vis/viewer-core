import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist",
    assetsDir: ".",
    rollupOptions: {
      input: {
        mweb: path.resolve(__dirname, "mweb.html"),
      },
      output: {
        entryFileNames: "viewer.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.[0]?.endsWith(".css")) return "styles.css";
          return "[name][extname]";
        },
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom", "react-i18next", "i18next", "zustand"],
  },
});
