import { describe, expect, it } from "vitest";
import { createHudContext } from "../src/core/hudContext.ts";

describe("createHudContext", () => {
  it("should wire HUD DOM references and gameplay dependencies", () => {
    const ids = new Map<string, HTMLElement>();
    ids.set("essence", {} as HTMLElement);
    ids.set("softPrestige", {} as HTMLElement);

    const previousDocument = globalThis.document;

    try {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
          getElementById: (id: string) => ids.get(id) ?? null
        }
      });

      const uiRefs = {
        generatorButtons: new Map(),
        upgradeButtons: new Map(),
        talentButtons: new Map()
      };

      const context = createHudContext({
        uiRefs,
        generators: [],
        upgrades: [],
        talents: [],
        computeIdleRate: () => 42
      });

      expect(context.elements.essenceEl).toBe(ids.get("essence"));
      expect(context.elements.softPrestigeBtn).toBe(ids.get("softPrestige"));
      expect(context.computeIdleRate()).toBe(42);
      expect(context.uiRefs).toBe(uiRefs);
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument
      });
    }
  });
});
