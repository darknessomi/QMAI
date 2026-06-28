# De-AI Skill Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-version "技能库" that manages multiple de-AI skills and lets AI chat, whole-chapter de-AI, and selected-text de-AI call the chosen skill.

**Architecture:** Add a focused de-AI skill library module responsible for built-in templates, project config read/write, legacy `de-ai-skill.txt` compatibility, and skill resolution. Add a new top-level view for managing skills, then wire that resolved skill into the existing chat and chapter rewrite flows without changing unrelated writing workflows.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Tauri file commands, existing local i18n JSON, existing sidebar preference system.

---

## File Structure

- Create `src/lib/novel/de-ai-skill-library.ts`: typed de-AI skill model, built-in templates, project config normalization, file read/write, available/default skill resolution.
- Create `src/lib/novel/de-ai-skill-library.spec.ts`: unit tests for config normalization, legacy compatibility, disabled skill behavior, default fallback, create/update/delete helpers.
- Create `src/components/skill-library/skill-library-view.tsx`: "技能库" page with left skill list and right editor.
- Create `src/components/skill-library/de-ai-skill-picker.tsx`: reusable popover/dropdown for AI chat and chapter actions.
- Create `src/components/skill-library/skill-library-view.spec.tsx`: component-level tests for create/edit/delete/toggle/default/copy.
- Modify `src/lib/novel/de-ai-adapter.ts`: accept resolved skill content and provide helpers for skill-based system message construction.
- Modify `src/stores/chat-store.ts`: add per-conversation `selectedDeAiSkillId?: string | null` and setter.
- Modify `src/lib/persist.ts`: normalize loaded conversations so old data gets `selectedDeAiSkillId: undefined`.
- Modify `src/components/chat/chat-panel.tsx`: add input-bottom skill icon and inject selected/project-default skill as a system rule.
- Modify `src/components/layout/preview-panel.tsx`: replace immediate whole-chapter and selected-text de-AI calls with skill picker selection, then call existing preview flows.
- Modify `src/lib/sidebar-nav-preferences.ts`: add `skillLibrary` to configurable nav order.
- Modify `src/stores/wiki-store.ts`: add active view `"skillLibrary"`.
- Modify `src/components/layout/icon-sidebar.tsx`: add skill library icon item.
- Modify `src/components/layout/content-area.tsx`: lazy-load `SkillLibraryView`.
- Modify `src/components/settings/sections/interface-section.tsx`: include skill library in left sidebar visibility settings through existing label map.
- Modify `src/i18n/zh.json` and `src/i18n/en.json`: add labels and user-facing Chinese/English strings.

## Task 1: De-AI Skill Library Data Layer

**Files:**
- Create: `src/lib/novel/de-ai-skill-library.ts`
- Create: `src/lib/novel/de-ai-skill-library.spec.ts`
- Modify: `src/lib/novel/de-ai-adapter.ts`

- [ ] **Step 1: Write failing tests for default built-ins and config fallback**

Create `src/lib/novel/de-ai-skill-library.spec.ts` with these cases:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  BUILT_IN_DE_AI_SKILLS,
  DEFAULT_DE_AI_SKILL_ID,
  normalizeDeAiSkillConfig,
  resolveAvailableDeAiSkills,
  resolveEffectiveDeAiSkill,
} from "./de-ai-skill-library"

describe("de-ai skill library", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("ships five built-in de-AI skills", () => {
    expect(BUILT_IN_DE_AI_SKILLS.map((skill) => skill.id)).toEqual([
      "built-in:comprehensive",
      "built-in:reduce-explanation",
      "built-in:dialogue-natural",
      "built-in:break-regularity",
      "built-in:literary-retain",
    ])
  })

  it("normalizes an empty config to the built-in comprehensive skill", () => {
    expect(normalizeDeAiSkillConfig(null)).toEqual({
      version: 1,
      defaultSkillId: DEFAULT_DE_AI_SKILL_ID,
      disabledSkillIds: [],
      projectSkills: [],
    })
  })

  it("filters disabled skills from available skills", () => {
    const config = normalizeDeAiSkillConfig({
      disabledSkillIds: ["built-in:comprehensive", "built-in:dialogue-natural"],
    })
    const available = resolveAvailableDeAiSkills(config)
    expect(available.some((skill) => skill.id === "built-in:comprehensive")).toBe(false)
    expect(available.some((skill) => skill.id === "built-in:reduce-explanation")).toBe(true)
  })

  it("falls back when selected skill is disabled", () => {
    const config = normalizeDeAiSkillConfig({
      defaultSkillId: "built-in:comprehensive",
      disabledSkillIds: ["built-in:comprehensive"],
    })
    const skill = resolveEffectiveDeAiSkill(config, "built-in:comprehensive")
    expect(skill?.id).toBe("built-in:reduce-explanation")
  })
})
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test:mocks -- src/lib/novel/de-ai-skill-library.spec.ts
```

Expected: FAIL because `src/lib/novel/de-ai-skill-library.ts` does not exist.

- [ ] **Step 3: Implement the data module**

Create `src/lib/novel/de-ai-skill-library.ts` with these exports:

```ts
import { readFile, writeFile } from "@/commands/fs"
import { join } from "@tauri-apps/api/path"
import defaultDeAiSkill from "../../../skills/de-ai-writing/SKILL.md?raw"

