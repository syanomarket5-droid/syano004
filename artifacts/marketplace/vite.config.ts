import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Target modern evergreen browsers — produces smaller, faster bundles.
    // "esnext" = no transpilation, esbuild emits native JS as-is. Safe for
    // Chrome 80+, Firefox 78+, Safari 14+ (all that Tailwind v4 supports).
    // Previously "es2022" because i18n used top-level await; that is now
    // removed so "esnext" produces the most optimal output.
    target: "esnext",
    cssCodeSplit: true,
    // lightningcss: faster parser + smaller output than esbuild's CSS minifier.
    // Installed as a Vite peer dep (lightningcss@1.32.0). No extra install needed.
    cssMinify: "lightningcss",
    sourcemap: false,
    // Use esbuild minifier (fastest, very close to terser quality) and drop
    // debug noise from production bundles.
    minify: "esbuild",
    chunkSizeWarningLimit: 800,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Split heavy dependencies into long-cache vendor chunks so a code
        // change in the app doesn't bust the entire vendor cache.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // vendor-react must be a pure leaf with no imports from other vendor
          // chunks. Putting @radix-ui or recharts here previously created a
          // circular chunk dependency (vendor-react ↔ vendor-radix) that made
          // React resolve to `undefined` at module init time, causing:
          //   "Cannot read properties of undefined (reading 'useLayoutEffect')"
          // Radix UI and recharts are intentionally omitted — Rollup auto-chunks
          // them into shared chunks that only import vendor-react (one-way, safe).
          if (id.includes("react-dom") || id.match(/[\\/]react[\\/]/) || id.includes("scheduler")) {
            return "vendor-react";
          }
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("lucide-react") || id.includes("react-icons")) {
            return "vendor-icons";
          }
          if (id.includes("i18next") || id.includes("react-i18next")) {
            return "vendor-i18n";
          }
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("wouter")) return "vendor-router";
          if (id.includes("zod") || id.includes("react-hook-form") || id.includes("@hookform")) {
            return "vendor-forms";
          }
        },
        // Stable hashed filenames for long-term caching.
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  esbuild: {
    // Strip console.* and debugger in production builds for a smaller
    // payload and less main-thread work.
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // In dev the API server generates sitemaps dynamically.
    // Forward /sitemap*.xml requests to the API server so Vite serves
    // live, DB-driven XML instead of the static fallback in public/.
    proxy: {
      "/sitemap.xml":            { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-index.xml":      { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-pages.xml":      { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-categories.xml": { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-products.xml":   { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-stores.xml":     { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-cache":          { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    // Same proxy rules for `vite preview` so staging/preview builds also get
    // dynamic sitemaps when the API server is running alongside.
    proxy: {
      "/sitemap.xml":            { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-index.xml":      { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-pages.xml":      { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-categories.xml": { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-products.xml":   { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-stores.xml":     { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
      "/sitemap-cache":          { target: `http://localhost:${process.env.API_PORT ?? 8080}`, changeOrigin: true },
    },
  },
});
