export type VisualStyle =
  | "classic"
  | "tianqing"
  | "qingci"
  | "yunshan"
  | "cangzhu"
  | "yuebai"
  | "gumo"

export const DEFAULT_VISUAL_STYLE: VisualStyle = "cangzhu"
export const VISUAL_STYLE_STORAGE_KEY = "qmai-visual-style"

const VISUAL_STYLE_CLASSES: Record<Exclude<VisualStyle, "classic">, string> = {
  tianqing: "visual-tianqing",
  qingci: "visual-qingci",
  yunshan: "visual-yunshan",
  cangzhu: "visual-cangzhu",
  yuebai: "visual-yuebai",
  gumo: "visual-gumo",
}

const VISUAL_STYLE_VALUES = new Set<VisualStyle>([
  "classic",
  "tianqing",
  "qingci",
  "yunshan",
  "cangzhu",
  "yuebai",
  "gumo",
])

export function normalizeVisualStyle(value: unknown): VisualStyle {
  return typeof value === "string" && VISUAL_STYLE_VALUES.has(value as VisualStyle)
    ? value as VisualStyle
    : DEFAULT_VISUAL_STYLE
}

export function applyVisualStyle(style: VisualStyle): void {
  if (typeof document === "undefined") return
  const html = document.documentElement
  Object.values(VISUAL_STYLE_CLASSES).forEach((className) => {
    html.classList.remove(className)
  })
  if (style !== "classic") {
    html.classList.add(VISUAL_STYLE_CLASSES[style])
  }
}