export type DeAiSkillSource = "built-in" | "project" | "legacy"

export interface DeAiSkill {
  id: string
  name: string
  description: string
  templateId: string
  content: string
  source: DeAiSkillSource
  createdAt?: number
  updatedAt?: number
}

export interface DeAiSkillConfig {
  version: 1
  defaultSkillId: string
  disabledSkillIds: string[]
  projectSkills: DeAiSkill[]
}

export const DEFAULT_DE_AI_SKILL_ID = "built-in:comprehensive"

const baseSkill = defaultDeAiSkill.trim()

export const BUILT_IN_DE_AI_SKILLS: DeAiSkill[] = [
  {
    id: "built-in:comprehensive",
    name: "综合去AI味",
    description: "综合减少解释腔、模板句式和机械总结。",
    templateId: "comprehensive",
    content: baseSkill,
    source: "built-in",
  },
  {
    id: "built-in:reduce-explanation",
    name: "减少解释腔",
    description: "重点删掉动机解释、情绪总结和重复说明。",
    templateId: "reduce-explanation",
    content: `${baseSkill}\n\n## 本技能重点\n优先删减解释腔、总结腔、过度说明和“他之所以这样做”的直白动机解释。`,
    source: "built-in",
  },
  {
    id: "built-in:dialogue-natural",
    name: "对话口语化",
    description: "让人物对话更像真人说话，减少书面腔。",
    templateId: "dialogue-natural",
    content: `${baseSkill}\n\n## 本技能重点\n优先处理对话，让人物说半句话、停顿、回避、打断和带有个人口癖。`,
    source: "built-in",
  },
  {
    id: "built-in:break-regularity",
    name: "打破工整句式",
    description: "打散整齐段落、排比句和模板化起承转合。",
    templateId: "break-regularity",
    content: `${baseSkill}\n\n## 本技能重点\n优先打破工整句式、固定段落长度、机械排比和连续相同主谓结构。`,
    source: "built-in",
  },
  {
    id: "built-in:literary-retain",
    name: "保留文艺感",
    description: "去除AI味时保留必要修辞、氛围和文学质感。",
    templateId: "literary-retain",
    content: `${baseSkill}\n\n## 本技能重点\n去除AI味时不要硬压缩到干瘪，保留必要意象、氛围、节奏和文艺表达。`,
    source: "built-in",
  },
]

const BUILT_IN_IDS = new Set(BUILT_IN_DE_AI_SKILLS.map((skill) => skill.id))

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const result: string[] = []
  for (const value of values) {
    if (typeof value === "string" && value.trim() && !result.includes(value)) {
      result.push(value)
    }
  }
  return result
}

function normalizeProjectSkill(value: unknown): DeAiSkill | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<DeAiSkill>
  const id = typeof raw.id === "string" && raw.id.startsWith("project:") ? raw.id : `project:${Date.now()}`
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  const content = typeof raw.content === "string" ? raw.content.trim() : ""
  if (!name || !content) return null
  return {
    id,
    name,
    description: typeof raw.description === "string" ? raw.description : "",
    templateId: typeof raw.templateId === "string" ? raw.templateId : "custom",
    content,
    source: "project",
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  }
}

