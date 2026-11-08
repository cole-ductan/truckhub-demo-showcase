import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const offlineEnv = {
  VITE_SUPABASE_URL: "http://127.0.0.1:59999",
  VITE_SUPABASE_PUBLISHABLE_KEY: "fxm-test-publishable-placeholder",
  VITE_SUPABASE_PROJECT_ID: "fxm-local-test",
  VITE_MAPTILER_KEY: "",
};

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "src/test/env"),
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: offlineEnv,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
