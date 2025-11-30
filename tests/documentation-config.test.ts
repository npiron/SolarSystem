import { describe, expect, it } from "vitest";
import { codeDocumentation, roadmapSections } from "../src/config/documentation.ts";

const allowedStatuses = ["planned", "idea", "in-progress"];

describe("documentation config", () => {
  it("exposes key code documentation sections", () => {
    expect(codeDocumentation.length).toBeGreaterThan(0);
    const configSection = codeDocumentation.find((section) => section.title.includes("Configuration"));
    expect(configSection?.items.some((item) => item.name === "VERSION")).toBe(true);
  });

  it("uses supported roadmap statuses", () => {
    roadmapSections.forEach((section) => {
      section.items.forEach((item) => {
        expect(allowedStatuses).toContain(item.status);
      });
    });
  });
});