export function normalizeDeAiSkillConfig(value: unknown): DeAiSkillConfig {
  const raw = value && typeof value === "object" ? value as Partial<DeAiSkillConfig> : {}
  const projectSkills = Array.isArray(raw.projectSkills)
    ? raw.projectSkills.map(normalizeProjectSkill).filter((skill): skill is DeAiSkill => Boolean(skill))
    : []
  const disabledSkillIds = uniqueStrings(raw.disabledSkillIds)
  const knownIds = new Set([...BUILT_IN_IDS, ...projectSkills.map((skill) => skill.id)])
  const requestedDefault = typeof raw.defaultSkillId === "string" ? raw.defaultSkillId : DEFAULT_DE_AI_SKILL_ID
  const defaultSkillId = knownIds.has(requestedDefault) ? requestedDefault : DEFAULT_DE_AI_SKILL_ID
  return {
    version: 1,
    defaultSkillId,
    disabledSkillIds,
    projectSkills,
  }
}

export function getAllDeAiSkills(config: DeAiSkillConfig): DeAiSkill[] {
  return [...config.projectSkills, ...BUILT_IN_DE_AI_SKILLS]
}

export function resolveAvailableDeAiSkills(config: DeAiSkillConfig): DeAiSkill[] {
  const disabled = new Set(config.disabledSkillIds)
  return getAllDeAiSkills(config).filter((skill) => !disabled.has(skill.id))
}

export function resolveEffectiveDeAiSkill(
  config: DeAiSkillConfig,
  selectedSkillId?: string | null,
): DeAiSkill | null {
  if (selectedSkillId === null) return null
  const available = resolveAvailableDeAiSkills(config)
  if (available.length === 0) return null
  const requested = selectedSkillId ?? config.defaultSkillId
  return available.find((skill) => skill.id === requested) ?? available[0]
}

export async function loadDeAiSkillConfig(projectPath: string | null | undefined): Promise<DeAiSkillConfig> {
  if (!projectPath) return normalizeDeAiSkillConfig(null)
  try {
    const configPath = await join(projectPath, "de-ai-skills.json")
    const content = await readFile(configPath)
    return normalizeDeAiSkillConfig(JSON.parse(content))
  } catch {
    try {
      const legacyPath = await join(projectPath, "de-ai-skill.txt")
      const legacyContent = (await readFile(legacyPath)).trim()
      if (!legacyContent) return normalizeDeAiSkillConfig(null)
      const legacySkill: DeAiSkill = {
        id: "project:legacy-de-ai-skill",
        name: "旧版自定义去AI味 Skill",
        description: "从旧版 de-ai-skill.txt 读取的项目规则。",
        templateId: "legacy",
        content: legacyContent,
        source: "legacy",
      }
      return normalizeDeAiSkillConfig({
        defaultSkillId: legacySkill.id,
        projectSkills: [legacySkill],
      })
    } catch {
      return normalizeDeAiSkillConfig(null)
    }
  }
}

export async function saveDeAiSkillConfig(projectPath: string, config: DeAiSkillConfig): Promise<void> {
  const configPath = await join(projectPath, "de-ai-skills.json")
  await writeFile(configPath, JSON.stringify(normalizeDeAiSkillConfig(config), null, 2))
}
```

- [ ] **Step 4: Update adapter to expose skill-based prompts**

Modify `src/lib/novel/de-ai-adapter.ts` so existing callers can keep using `buildDeAiRewriteMessages(content, customSkill)`, and add:

```ts
export function buildDeAiSkillSystemPrompt(skillContent: string | null | undefined): string {
  return buildQmQuaiSystemPrompt(skillContent || undefined)
}
```

- [ ] **Step 5: Run the data tests**

Run:

```bash
npm run test:mocks -- src/lib/novel/de-ai-skill-library.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/novel/de-ai-skill-library.ts src/lib/novel/de-ai-skill-library.spec.ts src/lib/novel/de-ai-adapter.ts
git commit -m "feat: add de-ai skill library data model"
```

## Task 2: Add Skill Library Navigation and Route

**Files:**
- Modify: `src/lib/sidebar-nav-preferences.ts`
- Modify: `src/stores/wiki-store.ts`
- Modify: `src/components/layout/icon-sidebar.tsx`
- Modify: `src/components/layout/content-area.tsx`
- Create: `src/components/skill-library/skill-library-view.tsx`
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`
- Test: `src/lib/sidebar-nav-preferences.spec.ts`
- Test: `src/components/settings/interface-sidebar-nav.spec.ts`

- [ ] **Step 1: Write failing nav tests**

Extend `src/lib/sidebar-nav-preferences.spec.ts` with:

```ts
it("includes skill library in the configurable sidebar order", () => {
  expect(DEFAULT_SIDEBAR_NAV_ORDER).toContain("skillLibrary")
  expect(normalizeSidebarNavConfig({ order: ["wiki"] }).order).toContain("skillLibrary")
})
```

