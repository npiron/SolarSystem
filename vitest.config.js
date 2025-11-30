import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      all: true,
      include: [
        "src/config/**/*.ts", 
        "src/systems/talents.ts",
        "src/systems/gameState.ts",
        "src/systems/progression.ts"
      ],
      exclude: [
        "src/config/index.ts",
        "src/systems/index.ts",
        "src/config/persistence.ts"  // Large module that requires mocking localStorage
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
