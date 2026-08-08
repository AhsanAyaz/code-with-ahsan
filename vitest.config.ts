import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

const emulatorConfigured = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.ts",
      "scripts/**/__tests__/**/*.test.ts",
    ],
    exclude: [
      ...configDefaults.exclude,
      ...(emulatorConfigured ? [] : ["src/__tests__/security-rules/**"]),
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