Extend `src/components/settings/interface-sidebar-nav.spec.ts` to assert the interface settings source references the label:

```ts
expect(interfaceSectionSource).toContain("skillLibrary")
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test:mocks -- src/lib/sidebar-nav-preferences.spec.ts src/components/settings/interface-sidebar-nav.spec.ts
```

Expected: FAIL because `skillLibrary` is not in the nav model.

- [ ] **Step 3: Update nav model and store active view**

In `src/lib/sidebar-nav-preferences.ts`, insert `"skillLibrary"` after `"soul"` in `DEFAULT_SIDEBAR_NAV_ORDER`.

In `src/stores/wiki-store.ts`, extend `activeView` union with `"skillLibrary"`.

In `src/components/layout/icon-sidebar.tsx`, import `WandSparkles` from `lucide-react` and add:

```ts
{ id: "skillLibrary", view: "skillLibrary", icon: WandSparkles, labelKey: "novel.nav.skillLibrary" },
```

In `src/components/layout/content-area.tsx`, add lazy import:

```ts
const SkillLibraryView = lazy(async () => {
  const mod = await import("@/components/skill-library/skill-library-view")
  return { default: mod.SkillLibraryView }
})
```

Add `case "skillLibrary"` that renders `SkillLibraryView` inside `Suspense`.

- [ ] **Step 4: Add placeholder skill library view**

Create `src/components/skill-library/skill-library-view.tsx`:

```tsx
export function SkillLibraryView() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-5 py-4">
        <h1 className="text-lg font-semibold">技能库</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理当前项目可用的去AI味技能。</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Add i18n labels**

In `src/i18n/zh.json`, add `novel.nav.skillLibrary: "技能库"`.

In `src/i18n/en.json`, add `novel.nav.skillLibrary: "Skill Library"`.

- [ ] **Step 6: Run nav tests**

Run:

```bash
npm run test:mocks -- src/lib/sidebar-nav-preferences.spec.ts src/components/settings/interface-sidebar-nav.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sidebar-nav-preferences.ts src/stores/wiki-store.ts src/components/layout/icon-sidebar.tsx src/components/layout/content-area.tsx src/components/skill-library/skill-library-view.tsx src/i18n/zh.json src/i18n/en.json src/lib/sidebar-nav-preferences.spec.ts src/components/settings/interface-sidebar-nav.spec.ts
git commit -m "feat: add skill library navigation entry"
```

## Task 3: Build Skill Library Management UI

**Files:**
- Modify: `src/components/skill-library/skill-library-view.tsx`
- Create: `src/components/skill-library/skill-library-view.spec.tsx`
- Modify: `src/lib/novel/de-ai-skill-library.ts`

- [ ] **Step 1: Add helper functions and tests**

Add tests to `src/lib/novel/de-ai-skill-library.spec.ts`:

```ts
import {
  createProjectDeAiSkillFromTemplate,
  deleteProjectDeAiSkill,
  setDeAiSkillEnabled,
  setDefaultDeAiSkill,
  updateProjectDeAiSkill,
} from "./de-ai-skill-library"

it("creates a project skill from a built-in template", () => {
  const config = normalizeDeAiSkillConfig(null)
  const next = createProjectDeAiSkillFromTemplate(config, "built-in:reduce-explanation", 1000)
  expect(next.projectSkills).toHaveLength(1)
  expect(next.projectSkills[0].source).toBe("project")
  expect(next.projectSkills[0].name).toContain("减少解释腔")
})

it("updates and deletes project skills without deleting built-ins", () => {
  const created = createProjectDeAiSkillFromTemplate(normalizeDeAiSkillConfig(null), "built-in:dialogue-natural", 1000)
  const id = created.projectSkills[0].id
  const updated = updateProjectDeAiSkill(created, id, { name: "对话规则", content: "只输出正文" }, 2000)
  expect(updated.projectSkills[0].name).toBe("对话规则")
  const deleted = deleteProjectDeAiSkill(updated, id)
  expect(deleted.projectSkills).toHaveLength(0)
  expect(deleteProjectDeAiSkill(deleted, "built-in:comprehensive")).toEqual(deleted)
})

