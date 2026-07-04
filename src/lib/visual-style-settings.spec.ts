// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest"
import { applyVisualStyle, normalizeVisualStyle } from "./visual-style-settings"

describe("visual-style-settings", () => {
  beforeEach(() => {
    document.documentElement.className = ""
  })

  it("falls back to cangzhu for invalid values", () => {
    expect(normalizeVisualStyle("bad")).toBe("cangzhu")
    expect(normalizeVisualStyle(null)).toBe("cangzhu")
  })

  it("accepts all oriental visual styles", () => {
    expect(normalizeVisualStyle("classic")).toBe("classic")
    expect(normalizeVisualStyle("tianqing")).toBe("tianqing")
    expect(normalizeVisualStyle("qingci")).toBe("qingci")
    expect(normalizeVisualStyle("yunshan")).toBe("yunshan")
    expect(normalizeVisualStyle("cangzhu")).toBe("cangzhu")
    expect(normalizeVisualStyle("yuebai")).toBe("yuebai")
    expect(normalizeVisualStyle("gumo")).toBe("gumo")
  })

  it("toggles the selected visual style class", () => {
    applyVisualStyle("cangzhu")
    expect(document.documentElement.classList.contains("visual-cangzhu")).toBe(true)

    applyVisualStyle("classic")
    expect(document.documentElement.classList.contains("visual-cangzhu")).toBe(false)
  })

  it("keeps only one visual style class at a time", () => {
    applyVisualStyle("tianqing")
    applyVisualStyle("gumo")

    expect(document.documentElement.classList.contains("visual-tianqing")).toBe(false)
    expect(document.documentElement.classList.contains("visual-gumo")).toBe(true)
  })
})
