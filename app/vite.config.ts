import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA, VitePWAOptions } from "vite-plugin-pwa";

const pwaOptions: Partial<VitePWAOptions> = {
  base: "./",
  registerType: "autoUpdate",
  includeAssets: ["like.json", "tower.svg", "db/db.siivadb.zst", "icons/*.png"],
  manifest: {
    name: "SiIvaDB",
    short_name: "SiIvaDB",
    start_url: "./",
    scope: ".",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#000000",
    icons: [
      {
        src: "icons/512.png",
        type: "images/png",
        purpose: "any maskable",
        sizes: "512x512",
      },
      {
        src: "icons/192.png",
        type: "image/svg",
        purpose: "any maskable",
        sizes: "192x192",
      },
      {
        src: "icons/92.png",
        type: "image/png",
        sizes: "92x92",
      },
    ],
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), VitePWA(pwaOptions)],
  base: "",
});
