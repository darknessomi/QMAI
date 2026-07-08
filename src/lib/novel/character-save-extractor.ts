import { sanitizeOutlineFileNamePart } from "./outline-workbench"

export type CharacterSaveConfidence = "high" | "medium" | "low"

export interface CharacterSaveDraft {
  id: string
  characterName: string
  roleType: string
  fileName: string
  content: string
  selected: boolean
  confidence: CharacterSaveConfidence
}

export interface CharacterSaveExtractionResult {
  drafts: CharacterSaveDraft[]
  errors: string[]
}

const ROLE_PATTERN = /(男主|女主|男配|女配|反派|导师|盟友|配角|主角)/
const NON_CHARACTER_HEADING_PATTERN =
  /^(?:人物设定|角色设定|人物小传|角色小传|人物关系|角色关系|群像|设定总览|世界观|卷纲|章纲|细纲|大纲|设定|背景|地图|力量体系|金手指|伏笔|组织|势力|时间线|剧情线|第.{1,12}卷(?:[：:].*)?)$/

export function buildCharacterFileName(roleType: string, characterName: string): string {
  const role = sanitizeOutlineFileNamePart(roleType) || "角色"
  const name = sanitizeOutlineFileNamePart(characterName) || "未命名"
  return `角色-${role}-${name}.md`
}

function normalizeRole(value: string | undefined): string {
  return value?.match(ROLE_PATTERN)?.[1] ?? "角色"
}

function cleanFieldValue(value: string): string {
  return value
    .replace(/[*_`#]/g, "")
    .replace(/^[-\s]+/, "")
    .trim()
}

function createDraft(
  roleType: string | undefined,
  characterName: string,
  content: string,
  confidence: CharacterSaveConfidence,
): CharacterSaveDraft {
  const role = normalizeRole(roleType)
  const name = sanitizeOutlineFileNamePart(cleanFieldValue(characterName))
  return {
    id: `${role}:${name}`,
    characterName: name,
    roleType: role,
    fileName: buildCharacterFileName(role, name),
    content: content.trim(),
    selected: confidence !== "low",
    confidence,
  }
}

function splitByCharacterHeadings(content: string): CharacterSaveDraft[] {
  const lines = content.split(/\r?\n/)
  const ranges: Array<{ start: number; end: number; roleType: string; name: string }> = []

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(/^#{1,4}\s*(?:(男主|女主|男配|女配|反派|导师|盟友|配角|主角)[：:\-\s]+)?(.{1,24})\s*$/)
    if (!match) continue

    const name = cleanFieldValue(match[2].replace(/^角色[-：:\s]*/, ""))
    if (!name || NON_CHARACTER_HEADING_PATTERN.test(name)) continue

    const nearbyText = lines.slice(index, index + 8).join("\n")
    const roleFromFields = nearbyText.match(/角色定位[：:]\s*(男主|女主|男配|女配|反派|导师|盟友|配角|主角)/)?.[1]
    if (!match[1] && !roleFromFields) continue

    ranges.push({
      start: index,
      end: lines.length,
      roleType: match[1] ?? roleFromFields ?? "角色",
      name,
    })
  }

  ranges.forEach((range, index) => {
    range.end = ranges[index + 1]?.start ?? lines.length
  })

  return ranges.map((range) => createDraft(
    range.roleType,
    range.name,
    lines.slice(range.start, range.end).join("\n"),
    "high",
  ))
}

function extractSingleByFields(content: string): CharacterSaveDraft | null {
  const name = content.match(/(?:姓名|角色名|名字)[：:]\s*([^\n，,。；;]{1,24})/)?.[1]?.trim()
  const role = content.match(/(?:角色定位|定位|身份)[：:]\s*(男主|女主|男配|女配|反派|导师|盟友|配角|主角)/)?.[1]?.trim()
  if (!name) return null
  return createDraft(role, name, content, role ? "medium" : "low")
}

export function extractCharacterSaveDrafts(content: string): CharacterSaveExtractionResult {
  const headingDrafts = splitByCharacterHeadings(content)
  if (headingDrafts.length > 0) return { drafts: headingDrafts, errors: [] }

  const fieldDraft = extractSingleByFields(content)
  if (fieldDraft) return { drafts: [fieldDraft], errors: [] }

  return {
    drafts: [],
    errors: ["未识别到可单独保存的角色，请手动选择保存范围或让 AI 按一人一档重新输出。"],
  }
}