it("disables a default skill and moves default to an available skill", () => {
  const config = normalizeDeAiSkillConfig({ defaultSkillId: "built-in:comprehensive" })
  const next = setDeAiSkillEnabled(config, "built-in:comprehensive", false)
  expect(next.disabledSkillIds).toContain("built-in:comprehensive")
  expect(next.defaultSkillId).toBe("built-in:reduce-explanation")
  expect(setDefaultDeAiSkill(next, "built-in:dialogue-natural").defaultSkillId).toBe("built-in:dialogue-natural")
})
```

- [ ] **Step 2: Implement helper functions**

In `src/lib/novel/de-ai-skill-library.ts`, add:

```ts
export function createProjectDeAiSkillFromTemplate(
  config: DeAiSkillConfig,
  templateId: string,
  now = Date.now(),
): DeAiSkillConfig {
  const template = getAllDeAiSkills(config).find((skill) => skill.id === templateId) ?? BUILT_IN_DE_AI_SKILLS[0]
  const skill: DeAiSkill = {
    id: `project:${now}`,
    name: `${template.name}副本`,
    description: template.description,
    templateId: template.templateId,
    content: template.content,
    source: "project",
    createdAt: now,
    updatedAt: now,
  }
  return normalizeDeAiSkillConfig({
    ...config,
    defaultSkillId: skill.id,
    projectSkills: [skill, ...config.projectSkills],
  })
}

export function updateProjectDeAiSkill(
  config: DeAiSkillConfig,
  skillId: string,
  patch: Pick<Partial<DeAiSkill>, "name" | "description" | "content">,
  now = Date.now(),
): DeAiSkillConfig {
  return normalizeDeAiSkillConfig({
    ...config,
    projectSkills: config.projectSkills.map((skill) =>
      skill.id === skillId
        ? { ...skill, ...patch, source: "project", updatedAt: now }
        : skill
    ),
  })
}

export function setDefaultDeAiSkill(config: DeAiSkillConfig, skillId: string): DeAiSkillConfig {
  return normalizeDeAiSkillConfig({ ...config, defaultSkillId: skillId })
}

export function setDeAiSkillEnabled(config: DeAiSkillConfig, skillId: string, enabled: boolean): DeAiSkillConfig {
  const disabledSkillIds = enabled
    ? config.disabledSkillIds.filter((id) => id !== skillId)
    : [...new Set([...config.disabledSkillIds, skillId])]
  const normalized = normalizeDeAiSkillConfig({ ...config, disabledSkillIds })
  if (normalized.defaultSkillId === skillId && !enabled) {
    const fallback = resolveAvailableDeAiSkills(normalized)[0]
    return normalizeDeAiSkillConfig({ ...normalized, defaultSkillId: fallback?.id ?? normalized.defaultSkillId })
  }
  return normalized
}

export function deleteProjectDeAiSkill(config: DeAiSkillConfig, skillId: string): DeAiSkillConfig {
  if (!skillId.startsWith("project:")) return config
  const projectSkills = config.projectSkills.filter((skill) => skill.id !== skillId)
  const next = normalizeDeAiSkillConfig({ ...config, projectSkills })
  if (next.defaultSkillId === skillId || !getAllDeAiSkills(next).some((skill) => skill.id === next.defaultSkillId)) {
    const fallback = resolveAvailableDeAiSkills(next)[0]
    return normalizeDeAiSkillConfig({ ...next, defaultSkillId: fallback?.id ?? DEFAULT_DE_AI_SKILL_ID })
  }
  return next
}
```

- [ ] **Step 3: Implement the page UI**

Replace the placeholder `SkillLibraryView` with a component that:

- loads `loadDeAiSkillConfig(project.path)` in `useEffect`;
- renders a left list from `getAllDeAiSkills(config)`;
- shows a checkbox per skill using `setDeAiSkillEnabled`;
- shows "默认" when `skill.id === config.defaultSkillId`;
- renders text inputs for name and description and a textarea for content;
- disables editing for `source === "built-in"`;
- saves through `saveDeAiSkillConfig(project.path, nextConfig)`;
- validates Chinese messages `"技能名称不能为空"` and `"技能规则不能为空"`;
- offers "复制为项目技能", "设为默认", and "删除" actions.

Use these stable test labels:

```tsx
data-testid="skill-library-view"
data-testid="skill-list"
data-testid="skill-name-input"
data-testid="skill-description-input"
data-testid="skill-content-input"
data-testid="skill-save-button"
data-testid="skill-copy-button"
data-testid="skill-default-button"
data-testid="skill-delete-button"
```

- [ ] **Step 4: Add component tests**

Create `src/components/skill-library/skill-library-view.spec.tsx` using existing testing patterns and mock `@/commands/fs` so it returns a project config. Cover:

```ts
it("renders built-in skills and selected detail editor", async () => {
  render(<SkillLibraryView />)
  expect(await screen.findByText("综合去AI味")).toBeInTheDocument()
  expect(screen.getByTestId("skill-library-view")).toBeInTheDocument()
})

