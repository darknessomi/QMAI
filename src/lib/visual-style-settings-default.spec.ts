import { describe, expect, it } from "vitest"
import { DEFAULT_VISUAL_STYLE, normalizeVisualStyle } from "./visual-style-settings"

describe("visual-style-settings default", () => {
  it("uses cangzhu as the default visual style for new users", () => {
    expect(DEFAULT_VISUAL_STYLE).toBe("cangzhu")
    expect(normalizeVisualStyle("bad")).toBe("cangzhu")
    expect(normalizeVisualStyle(null)).toBe("cangzhu")
  })
})