it("prevents saving an empty project skill name", async () => {
  render(<SkillLibraryView />)
  await userEvent.clear(await screen.findByTestId("skill-name-input"))
  await userEvent.click(screen.getByTestId("skill-save-button"))
  expect(await screen.findByText("技能名称不能为空")).toBeInTheDocument()
})
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:mocks -- src/lib/novel/de-ai-skill-library.spec.ts src/components/skill-library/skill-library-view.spec.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/novel/de-ai-skill-library.ts src/lib/novel/de-ai-skill-library.spec.ts src/components/skill-library/skill-library-view.tsx src/components/skill-library/skill-library-view.spec.tsx
git commit -m "feat: add de-ai skill library management UI"
```

## Task 4: Persist Per-Conversation Skill Selection

**Files:**
- Modify: `src/stores/chat-store.ts`
- Modify: `src/lib/persist.ts`
- Test: add or update existing chat persistence/store tests if present.

- [ ] **Step 1: Update conversation type and setter**

In `src/stores/chat-store.ts`, add to `Conversation`:

```ts
selectedDeAiSkillId?: string | null
```

Add to `ChatState`:

```ts
setConversationDeAiSkillId: (id: string, skillId: string | null | undefined) => void
```

Initialize new conversations with:

```ts
selectedDeAiSkillId: undefined,
```

Implement setter:

```ts
setConversationDeAiSkillId: (id, selectedDeAiSkillId) =>
  set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === id ? { ...c, selectedDeAiSkillId, updatedAt: Date.now() } : c
    ),
  })),
```

- [ ] **Step 2: Normalize loaded conversation data**

In `src/lib/persist.ts`, add a local helper:

```ts
function normalizeConversation(conv: Conversation): Conversation {
  return {
    ...conv,
    deAiMode: Boolean(conv.deAiMode),
    selectedDeAiSkillId:
      conv.selectedDeAiSkillId === null || typeof conv.selectedDeAiSkillId === "string"
        ? conv.selectedDeAiSkillId
        : undefined,
  }
}
```

Apply it to conversations loaded from both new and old chat formats.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/stores/chat-store.ts src/lib/persist.ts
git commit -m "feat: persist chat de-ai skill selection"
```

## Task 5: AI Chat Skill Picker and System Injection

**Files:**
- Create: `src/components/skill-library/de-ai-skill-picker.tsx`
- Modify: `src/components/chat/chat-panel.tsx`
- Test: update or add chat panel tests.

- [ ] **Step 1: Create reusable picker**

Create `src/components/skill-library/de-ai-skill-picker.tsx`:

```tsx
import { useEffect, useState } from "react"
import { WandSparkles, X } from "lucide-react"
import { useWikiStore } from "@/stores/wiki-store"
import {
  loadDeAiSkillConfig,
  resolveAvailableDeAiSkills,
  resolveEffectiveDeAiSkill,
  type DeAiSkill,
} from "@/lib/novel/de-ai-skill-library"

interface DeAiSkillPickerProps {
  value?: string | null
  onChange: (skillId: string | null | undefined) => void
  includeDisableOption?: boolean
  buttonLabel?: string
}

export function DeAiSkillPicker({ value, onChange, includeDisableOption = true, buttonLabel }: DeAiSkillPickerProps) {
  const project = useWikiStore((s) => s.project)
  const [open, setOpen] = useState(false)
  const [skills, setSkills] = useState<DeAiSkill[]>([])
  const [effectiveName, setEffectiveName] = useState("技能")

  useEffect(() => {
    let cancelled = false
    loadDeAiSkillConfig(project?.path)
      .then((config) => {
        if (cancelled) return
        const available = resolveAvailableDeAiSkills(config)
        setSkills(available)
        setEffectiveName(resolveEffectiveDeAiSkill(config, value)?.name ?? "未启用")
      })
      .catch(() => {
        if (!cancelled) {
          setSkills([])
          setEffectiveName("未启用")
        }
      })
    return () => {
      cancelled = true
    }
  }, [project?.path, value])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        title="使用 / 调用命令和技能"
      >
        <WandSparkles className="h-4 w-4" />
        <span className="max-w-[8rem] truncate">{buttonLabel ?? effectiveName}</span>
      </button>
      {open ? (
        <div className="absolute bottom-9 left-0 z-50 w-64 rounded-md border bg-popover p-1 text-sm shadow-lg">
          {skills.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">暂无可用去AI味技能</div>
          ) : skills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              className="block w-full rounded px-2 py-2 text-left hover:bg-accent"
              onClick={() => {
                onChange(skill.id)
                setOpen(false)
              }}
            >
              <div className="truncate text-sm">{skill.name}</div>
              <div className="truncate text-xs text-muted-foreground">{skill.description}</div>
            </button>
          ))}
          {includeDisableOption ? (
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded px-2 py-2 text-left text-muted-foreground hover:bg-accent"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <X className="h-3.5 w-3.5" />
              关闭去AI味技能
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Wire picker into chat input controls**

In `src/components/chat/chat-panel.tsx`, import `DeAiSkillPicker`, `loadDeAiSkillConfig`, `resolveEffectiveDeAiSkill`, and `buildDeAiSkillSystemPrompt`.

Read from chat store:

```ts
const setConversationDeAiSkillId = useChatStore((s) => s.setConversationDeAiSkillId)
const activeConversation = activeConversationId
  ? conversations.find((conversation) => conversation.id === activeConversationId)
  : null
```

Add `DeAiSkillPicker` near the input bottom left controls:

```tsx
<DeAiSkillPicker
  value={activeConversation?.selectedDeAiSkillId}
  onChange={(skillId) => {
    const convId = useChatStore.getState().activeConversationId
    if (convId) setConversationDeAiSkillId(convId, skillId)
  }}
/>
```

- [ ] **Step 3: Inject the selected skill as a system rule**

Before building final `llmMessages`, resolve the skill:

```ts
const activeConv = useChatStore.getState().conversations.find(c => c.id === capturedConvId)
const skillConfig = await loadDeAiSkillConfig(project?.path ?? null)
const effectiveSkill = resolveEffectiveDeAiSkill(skillConfig, activeConv?.selectedDeAiSkillId)
if (effectiveSkill) {
  systemMessages.push({
    role: "system",
    content: buildDeAiSkillSystemPrompt(effectiveSkill.content),
  })
}
```

Keep existing `deAiMode` compatibility for this task. If both are active, skill injection should be the primary behavior and the old `injectDeAiDirective` block should only run when no effective skill is selected.

- [ ] **Step 4: Run focused chat tests and typecheck**

Run:

```bash
npm run test:mocks -- src/components/chat/chat-layout.spec.ts src/components/chat/chat-input.resize-interaction.spec.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/skill-library/de-ai-skill-picker.tsx src/components/chat/chat-panel.tsx src/stores/chat-store.ts src/lib/novel/de-ai-adapter.ts
git commit -m "feat: add de-ai skill picker to chat"
```

## Task 6: Chapter Whole-Text and Selection Skill Picker

**Files:**
- Modify: `src/components/layout/preview-panel.tsx`
- Modify: `src/components/editor/wiki-editor.tsx` only if a trigger coordinate or anchor is needed.
- Test: `src/components/editor/wiki-editor.immersive.spec.tsx`
- Test: `src/components/novel/text-transform-preview-dialog.spec.tsx`

- [ ] **Step 1: Refactor whole-chapter de-AI handler to accept a skill**

In `preview-panel.tsx`, change:

```ts
const handleDeAiProcess = useCallback(async () => {
```

to:

```ts
const runWholeChapterDeAi = useCallback(async (skillContent: string) => {
```

Remove the `loadSmartDeAiSkill` call inside it and pass `skillContent` to:

```ts
buildDeAiRewriteMessages(source, skillContent)
```

- [ ] **Step 2: Refactor selected-text de-AI handler to accept a skill**

Split the current `handleSelectionAction` into:

```ts
const runSelectionTransform = useCallback(async (
  action: ChapterSelectionAction,
  selection: ChapterBodySelection,
  skillContent?: string,
) => {
```

Use:

```ts
action === "polish"
  ? buildPolishSelectionMessages(selection.text)
  : buildDeAiRewriteMessages(selection.text, skillContent)
```

- [ ] **Step 3: Add skill picker state to preview panel**

Add state:

```ts
const [deAiSkillPickerOpen, setDeAiSkillPickerOpen] = useState(false)
const [pendingSelectionForDeAi, setPendingSelectionForDeAi] = useState<ChapterBodySelection | null>(null)
```

Add helper:

```ts
async function handlePickedDeAiSkill(skillId: string) {
  const config = await loadDeAiSkillConfig(project?.path ?? null)
  const skill = resolveEffectiveDeAiSkill(config, skillId)
  if (!skill) {
    setSaveStatus("暂无可用去AI味技能")
    return
  }
  if (pendingSelectionForDeAi) {
    const selection = pendingSelectionForDeAi
    setPendingSelectionForDeAi(null)
    await runSelectionTransform("de-ai", selection, skill.content)
    return
  }
  await runWholeChapterDeAi(skill.content)
}
```

- [ ] **Step 4: Show picker when user clicks de-AI**

For whole chapter buttons, replace `void handleDeAiProcess()` with:

```ts
setPendingSelectionForDeAi(null)
setDeAiSkillPickerOpen(true)
```

For selected text in `handleSelectionAction`, when `action === "de-ai"`:

```ts
setPendingSelectionForDeAi(selection)
setDeAiSkillPickerOpen(true)
return
```

Render a compact popover using `DeAiSkillPicker` or a small local list from the same library. Use `includeDisableOption={false}` for chapter actions because selecting a skill should call it immediately.

- [ ] **Step 5: Preserve existing preview confirmation**

Confirm these existing flows still run:

- whole chapter sets `deAiSourceContent`, `deAiCandidateContent`, and `deAiPreviewOpen`;
- selected text sets `selectionTransformSourceContent`, `selectionTransformCandidateContent`, and `selectionTransformOpen`;
- file switch protection via `selectedFileRef.current !== actionFile` remains in place.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm run test:mocks -- src/components/editor/wiki-editor.immersive.spec.tsx src/components/novel/text-transform-preview-dialog.spec.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/preview-panel.tsx src/components/skill-library/de-ai-skill-picker.tsx
git commit -m "feat: choose de-ai skill for chapter rewrites"
```

## Task 7: Remove Old Single-Skill Editor from Soul Entry

**Files:**
- Modify: `src/components/novel/soul-view.tsx`
- Modify: `src/components/layout/soul-sidebar-panel.tsx`
- Keep: `src/components/novel/de-ai-skill-editor.tsx`

- [ ] **Step 1: Remove the project soul sidebar de-AI entry**

In `src/components/layout/soul-sidebar-panel.tsx`, remove the button that sets `selectedSoulId("de-ai-skill")`.

- [ ] **Step 2: Remove special rendering in SoulView**

In `src/components/novel/soul-view.tsx`, remove:

```tsx
if (selectedSoulId === "de-ai-skill") {
  return (
    <div className="flex h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <DeAiSkillEditor />
      </div>
    </div>
  )
}
```

Do not delete `de-ai-skill-editor.tsx` in this task. Legacy cleanup should be handled separately after the new skill library is verified.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/novel/soul-view.tsx src/components/layout/soul-sidebar-panel.tsx
git commit -m "refactor: move de-ai skill management out of soul"
```

## Task 8: Final Verification and Packaging Gate

**Files:**
- No planned code edits.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test:mocks -- src/lib/novel/de-ai-skill-library.spec.ts src/lib/sidebar-nav-preferences.spec.ts src/components/settings/interface-sidebar-nav.spec.ts src/components/skill-library/skill-library-view.spec.tsx src/components/chat/chat-layout.spec.ts src/components/editor/wiki-editor.immersive.spec.tsx src/components/novel/text-transform-preview-dialog.spec.tsx
```

Expected: all listed tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Manual verification in dev app**

Run:

```bash
npm run dev
```

Open the Vite URL printed by the command. Verify:

- left nav shows 技能库;
- 技能库 can be hidden and sorted from interface settings;
- 技能库 lists five built-ins;
- project skill can be created from a template and saved;
- disabling a skill hides it from chat and chapter pickers;
- AI chat picker selection persists inside the current conversation;
- switching conversations uses project default when the new conversation has no selected skill;
- whole chapter de-AI asks for a skill, then opens existing preview;
- selected-text de-AI asks for a skill, then opens existing selection preview.

- [ ] **Step 4: Package only if user requests packaging**

The AGENTS rules normally require packaging after implementation, but the user has previously distinguished GitHub push and packaging. At implementation time, ask whether to package if the current user instruction does not explicitly say to package.

- [ ] **Step 5: Final status**

Report:

- feature complete or not;
- files changed;
- tests run;
- source run/manual verification;
- package status;
- git commit status;
- known risks.
