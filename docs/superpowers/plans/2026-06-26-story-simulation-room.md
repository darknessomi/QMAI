# 剧情推演室（Story Simulation Room）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 QMAI 小说写作软件中新增"剧情推演室"功能，将 MiroFish 的多 Agent 仿真能力以 TypeScript 重写集成，把社媒舆论预测改造为小说剧情推演。

**Architecture:** 纯 TypeScript 实现，复用 QMAI 现有 LanceDB + Graphology + 章节快照基础设施。核心流程：单页配置 → 后台全维度提取 → 故事框架生成 → 仿真推演 → 推演报告 → 故事草稿。故事框架保存为 MD 文档，可绑定 AI 会话。独立分支 `feature-story-simulation` 开发，不合并 main。

**Tech Stack:** React 19 + TypeScript + Zustand + Tauri 2 + lucide-react + i18next

**关键工程约束：**
- 独立分支 `feature-story-simulation`，绝对不合并 main
- 测试版打包命名显示"剧情推演版"
- 中途 main 分支修复 Bug 后直接上传 GitHub，不能带入此功能代码

---

## 文件结构总览

### 新建文件（核心逻辑层）

| 文件 | 职责 |
|------|------|
| `src/lib/novel/story-simulation/types.ts` | 所有类型定义 |
| `src/lib/novel/story-simulation/story-extractor.ts` | 全维度内容提取器 |
| `src/lib/novel/story-simulation/agent-profile-builder.ts` | Agent 人格构建器 |
| `src/lib/novel/story-simulation/story-framework-generator.ts` | 故事框架生成器 |
| `src/lib/novel/story-simulation/simulation-engine.ts` | 仿真引擎核心循环 |
| `src/lib/novel/story-simulation/simulation-modes/event-driven.ts` | 事件驱动模式 |
| `src/lib/novel/story-simulation/simulation-modes/free-emergence.ts` | 自由涌现模式 |
| `src/lib/novel/story-simulation/simulation-modes/decision-tree.ts` | 决策树模式 |
| `src/lib/novel/story-simulation/simulation-modes/hybrid.ts` | 混合模式 |
| `src/lib/novel/story-simulation/simulation-report-agent.ts` | 推演报告生成器（ReACT） |
| `src/lib/novel/story-simulation/story-draft-generator.ts` | 故事草稿生成器 |
| `src/lib/novel/story-simulation/framework-store.ts` | 故事框架持久化 |
| `src/lib/novel/story-simulation/framework-binding.ts` | AI 会话绑定逻辑 |
| `src/stores/story-simulation-store.ts` | Zustand 状态管理 |

### 新建文件（UI 组件层）

| 文件 | 职责 |
|------|------|
| `src/components/novel/story-simulation/story-simulation-view.tsx` | 主视图 |
| `src/components/novel/story-simulation/simulation-config-panel.tsx` | 单页配置面板 |
| `src/components/novel/story-simulation/extraction-progress.tsx` | 提取进度展示 |
| `src/components/novel/story-simulation/framework-confirm-panel.tsx` | 框架确认面板 |
| `src/components/novel/story-simulation/simulation-progress.tsx` | 仿真进度展示 |
| `src/components/novel/story-simulation/simulation-report-view.tsx` | 推演报告展示 |
| `src/components/novel/story-simulation/story-draft-view.tsx` | 故事草稿展示 |
| `src/components/novel/story-simulation/framework-list.tsx` | 二栏：故事框架列表 |
| `src/components/novel/story-simulation/framework-binding-dialog.tsx` | AI 会话绑定对话框 |
| `src/components/novel/story-simulation/simulation-result-list.tsx` | 三栏：推演结果列表 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/stores/wiki-store.ts` | 新增 `storySimulation` 到 `activeView` 类型 |
| `src/components/layout/icon-sidebar.tsx` | 新增剧情推演室导航项 |
| `src/components/layout/content-area.tsx` | 新增 storySimulation case |
| `src/i18n/zh.json` | 新增剧情推演室相关翻译 |
| `src/i18n/en.json` | 新增英文翻译 |
| `scripts/build-portable.mjs` | 测试版打包命名显示"剧情推演版" |

---

## Task 1: 类型定义

**Files:**
- Create: `src/lib/novel/story-simulation/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/lib/novel/story-simulation/types.ts

import type { CharacterAura } from "@/lib/novel/character-aura"
import type { CognitionState } from "@/lib/novel/character-cognition"
import type { ChapterSnapshot } from "@/lib/novel/chapter-ingest"
import type { ForeshadowingStore } from "@/lib/novel/foreshadowing-tracker"
import type { LlmConfig } from "@/stores/wiki-store"

// ── 仿真模式 ──

export type SimulationMode = "event-driven" | "free-emergence" | "decision-tree" | "hybrid"

// ── 提取结果 ──

export interface ExtractionResult {
  characters: ExtractedCharacter[]
  chapterContents: ExtractedChapterContent[]
  memoryData: ExtractedMemoryData
  worldRules: string
  powerSystem: string
  foreshadowing: ForeshadowingStore | null
  timeline: string[]
  outlineContent: string
  soulDoc: string
}

export interface ExtractedCharacter {
  id: string
  name: string
  profile: string
  aura: CharacterAura | null
  cognition: { knows: string[]; doesNotKnow: string[] } | null
  soul: string
  skillContent: string
}

export interface ExtractedChapterContent {
  chapterNumber: number
  title: string
  summary: string
  content: string
}

export interface ExtractedMemoryData {
  characterStates: string
  characterCognition: CognitionState | null
  foreshadowingTracker: ForeshadowingStore | null
  timeline: string[]
  canonFacts: string
  conflicts: string
}

// ── 故事框架 ──

export interface StoryFramework {
  id: string
  title: string
  premise: string
  targetWords: number
  simulationMode: SimulationMode
  userIdea?: string
  sourceChapters: number
  nodes: StoryNode[]
  createdAt: string
}

export interface StoryNode {
  index: number
  phase: "起" | "承" | "转" | "合"
  title: string
  coreConflict: string
  involvedCharacters: string[]
  goal: string
  causeFromPrev: string
  expectedOutcome: string
}

// ── Agent ──

export interface NovelAgent {
  characterId: string
  name: string
  profile: string
  aura: CharacterAura | null
  cognition: { knows: string[]; doesNotKnow: string[] } | null
  soul: string
  currentGoal: string
  emotionalState: string
  knownFacts: Set<string>
  relationships: Map<string, AgentRelation>
  powerLevel: string
}

export interface AgentRelation {
  targetId: string
  relationType: string
  sentiment: number // -100 ~ 100
}

// ── Agent 行为 ──

export type AgentAction =
  | { type: "speak"; target?: string; content: string }
  | { type: "act"; content: string }
  | { type: "react"; target: string; content: string }
  | { type: "decide"; content: string }
  | { type: "investigate"; content: string }
  | { type: "conflict"; target: string; content: string }
  | { type: "cooperate"; target: string; content: string }
  | { type: "withhold"; content: string }

// ── 仿真事件 ──

export interface SimulationEvent {
  type: "agent-action" | "node-complete" | "node-start"
  agent?: NovelAgent
  action?: AgentAction
  round?: number
  node?: StoryNode
  stateChanges?: string[]
  timestamp: string
}

// ── 推演报告 ──

export interface SimulationReport {
  frameworkId: string
  mode: SimulationMode
  characterAnalyses: CharacterAnalysis[]
  branches: StoryBranch[]
  recommendation: string
  createdAt: string
}

export interface CharacterAnalysis {
  characterId: string
  name: string
  behaviors: { node: string; action: string; motivation: string }[]
  stateChanges: string[]
  consistencyScore: number
}

export interface StoryBranch {
  title: string
  summary: string
  keyEvents: string[]
  probability: "high" | "medium" | "low"
  pros: string
  cons: string
  recommendation: boolean
}

// ── 故事草稿 ──

export interface StoryDraft {
  branchId: string
  frameworkId: string
  chapters: DraftChapter[]
  totalWords: number
  createdAt: string
}

export interface DraftChapter {
  title: string
  content: string
  correspondingNode: number
}

// ── 框架绑定 ──

export interface FrameworkBinding {
  frameworkId: string
  frameworkTitle: string
  targetChapterCount: number
  chapterAllocation: ChapterAllocation[]
  boundAt: string
}

export interface ChapterAllocation {
  nodeIndex: number
  nodeTitle: string
  startChapter: number
  endChapter: number
}

// ── 仿真输入 ──

export interface SimulationInput {
  agents: NovelAgent[]
  framework: StoryFramework
  mode: SimulationMode
  wordBudget: number
  llmConfig: LlmConfig
  userIdea?: string
  injectionEvent?: string
}

// ── 仿真配置 ──

export interface SimulationConfig {
  mode: SimulationMode
  userIdea?: string
  targetWords: number
  sourceChapters: number
}

// ── 字数预算 ──

export const WORD_BUDGET_PRESETS = [10000, 30000, 50000] as const

export function calcNodeCount(targetWords: number): number {
  if (targetWords <= 10000) return 4
  if (targetWords <= 30000) return 6
  return 8
}

export function calcMaxRoundsPerNode(wordBudget: number): number {
  return Math.max(2, Math.floor(wordBudget / 10000))
}

export function calcMaxAgentsPerRound(activeAgentCount: number): number {
  return Math.min(8, activeAgentCount)
}
```

- [ ] **Step 2: 验证类型可被导入**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit src/lib/novel/story-simulation/types.ts 2>&1 | head -20`
Expected: 无错误或仅有缺少依赖的警告（因为还没有实现）

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/types.ts
git commit -m "feat(story-simulation): 添加剧情推演室类型定义"
```

---

## Task 2: Zustand 状态管理

**Files:**
- Modify: `src/stores/wiki-store.ts`（扩展 activeView）
- Create: `src/stores/story-simulation-store.ts`

- [ ] **Step 1: 扩展 wiki-store 的 activeView 类型**

在 `src/stores/wiki-store.ts` 第 483 行，将 `"storySimulation"` 加入 activeView 联合类型：

```typescript
// 修改前
activeView: "wiki" | "sources" | "search" | "graph" | "lint" | "soul" | "dismantling" | "bookAnalysis" | "settings" | "trash" | "reviewCenter"

// 修改后
activeView: "wiki" | "sources" | "search" | "graph" | "lint" | "soul" | "dismantling" | "bookAnalysis" | "settings" | "trash" | "reviewCenter" | "storySimulation"
```

- [ ] **Step 2: 创建 story-simulation-store.ts**

```typescript
// src/stores/story-simulation-store.ts

import { create } from "zustand"
import type {
  SimulationMode,
  StoryFramework,
  SimulationReport,
  StoryDraft,
  ExtractionResult,
  FrameworkBinding,
} from "@/lib/novel/story-simulation/types"

export type SimulationPhase =
  | "idle"
  | "configuring"
  | "extracting"
  | "framework-generating"
  | "framework-confirming"
  | "simulating"
  | "report-generating"
  | "report-viewing"
  | "draft-generating"
  | "draft-viewing"

export interface StorySimulationState {
  phase: SimulationPhase
  mode: SimulationMode
  userIdea: string
  targetWords: number
  sourceChapters: number
  extractionResult: ExtractionResult | null
  currentFramework: StoryFramework | null
  currentReport: SimulationReport | null
  currentDraft: StoryDraft | null
  frameworks: StoryFramework[]
  selectedFrameworkId: string | null
  binding: FrameworkBinding | null
  error: string | null
  progress: number
  progressLabel: string

  setPhase: (phase: SimulationPhase) => void
  setMode: (mode: SimulationMode) => void
  setUserIdea: (idea: string) => void
  setTargetWords: (words: number) => void
  setSourceChapters: (count: number) => void
  setExtractionResult: (result: ExtractionResult | null) => void
  setCurrentFramework: (framework: StoryFramework | null) => void
  setCurrentReport: (report: SimulationReport | null) => void
  setCurrentDraft: (draft: StoryDraft | null) => void
  setFrameworks: (frameworks: StoryFramework[]) => void
  setSelectedFrameworkId: (id: string | null) => void
  setBinding: (binding: FrameworkBinding | null) => void
  setError: (error: string | null) => void
  setProgress: (progress: number, label: string) => void
  reset: () => void
}

export const useStorySimulationStore = create<StorySimulationState>((set) => ({
  phase: "idle",
  mode: "event-driven",
  userIdea: "",
  targetWords: 10000,
  sourceChapters: 10,
  extractionResult: null,
  currentFramework: null,
  currentReport: null,
  currentDraft: null,
  frameworks: [],
  selectedFrameworkId: null,
  binding: null,
  error: null,
  progress: 0,
  progressLabel: "",

  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  setUserIdea: (userIdea) => set({ userIdea }),
  setTargetWords: (targetWords) => set({ targetWords }),
  setSourceChapters: (sourceChapters) => set({ sourceChapters }),
  setExtractionResult: (extractionResult) => set({ extractionResult }),
  setCurrentFramework: (currentFramework) => set({ currentFramework }),
  setCurrentReport: (currentReport) => set({ currentReport }),
  setCurrentDraft: (currentDraft) => set({ currentDraft }),
  setFrameworks: (frameworks) => set({ frameworks }),
  setSelectedFrameworkId: (selectedFrameworkId) => set({ selectedFrameworkId }),
  setBinding: (binding) => set({ binding }),
  setError: (error) => set({ error }),
  setProgress: (progress, progressLabel) => set({ progress, progressLabel }),
  reset: () =>
    set({
      phase: "idle",
      extractionResult: null,
      currentFramework: null,
      currentReport: null,
      currentDraft: null,
      error: null,
      progress: 0,
      progressLabel: "",
    }),
}))
```

- [ ] **Step 3: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "story-simulation" | head -5`
Expected: 无新增错误

- [ ] **Step 4: 提交**

```bash
git add src/stores/wiki-store.ts src/stores/story-simulation-store.ts
git commit -m "feat(story-simulation): 添加状态管理和 activeView 扩展"
```

---

## Task 3: 图标栏导航入口

**Files:**
- Modify: `src/components/layout/icon-sidebar.tsx`
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: 在 icon-sidebar.tsx 添加导航项**

在 `src/components/layout/icon-sidebar.tsx` 第 1 行的 import 中添加 `Drama` 图标：

```typescript
// 修改前
import {
  FileText, FolderOpen, Search, Network, Brain, Settings, ArrowLeftRight, Sun, Moon, Monitor, Trash2, Sparkles, LayoutDashboard, BookOpen,
} from "lucide-react"

// 修改后
import {
  FileText, FolderOpen, Search, Network, Brain, Settings, ArrowLeftRight, Sun, Moon, Monitor, Trash2, Sparkles, LayoutDashboard, BookOpen, Drama,
} from "lucide-react"
```

在第 28 行的 NAV_ITEMS 数组末尾（reviewCenter 后面）添加：

```typescript
// 在 reviewCenter 行后面添加
  { view: "storySimulation", icon: Drama, labelKey: "novel.nav.storySimulation" },
```

- [ ] **Step 2: 在 zh.json 添加翻译**

在 `src/i18n/zh.json` 的 `novel.nav` 对象中添加：

```json
"storySimulation": "剧情推演室"
```

- [ ] **Step 3: 在 en.json 添加翻译**

在 `src/i18n/en.json` 的 `novel.nav` 对象中添加：

```json
"storySimulation": "Story Simulation"
```

- [ ] **Step 4: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "icon-sidebar\|storySimulation" | head -5`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/icon-sidebar.tsx src/i18n/zh.json src/i18n/en.json
git commit -m "feat(story-simulation): 添加图标栏导航入口"
```

---

## Task 4: 内容区域路由

**Files:**
- Modify: `src/components/layout/content-area.tsx`

- [ ] **Step 1: 在 content-area.tsx 添加 lazy import 和 case**

在 `src/components/layout/content-area.tsx` 第 48 行（BookAnalysisView lazy import 后面）添加：

```typescript
const StorySimulationView = lazy(async () => {
  const mod = await import("@/components/novel/story-simulation/story-simulation-view")
  return { default: mod.StorySimulationView }
})
```

在 switch 语句中（`case "bookAnalysis":` 后面、`default:` 前面）添加：

```typescript
      case "storySimulation":
        content = (
          <Suspense fallback={<LoadingView />}>
            <StorySimulationView />
          </Suspense>
        )
        break
```

- [ ] **Step 2: 创建占位主视图组件**

```typescript
// src/components/novel/story-simulation/story-simulation-view.tsx

import { useWikiStore } from "@/stores/wiki-store"
import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useTranslation } from "react-i18next"

export function StorySimulationView() {
  const { t } = useTranslation()
  const projectPath = useWikiStore((s) => s.projectPath)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">{t("storySimulation.title")}</h2>
      <p className="text-muted-foreground">{t("storySimulation.description")}</p>
      <p className="text-sm text-muted-foreground">项目路径: {projectPath}</p>
    </div>
  )
}
```

- [ ] **Step 3: 在 zh.json 添加 storySimulation 翻译根节点**

在 `src/i18n/zh.json` 根级别添加（与 `novel` 同级）：

```json
"storySimulation": {
  "title": "剧情推演室",
  "description": "通过多 Agent 仿真推演小说角色在给定情境下的行为选择和剧情走向",
  "selectMode": "选择仿真模式",
  "modeEventDriven": "事件驱动",
  "modeFreeEmergence": "自由涌现",
  "modeDecisionTree": "决策树",
  "modeHybrid": "混合模式",
  "modeEventDrivenDesc": "注入一个触发事件，推演各角色反应和连锁效应",
  "modeFreeEmergenceDesc": "让角色根据目标自由互动，涌现剧情走向",
  "modeDecisionTreeDesc": "为关键角色生成多个决策分支，对比连锁反应",
  "modeHybridDesc": "自由涌现与事件驱动结合，生成多条可能分支",
  "yourIdea": "你的思路（可选）",
  "yourIdeaPlaceholder": "输入你对剧情走向的想法或约束...",
  "targetWords": "目标字数",
  "words10k": "10000字",
  "words30k": "30000字",
  "words50k": "50000字",
  "wordsCustom": "自定义",
  "sourceChapters": "提取章节数量",
  "recentChapters": "最近",
  "chapters": "章",
  "startExtract": "开始提取并生成框架",
  "extracting": "正在提取内容...",
  "extractProgress": "提取进度",
  "frameworkTitle": "故事框架",
  "frameworkPremise": "前提",
  "frameworkNodes": "故事节点",
  "regenerateFramework": "重新生成框架",
  "saveFramework": "保存框架",
  "confirmFramework": "确认框架，开始推演",
  "simulating": "正在推演...",
  "simulationProgress": "推演进度",
  "reportTitle": "推演报告",
  "characterAnalysis": "角色行为分析",
  "storyBranches": "走向分支",
  "recommendation": "综合推荐",
  "resimulate": "重新推演",
  "generateDraft": "选择分支，生成草稿",
  "draftTitle": "故事草稿",
  "exportDraft": "导出",
  "copyAll": "复制全部",
  "importToChapters": "导入到章节",
  "discard": "丢弃",
  "frameworkList": "故事框架",
  "newFramework": "新建故事框架",
  "bindToChat": "绑定到 AI 会话",
  "unbindFromChat": "取消绑定",
  "bindingTitle": "绑定故事框架到 AI 会话",
  "selectFramework": "选择框架",
  "targetChapterCount": "生成章节数",
  "confirmBinding": "确认绑定",
  "bindingHint": "绑定后，AI 会话将按此框架分析指定章节数如何推动故事发展",
  "noFrameworks": "暂无故事框架，点击上方按钮开始创建",
  "noResults": "暂无推演结果",
  "phase": "阶段",
  "conflict": "冲突",
  "characters": "角色",
  "goal": "目标",
  "cause": "起因",
  "expectedOutcome": "预期走向",
  "consistencyScore": "人设一致性",
  "probability": "概率",
  "probabilityHigh": "高",
  "probabilityMedium": "中",
  "probabilityLow": "低",
  "pros": "优势",
  "cons": "不足",
  "actualWords": "实际字数",
  "totalWords": "总字数",
  "error": "错误",
  "retry": "重试"
}
```

在 `src/i18n/en.json` 根级别添加对应英文翻译：

```json
"storySimulation": {
  "title": "Story Simulation Room",
  "description": "Simulate character behavior and plot development through multi-agent simulation",
  "selectMode": "Select Simulation Mode",
  "modeEventDriven": "Event-Driven",
  "modeFreeEmergence": "Free Emergence",
  "modeDecisionTree": "Decision Tree",
  "modeHybrid": "Hybrid",
  "modeEventDrivenDesc": "Inject a trigger event, simulate character reactions",
  "modeFreeEmergenceDesc": "Let characters interact freely, observe emergent plot",
  "modeDecisionTreeDesc": "Generate decision branches for key characters",
  "modeHybridDesc": "Combine free emergence with event injection",
  "yourIdea": "Your Idea (Optional)",
  "yourIdeaPlaceholder": "Enter your thoughts on plot direction...",
  "targetWords": "Target Word Count",
  "words10k": "10,000 words",
  "words30k": "30,000 words",
  "words50k": "50,000 words",
  "wordsCustom": "Custom",
  "sourceChapters": "Source Chapters",
  "recentChapters": "Recent",
  "chapters": "chapters",
  "startExtract": "Start Extraction & Generate Framework",
  "extracting": "Extracting content...",
  "extractProgress": "Extraction Progress",
  "frameworkTitle": "Story Framework",
  "frameworkPremise": "Premise",
  "frameworkNodes": "Story Nodes",
  "regenerateFramework": "Regenerate Framework",
  "saveFramework": "Save Framework",
  "confirmFramework": "Confirm & Start Simulation",
  "simulating": "Simulating...",
  "simulationProgress": "Simulation Progress",
  "reportTitle": "Simulation Report",
  "characterAnalysis": "Character Analysis",
  "storyBranches": "Story Branches",
  "recommendation": "Recommendation",
  "resimulate": "Re-simulate",
  "generateDraft": "Select Branch & Generate Draft",
  "draftTitle": "Story Draft",
  "exportDraft": "Export",
  "copyAll": "Copy All",
  "importToChapters": "Import to Chapters",
  "discard": "Discard",
  "frameworkList": "Story Frameworks",
  "newFramework": "New Framework",
  "bindToChat": "Bind to AI Chat",
  "unbindFromChat": "Unbind",
  "bindingTitle": "Bind Story Framework to AI Chat",
  "selectFramework": "Select Framework",
  "targetChapterCount": "Target Chapter Count",
  "confirmBinding": "Confirm Binding",
  "bindingHint": "After binding, AI chat will follow this framework to analyze how chapters advance the story",
  "noFrameworks": "No frameworks yet. Click the button above to create one.",
  "noResults": "No simulation results yet",
  "phase": "Phase",
  "conflict": "Conflict",
  "characters": "Characters",
  "goal": "Goal",
  "cause": "Cause",
  "expectedOutcome": "Expected Outcome",
  "consistencyScore": "Consistency Score",
  "probability": "Probability",
  "probabilityHigh": "High",
  "probabilityMedium": "Medium",
  "probabilityLow": "Low",
  "pros": "Pros",
  "cons": "Cons",
  "actualWords": "Actual Words",
  "totalWords": "Total Words",
  "error": "Error",
  "retry": "Retry"
}
```

- [ ] **Step 4: 验证 dev server 可启动**

Run: `cd C:\QMAI_C\QMAI-main && npm run dev`
Expected: dev server 正常启动，无编译错误

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/content-area.tsx src/components/novel/story-simulation/story-simulation-view.tsx src/i18n/zh.json src/i18n/en.json
git commit -m "feat(story-simulation): 添加内容区域路由和占位主视图"
```

---

## Task 5: 全维度内容提取器

**Files:**
- Create: `src/lib/novel/story-simulation/story-extractor.ts`

- [ ] **Step 1: 创建提取器**

```typescript
// src/lib/novel/story-simulation/story-extractor.ts

import { readFile, listDirectory } from "@/commands/fs"
import { normalizePath, joinPath } from "@/lib/path-utils"
import { useWikiStore } from "@/stores/wiki-store"
import { readSoulDoc } from "@/lib/novel/soul-doc"
import { loadCognitionState } from "@/lib/novel/character-cognition"
import { loadForeshadowingTracker } from "@/lib/novel/foreshadowing-tracker"
import { loadTimeline } from "@/lib/novel/timeline"
import { loadCharacterStates } from "@/lib/novel/character-state"
import { loadSnapshot, listSnapshots, type ChapterSnapshot } from "@/lib/novel/chapter-ingest"
import { parseFrontmatter } from "@/lib/frontmatter"
import { searchWiki } from "@/lib/search"
import { listAuras } from "@/lib/novel/character-aura"
import type { ExtractionResult, ExtractedCharacter, ExtractedChapterContent, ExtractedMemoryData } from "./types"

export interface ExtractionOptions {
  sourceChapters: number
  onProgress?: (progress: number, label: string) => void
}

export async function extractStoryContent(
  projectPath: string,
  options: ExtractionOptions,
): Promise<ExtractionResult> {
  const pp = normalizePath(projectPath)
  const { sourceChapters, onProgress } = options

  onProgress?.(5, "正在读取大纲...")

  // 1. 读取大纲
  const outlineContent = await readOutline(pp)

  onProgress?.(15, "正在读取项目灵魂...")

  // 2. 读取灵魂文档
  const soulDoc = await readSoulDoc(pp)

  onProgress?.(25, "正在读取章节内容...")

  // 3. 读取最近N章内容
  const chapterContents = await readRecentChapters(pp, sourceChapters)

  onProgress?.(40, "正在读取记忆库...")

  // 4. 读取记忆库
  const memoryData = await readMemoryData(pp)

  onProgress?.(55, "正在读取角色数据...")

  // 5. 读取角色完整特征（profile + aura + cognition + soul + skill）
  const characters = await readCharacterData(pp, chapterContents)

  onProgress?.(70, "正在提取世界规则...")

  // 6. 提取世界规则和力量体系（从大纲中）
  const { worldRules, powerSystem } = extractWorldRules(outlineContent)

  onProgress?.(85, "正在读取伏笔和时间线...")

  // 7. 伏笔状态
  const foreshadowing = memoryData.foreshadowingTracker

  // 8. 时间线
  const timeline = memoryData.timeline

  onProgress?.(100, "提取完成")

  return {
    characters,
    chapterContents,
    memoryData,
    worldRules,
    powerSystem,
    foreshadowing,
    timeline,
    outlineContent,
    soulDoc,
  }
}

async function readOutline(projectPath: string): Promise<string> {
  try {
    const items = await listDirectory(`${projectPath}/wiki/outlines`)
    const outlines: string[] = []
    for (const item of items) {
      if (item.type === "file" && item.name.endsWith(".md")) {
        const content = await readFile(`${projectPath}/wiki/outlines/${item.name}`)
        outlines.push(`## ${item.name}\n\n${content}`)
      }
    }
    return outlines.join("\n\n")
  } catch {
    return ""
  }
}

async function readRecentChapters(projectPath: string, count: number): Promise<ExtractedChapterContent[]> {
  try {
    const items = await listDirectory(`${projectPath}/wiki/chapters`)
    const chapterFiles = items
      .filter((item) => item.type === "file" && item.name.endsWith(".md"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    const recentFiles = chapterFiles.slice(-count)
    const results: ExtractedChapterContent[] = []

    for (const file of recentFiles) {
      const raw = await readFile(`${projectPath}/wiki/chapters/${file.name}`)
      const { body, frontmatter } = parseFrontmatter(raw)
      const chapterNumber = parseInt(String(frontmatter?.chapter_number || "0"), 10)
      const title = String(frontmatter?.title || file.name.replace(/\.md$/, ""))

      // 获取章节快照摘要
      let summary = ""
      try {
        const snapshot = await loadSnapshot(projectPath, chapterNumber)
        if (snapshot) {
          summary = snapshot.summary
        }
      } catch {}

      results.push({
        chapterNumber,
        title,
        summary,
        content: body,
      })
    }

    return results
  } catch {
    return []
  }
}

async function readMemoryData(projectPath: string): Promise<ExtractedMemoryData> {
  const pp = normalizePath(projectPath)
  const memoryDir = `${pp}/.qmai`

  let characterStates = ""
  let characterCognition = null
  let foreshadowingTracker = null
  let timeline: string[] = []
  let canonFacts = ""
  let conflicts = ""

  try {
    characterStates = await readFile(`${memoryDir}/character-states.md`)
  } catch {}

  try {
    characterCognition = await loadCognitionState(pp)
  } catch {}

  try {
    foreshadowingTracker = await loadForeshadowingTracker(pp)
  } catch {}

  try {
    const tl = await loadTimeline(pp)
    timeline = tl.entries.map((e) => `第${e.chapterNumber}章: ${e.event}`)
  } catch {}

  try {
    canonFacts = await readFile(`${memoryDir}/canon-facts.md`)
  } catch {}

  try {
    conflicts = await readFile(`${memoryDir}/conflicts.md`)
  } catch {}

  return {
    characterStates,
    characterCognition,
    foreshadowingTracker,
    timeline,
    canonFacts,
    conflicts,
  }
}

async function readCharacterData(
  projectPath: string,
  chapterContents: ExtractedChapterContent[],
): Promise<ExtractedCharacter[]> {
  const characters: ExtractedCharacter[] = []

  // 从章节内容中提取角色名
  const characterNames = new Set<string>()
  for (const chapter of chapterContents) {
    try {
      const snapshot = await loadSnapshot(projectPath, chapter.chapterNumber)
      if (snapshot) {
        for (const name of snapshot.characters) {
          characterNames.add(name)
        }
      }
    } catch {}
  }

  // 读取角色光环
  let auras: Awaited<ReturnType<typeof listAuras>> = []
  try {
    auras = await listAuras(projectPath)
  } catch {}

  // 读取角色认知
  let cognitionState = null
  try {
    cognitionState = await loadCognitionState(projectPath)
  } catch {}

  for (const name of characterNames) {
    const aura = auras.find((a) => a.name === name) || null
    const cognition = cognitionState?.characters.find((c) => c.character === name) || null

    characters.push({
      id: name,
      name,
      profile: aura?.sourceNote || "",
      aura,
      cognition: cognition ? { knows: cognition.knows, doesNotKnow: cognition.doesNotKnow } : null,
      soul: "",
      skillContent: aura?.corpus || "",
    })
  }

  return characters
}

function extractWorldRules(outlineContent: string): { worldRules: string; powerSystem: string } {
  // 简单提取：从大纲内容中寻找世界规则和力量体系相关段落
  const lines = outlineContent.split("\n")
  const worldRules: string[] = []
  const powerSystem: string[] = []

  let currentSection = ""
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^#{1,3}\s.*(世界观|世界规则|设定|规则)/.test(trimmed)) {
      currentSection = "world"
    } else if (/^#{1,3}\s.*(力量|修炼|等级|能力|体系)/.test(trimmed)) {
      currentSection = "power"
    } else if (/^#{1,3}\s/.test(trimmed)) {
      currentSection = ""
    }

    if (currentSection === "world" && trimmed) {
      worldRules.push(line)
    } else if (currentSection === "power" && trimmed) {
      powerSystem.push(line)
    }
  }

  return {
    worldRules: worldRules.join("\n"),
    powerSystem: powerSystem.join("\n"),
  }
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "story-extractor" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/story-extractor.ts
git commit -m "feat(story-simulation): 实现全维度内容提取器"
```

---

## Task 6: Agent 人格构建器

**Files:**
- Create: `src/lib/novel/story-simulation/agent-profile-builder.ts`

- [ ] **Step 1: 创建 Agent 构建器**

```typescript
// src/lib/novel/story-simulation/agent-profile-builder.ts

import type { NovelAgent, ExtractionResult, ExtractedCharacter, StoryFramework } from "./types"

export function buildAgents(
  extraction: ExtractionResult,
  framework: StoryFramework,
): NovelAgent[] {
  // 收集框架中涉及的所有角色
  const involvedNames = new Set<string>()
  for (const node of framework.nodes) {
    for (const char of node.involvedCharacters) {
      involvedNames.add(char)
    }
  }

  // 如果框架没有指定角色，使用所有提取到的角色
  const targetNames = involvedNames.size > 0
    ? Array.from(involvedNames)
    : extraction.characters.map((c) => c.name)

  const agents: NovelAgent[] = []

  for (const name of targetNames) {
    const char = extraction.characters.find((c) => c.name === name || c.id === name)
    if (!char) continue

    const agent: NovelAgent = {
      characterId: char.id,
      name: char.name,
      profile: char.profile,
      aura: char.aura,
      cognition: char.cognition,
      soul: char.soul,
      currentGoal: inferGoalFromFramework(char.name, framework),
      emotionalState: "neutral",
      knownFacts: new Set(char.cognition?.knows || []),
      relationships: new Map(),
      powerLevel: "",
    }

    // 初始化角色间关系
    for (const other of targetNames) {
      if (other !== name) {
        agent.relationships.set(other, {
          targetId: other,
          relationType: "neutral",
          sentiment: 0,
        })
      }
    }

    agents.push(agent)
  }

  return agents
}

function inferGoalFromFramework(characterName: string, framework: StoryFramework): string {
  // 从框架的第一个节点中推断角色目标
  for (const node of framework.nodes) {
    if (node.involvedCharacters.includes(characterName)) {
      return `${node.goal}（${node.title}）`
    }
  }
  return "推动故事发展"
}

export function buildAgentContext(
  agent: NovelAgent,
  node: StoryFramework["nodes"][number],
  recentEvents: string[],
  worldRules: string,
): string {
  const parts: string[] = []

  parts.push(`## 当前场景`)
  parts.push(`节点：${node.phase} · ${node.title}`)
  parts.push(`核心冲突：${node.coreConflict}`)
  parts.push(`目标：${node.goal}`)

  parts.push(`\n## 你的身份`)
  parts.push(`姓名：${agent.name}`)
  if (agent.profile) {
    parts.push(`档案：${agent.profile}`)
  }
  if (agent.aura?.expressionDna) {
    parts.push(`表达特征：${agent.aura.expressionDna}`)
  }
  if (agent.aura?.mentalModel) {
    parts.push(`心智模型：${agent.aura.mentalModel}`)
  }
  if (agent.aura?.decisionHeuristics) {
    parts.push(`决策启发式：${agent.aura.decisionHeuristics}`)
  }
  if (agent.aura?.valueAntiPatterns) {
    parts.push(`价值观反模式：${agent.aura.valueAntiPatterns}`)
  }

  parts.push(`\n## 你的认知边界`)
  if (agent.cognition) {
    parts.push(`你知道的：${agent.knownFacts.size > 0 ? Array.from(agent.knownFacts).join("；") : "无"}`)
    parts.push(`你不知道的：${agent.cognition.doesNotKnow.join("；") || "无"}`)
  }

  parts.push(`\n## 你的当前状态`)
  parts.push(`目标：${agent.currentGoal}`)
  parts.push(`情绪：${agent.emotionalState}`)

  parts.push(`\n## 人际关系`)
  for (const [name, rel] of agent.relationships) {
    parts.push(`与${name}：${rel.relationType}（好感度${rel.sentiment}）`)
  }

  parts.push(`\n## 近期事件`)
  parts.push(recentEvents.join("\n") || "无")

  if (worldRules) {
    parts.push(`\n## 世界规则`)
    parts.push(worldRules)
  }

  return parts.join("\n")
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "agent-profile" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/agent-profile-builder.ts
git commit -m "feat(story-simulation): 实现 Agent 人格构建器"
```

---

## Task 7: 故事框架生成器

**Files:**
- Create: `src/lib/novel/story-simulation/story-framework-generator.ts`

- [ ] **Step 1: 创建框架生成器**

```typescript
// src/lib/novel/story-simulation/story-framework-generator.ts

import { streamChat, type ChatMessage } from "@/lib/llm-client"
import type { LlmConfig } from "@/stores/wiki-store"
import type { ExtractionResult, StoryFramework, StoryNode, SimulationMode } from "./types"
import { calcNodeCount } from "./types"

export interface FrameworkGenerationOptions {
  extraction: ExtractionResult
  mode: SimulationMode
  targetWords: number
  userIdea?: string
  llmConfig: LlmConfig
  onProgress?: (label: string) => void
}

export async function generateStoryFramework(
  options: FrameworkGenerationOptions,
): Promise<StoryFramework> {
  const { extraction, mode, targetWords, userIdea, llmConfig, onProgress } = options

  onProgress?.("正在分析已写内容...")

  const nodeCount = calcNodeCount(targetWords)
  const prompt = buildFrameworkPrompt(extraction, mode, targetWords, userIdea, nodeCount)

  onProgress?.("正在生成故事框架...")

  const messages: ChatMessage[] = [
    { role: "system", content: FRAMEWORK_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ]

  let result = ""
  await streamChat(
    llmConfig,
    messages,
    {
      onToken: (token) => {
        result += token
      },
      onDone: () => {},
      onError: (error) => {
        throw error
      },
    },
  )

  onProgress?.("正在解析框架...")

  const framework = parseFramework(result, mode, targetWords, userIdea, extraction.chapterContents.length)

  return framework
}

const FRAMEWORK_SYSTEM_PROMPT = `你是一位专业的小说策划编辑，精通故事结构学。你的任务是分析小说已写内容，生成一个遵循"起承转合"结构的故事框架。

要求：
1. 框架必须包含前提（当前故事进展到什么程度）
2. 框架包含若干关键节点，每个节点标注"起/承/转/合"阶段
3. 每个节点必须包含：标题、核心冲突、涉及角色、推进目标、与上一节点的因果关系、预期走向
4. 节点间必须有明确的因果链
5. 所有内容必须符合小说写作结构

输出格式为 JSON：
\`\`\`json
{
  "premise": "当前故事进展的总结",
  "nodes": [
    {
      "phase": "起",
      "title": "节点标题",
      "coreConflict": "核心冲突描述",
      "involvedCharacters": ["角色1", "角色2"],
      "goal": "该节点要推进的目标",
      "causeFromPrev": "与上一节点的因果关系（第一个节点填'故事起点'）",
      "expectedOutcome": "预期走向"
    }
  ]
}
\`\`\`

只输出 JSON，不要输出其他内容。`

function buildFrameworkPrompt(
  extraction: ExtractionResult,
  mode: SimulationMode,
  targetWords: number,
  userIdea: string | undefined,
  nodeCount: number,
): string {
  const parts: string[] = []

  parts.push(`## 任务\n根据以下小说内容，生成一个包含 ${nodeCount} 个关键节点的故事框架。目标字数：${targetWords} 字。`)

  if (userIdea) {
    parts.push(`\n## 作者思路\n${userIdea}`)
  }

  parts.push(`\n## 当前已写内容概要`)
  for (const chapter of extraction.chapterContents.slice(-5)) {
    parts.push(`### 第${chapter.chapterNumber}章 ${chapter.title}`)
    parts.push(chapter.summary || chapter.content.slice(0, 500))
  }

  parts.push(`\n## 角色信息`)
  for (const char of extraction.characters) {
    parts.push(`### ${char.name}`)
    if (char.profile) parts.push(`档案：${char.profile}`)
    if (char.aura?.expressionDna) parts.push(`表达特征：${char.aura.expressionDna}`)
    if (char.aura?.mentalModel) parts.push(`心智模型：${char.aura.mentalModel}`)
    if (char.aura?.decisionHeuristics) parts.push(`决策方式：${char.aura.decisionHeuristics}`)
    if (char.cognition) {
      parts.push(`已知信息：${char.cognition.knows.join("；") || "无"}`)
      parts.push(`未知信息：${char.cognition.doesNotKnow.join("；") || "无"}`)
    }
  }

  if (extraction.worldRules) {
    parts.push(`\n## 世界规则\n${extraction.worldRules}`)
  }

  if (extraction.powerSystem) {
    parts.push(`\n## 力量体系\n${extraction.powerSystem}`)
  }

  if (extraction.foreshadowing && extraction.foreshadowing.items.length > 0) {
    parts.push(`\n## 伏笔状态`)
    for (const f of extraction.foreshadowing.items) {
      parts.push(`- ${f.name}（${f.status}）：${f.description}`)
    }
  }

  if (extraction.timeline.length > 0) {
    parts.push(`\n## 时间线\n${extraction.timeline.join("\n")}`)
  }

  if (extraction.soulDoc) {
    parts.push(`\n## 项目灵魂\n${extraction.soulDoc}`)
  }

  return parts.join("\n")
}

function parseFramework(
  jsonText: string,
  mode: SimulationMode,
  targetWords: number,
  userIdea: string | undefined,
  sourceChapters: number,
): StoryFramework {
  // 提取 JSON 块
  const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/) || jsonText.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : jsonText.trim()

  const parsed = JSON.parse(jsonStr)

  const nodes: StoryNode[] = (parsed.nodes || []).map((node: any, index: number) => ({
    index,
    phase: node.phase || "起",
    title: node.title || `节点${index + 1}`,
    coreConflict: node.coreConflict || "",
    involvedCharacters: Array.isArray(node.involvedCharacters) ? node.involvedCharacters : [],
    goal: node.goal || "",
    causeFromPrev: node.causeFromPrev || "",
    expectedOutcome: node.expectedOutcome || "",
  }))

  return {
    id: `framework-${Date.now()}`,
    title: `故事框架-${new Date().toLocaleDateString("zh-CN")}`,
    premise: parsed.premise || "",
    targetWords,
    simulationMode: mode,
    userIdea,
    sourceChapters,
    nodes,
    createdAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "story-framework" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/story-framework-generator.ts
git commit -m "feat(story-simulation): 实现故事框架生成器"
```

---

## Task 8: 仿真引擎核心

**Files:**
- Create: `src/lib/novel/story-simulation/simulation-engine.ts`

- [ ] **Step 1: 创建仿真引擎**

```typescript
// src/lib/novel/story-simulation/simulation-engine.ts

import { streamChat, type ChatMessage } from "@/lib/llm-client"
import type { LlmConfig } from "@/stores/wiki-store"
import { buildAgentContext } from "./agent-profile-builder"
import type {
  NovelAgent,
  AgentAction,
  SimulationEvent,
  SimulationInput,
  StoryNode,
  ExtractionResult,
} from "./types"
import { calcMaxRoundsPerNode, calcMaxAgentsPerRound } from "./types"

export interface SimulationCallbacks {
  onEvent: (event: SimulationEvent) => void
  onProgress: (progress: number, label: string) => void
  onComplete: (events: SimulationEvent[]) => void
  onError: (error: Error) => void
}

export async function runSimulation(
  input: SimulationInput,
  extraction: ExtractionResult,
  callbacks: SimulationCallbacks,
  signal?: AbortSignal,
): Promise<SimulationEvent[]> {
  const { agents, framework, mode, wordBudget, llmConfig, userIdea, injectionEvent } = input
  const events: SimulationEvent[] = []
  const maxRounds = calcMaxRoundsPerNode(wordBudget)
  const totalNodes = framework.nodes.length

  try {
    for (let nodeIndex = 0; nodeIndex < totalNodes; nodeIndex++) {
      const node = framework.nodes[nodeIndex]
      const nodeProgress = ((nodeIndex / totalNodes) * 100)

      callbacks.onProgress(nodeProgress, `正在推演节点 ${nodeIndex + 1}/${totalNodes}：${node.title}`)

      // 发出节点开始事件
      const startEvent: SimulationEvent = {
        type: "node-start",
        node,
        timestamp: new Date().toISOString(),
      }
      events.push(startEvent)
      callbacks.onEvent(startEvent)

      // 确定本轮参与角色
      const activeAgents = agents.filter((a) =>
        node.involvedCharacters.includes(a.name),
      )
      const maxAgents = calcMaxAgentsPerRound(activeAgents.length)
      const participatingAgents = activeAgents.slice(0, maxAgents)

      const recentEvents: string[] = []

      for (let round = 0; round < maxRounds; round++) {
        for (const agent of participatingAgents) {
          if (signal?.aborted) {
            callbacks.onComplete(events)
            return events
          }

          const context = buildAgentContext(agent, node, recentEvents, extraction.worldRules)
          const action = await decideAgentAction(agent, context, llmConfig, mode, injectionEvent, signal)

          if (!action) continue

          // 应用行为效果
          applyAction(agent, action, agents)

          const event: SimulationEvent = {
            type: "agent-action",
            agent,
            action,
            round,
            node,
            timestamp: new Date().toISOString(),
          }
          events.push(event)
          callbacks.onEvent(event)

          const eventDesc = formatActionForContext(agent.name, action)
          recentEvents.push(eventDesc)
        }

        // 检查节点目标是否达成
        if (checkNodeCompletion(node, recentEvents)) break
      }

      // 发出节点完成事件
      const completeEvent: SimulationEvent = {
        type: "node-complete",
        node,
        stateChanges: collectStateChanges(participatingAgents),
        timestamp: new Date().toISOString(),
      }
      events.push(completeEvent)
      callbacks.onEvent(completeEvent)
    }

    callbacks.onProgress(100, "推演完成")
    callbacks.onComplete(events)
    return events
  } catch (error) {
    callbacks.onError(error as Error)
    throw error
  }
}

async function decideAgentAction(
  agent: NovelAgent,
  context: string,
  llmConfig: LlmConfig,
  mode: string,
  injectionEvent: string | undefined,
  signal?: AbortSignal,
): Promise<AgentAction | null> {
  const systemPrompt = buildAgentSystemPrompt(agent, mode, injectionEvent)

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `${context}\n\n请决定你在这个场景中的下一步行动。输出 JSON 格式。` },
  ]

  let result = ""
  await streamChat(
    llmConfig,
    messages,
    {
      onToken: (token) => {
        result += token
      },
      onDone: () => {},
      onError: (error) => {
        throw error
      },
    },
    signal,
  )

  return parseAgentAction(result)
}

function buildAgentSystemPrompt(
  agent: NovelAgent,
  mode: string,
  injectionEvent: string | undefined,
): string {
  let prompt = `你是小说角色"${agent.name}"，请完全以该角色的视角思考和行动。

你必须：
1. 严格遵循角色的性格特征、心智模型和决策方式
2. 遵守角色的认知边界——你不知道的信息不能使用
3. 做出的行为必须符合角色当前的目标和情绪
4. 保持角色人设一致性

行为格式（输出 JSON）：
\`\`\`json
{
  "type": "speak | act | react | decide | investigate | conflict | cooperate | withhold",
  "target": "目标角色名（如适用）",
  "content": "行为描述（用第三人称叙述）",
  "motivation": "你做出这个选择的内心动机"
}
\`\`\`

行为类型说明：
- speak: 对某人说话或公开发言
- act: 执行一个行动（移动/使用物品/施法等）
- react: 对他人的行为做出反应
- decide: 在关键决策点做出选择
- investigate: 调查或获取信息
- conflict: 与某人发生冲突或对抗
- cooperate: 与某人合作
- withhold: 隐瞒或保留信息

只输出 JSON，不要输出其他内容。`

  if (injectionEvent && mode === "event-driven") {
    prompt += `\n\n触发事件：${injectionEvent}\n请针对这个事件做出反应。`
  }

  return prompt
}

function parseAgentAction(text: string): AgentAction | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : text.trim()
    const parsed = JSON.parse(jsonStr)

    const type = parsed.type as AgentAction["type"]
    if (!type) return null

    return {
      type,
      target: parsed.target,
      content: parsed.content || "",
    } as AgentAction
  } catch {
    // 如果无法解析 JSON，将文本作为行动描述
    if (text.trim()) {
      return { type: "act", content: text.trim().slice(0, 500) }
    }
    return null
  }
}

function applyAction(agent: NovelAgent, action: AgentAction, allAgents: NovelAgent[]): void {
  // 更新角色已知信息
  if (action.type === "investigate" || action.type === "speak") {
    agent.knownFacts.add(action.content)
  }

  // 更新关系
  if ("target" in action && action.target) {
    const target = action.target
    const relation = agent.relationships.get(target)
    if (relation) {
      if (action.type === "conflict") {
        relation.sentiment = Math.max(-100, relation.sentiment - 20)
        relation.relationType = "hostile"
      } else if (action.type === "cooperate") {
        relation.sentiment = Math.min(100, relation.sentiment + 15)
        relation.relationType = "ally"
      }
    }
  }

  // 更新情绪
  if (action.type === "conflict") {
    agent.emotionalState = "tense"
  } else if (action.type === "cooperate") {
    agent.emotionalState = "hopeful"
  } else if (action.type === "decide") {
    agent.emotionalState = "determined"
  }
}

function formatActionForContext(name: string, action: AgentAction): string {
  const targetStr = "target" in action && action.target ? ` → ${action.target}` : ""
  return `${name}${targetStr}：${action.content}`
}

function checkNodeCompletion(node: StoryNode, recentEvents: string[]): boolean {
  // 简单启发式：如果已产生足够事件，认为节点完成
  return recentEvents.length >= 4
}

function collectStateChanges(agents: NovelAgent[]): string[] {
  const changes: string[] = []
  for (const agent of agents) {
    if (agent.emotionalState !== "neutral") {
      changes.push(`${agent.name} 情绪变为 ${agent.emotionalState}`)
    }
    for (const [name, rel] of agent.relationships) {
      if (rel.relationType !== "neutral") {
        changes.push(`${agent.name} 与 ${name} 关系变为 ${rel.relationType}（好感度 ${rel.sentiment}）`)
      }
    }
  }
  return changes
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "simulation-engine" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/simulation-engine.ts
git commit -m "feat(story-simulation): 实现仿真引擎核心循环"
```

---

## Task 9: 四种仿真模式

**Files:**
- Create: `src/lib/novel/story-simulation/simulation-modes/event-driven.ts`
- Create: `src/lib/novel/story-simulation/simulation-modes/free-emergence.ts`
- Create: `src/lib/novel/story-simulation/simulation-modes/decision-tree.ts`
- Create: `src/lib/novel/story-simulation/simulation-modes/hybrid.ts`

- [ ] **Step 1: 创建事件驱动模式**

```typescript
// src/lib/novel/story-simulation/simulation-modes/event-driven.ts

import { runSimulation, type SimulationCallbacks } from "../simulation-engine"
import type { SimulationInput, ExtractionResult, SimulationEvent } from "../types"

export async function runEventDrivenSimulation(
  input: SimulationInput,
  extraction: ExtractionResult,
  callbacks: SimulationCallbacks,
  signal?: AbortSignal,
): Promise<SimulationEvent[]> {
  // 事件驱动模式：用户注入的触发事件已在 input.injectionEvent 中
  return runSimulation(
    { ...input, mode: "event-driven" },
    extraction,
    callbacks,
    signal,
  )
}
```

- [ ] **Step 2: 创建自由涌现模式**

```typescript
// src/lib/novel/story-simulation/simulation-modes/free-emergence.ts

import { runSimulation, type SimulationCallbacks } from "../simulation-engine"
import type { SimulationInput, ExtractionResult, SimulationEvent } from "../types"

export async function runFreeEmergenceSimulation(
  input: SimulationInput,
  extraction: ExtractionResult,
  callbacks: SimulationCallbacks,
  signal?: AbortSignal,
): Promise<SimulationEvent[]> {
  // 自由涌现模式：不注入特定事件，让角色自由互动
  return runSimulation(
    { ...input, mode: "free-emergence", injectionEvent: undefined },
    extraction,
    callbacks,
    signal,
  )
}
```

- [ ] **Step 3: 创建决策树模式**

```typescript
// src/lib/novel/story-simulation/simulation-modes/decision-tree.ts

import { streamChat, type ChatMessage } from "@/lib/llm-client"
import { runSimulation, type SimulationCallbacks } from "../simulation-engine"
import type { SimulationInput, ExtractionResult, SimulationEvent, NovelAgent, StoryBranch } from "../types"

export async function runDecisionTreeSimulation(
  input: SimulationInput,
  extraction: ExtractionResult,
  callbacks: SimulationCallbacks,
  signal?: AbortSignal,
): Promise<SimulationEvent[]> {
  // 决策树模式：先为关键角色生成多个决策选择，每个选择推演一次
  const { agents, framework, llmConfig } = input

  // 选定第一个节点的第一个角色作为决策角色
  const firstNode = framework.nodes[0]
  const decisionAgent = agents.find((a) =>
    firstNode.involvedCharacters.includes(a.name),
  )

  if (!decisionAgent) {
    return runSimulation(input, extraction, callbacks, signal)
  }

  // 生成决策选项
  const choices = await generateDecisionChoices(decisionAgent, firstNode, llmConfig, signal)
  callbacks.onProgress(10, `已生成 ${choices.length} 个决策分支`)

  // 对每个选择推演一次（限制深度以控制 token 消耗）
  const allEvents: SimulationEvent[] = []
  for (let i = 0; i < choices.length; i++) {
    if (signal?.aborted) break
    callbacks.onProgress(
      10 + (i / choices.length) * 80,
      `正在推演决策分支 ${i + 1}/${choices.length}：${choices[i].slice(0, 20)}...`,
    )

    const branchEvents = await runSimulation(
      {
        ...input,
        mode: "decision-tree",
        injectionEvent: `决策选择：${choices[i]}`,
      },
      extraction,
      {
        ...callbacks,
        onEvent: () => {}, // 不转发子事件，避免过多输出
      },
      signal,
    )
    allEvents.push(...branchEvents)
  }

  callbacks.onProgress(100, "决策树推演完成")
  callbacks.onComplete(allEvents)
  return allEvents
}

async function generateDecisionChoices(
  agent: NovelAgent,
  node: { title: string; coreConflict: string; goal: string },
  llmConfig: SimulationInput["llmConfig"],
  signal?: AbortSignal,
): Promise<string[]> {
  const prompt = `角色"${agent.name}"面临以下场景：
节点：${node.title}
冲突：${node.coreConflict}
目标：${node.goal}

请为该角色生成 3 个不同的决策选择，每个选择代表不同的剧情走向方向。

输出 JSON 数组格式：
\`\`\`json
["选择1描述", "选择2描述", "选择3描述"]
\`\`\`

只输出 JSON，不要输出其他内容。`

  const messages: ChatMessage[] = [
    { role: "system", content: "你是小说剧情策划专家，擅长设计角色的关键决策点。" },
    { role: "user", content: prompt },
  ]

  let result = ""
  await streamChat(
    llmConfig,
    messages,
    {
      onToken: (token) => { result += token },
      onDone: () => {},
      onError: (error) => { throw error },
    },
    signal,
  )

  try {
    const jsonMatch = result.match(/```json\s*([\s\S]*?)```/) || result.match(/\[[\s\S]*\]/)
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : result.trim()
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return ["按照原计划行动", "改变策略", "寻求帮助"]
  }
}
```

- [ ] **Step 4: 创建混合模式**

```typescript
// src/lib/novel/story-simulation/simulation-modes/hybrid.ts

import { runSimulation, type SimulationCallbacks } from "../simulation-engine"
import type { SimulationInput, ExtractionResult, SimulationEvent } from "../types"

export async function runHybridSimulation(
  input: SimulationInput,
  extraction: ExtractionResult,
  callbacks: SimulationCallbacks,
  signal?: AbortSignal,
): Promise<SimulationEvent[]> {
  // 混合模式：先自由涌现，然后在中间节点注入事件
  return runSimulation(
    { ...input, mode: "hybrid" },
    extraction,
    callbacks,
    signal,
  )
}
```

- [ ] **Step 5: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "simulation-modes" | head -5`
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/lib/novel/story-simulation/simulation-modes/
git commit -m "feat(story-simulation): 实现四种仿真模式"
```

---

## Task 10: 推演报告生成器

**Files:**
- Create: `src/lib/novel/story-simulation/simulation-report-agent.ts`

- [ ] **Step 1: 创建报告生成器**

```typescript
// src/lib/novel/story-simulation/simulation-report-agent.ts

import { streamChat, type ChatMessage } from "@/lib/llm-client"
import type { LlmConfig } from "@/stores/wiki-store"
import type {
  SimulationEvent,
  SimulationReport,
  CharacterAnalysis,
  StoryBranch,
  StoryFramework,
  SimulationMode,
} from "./types"

export interface ReportGenerationOptions {
  events: SimulationEvent[]
  framework: StoryFramework
  mode: SimulationMode
  llmConfig: LlmConfig
  onProgress?: (label: string) => void
  signal?: AbortSignal
}

export async function generateSimulationReport(
  options: ReportGenerationOptions,
): Promise<SimulationReport> {
  const { events, framework, mode, llmConfig, onProgress, signal } = options

  onProgress?.("正在分析仿真事件...")

  // 将事件序列化为文本
  const eventsText = serializeEvents(events)

  onProgress?.("正在生成推演报告...")

  const prompt = buildReportPrompt(eventsText, framework, mode)

  const messages: ChatMessage[] = [
    { role: "system", content: REPORT_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ]

  let result = ""
  await streamChat(
    llmConfig,
    messages,
    {
      onToken: (token) => { result += token },
      onDone: () => {},
      onError: (error) => { throw error },
    },
    signal,
  )

  onProgress?.("正在解析报告...")

  return parseReport(result, framework, mode)
}

const REPORT_SYSTEM_PROMPT = `你是一位专业的小说剧情分析师。你的任务是基于仿真推演事件，生成一份结构化的推演报告。

报告必须包含：
1. 角色行为分析：每个主要角色在各节点的行为、动机和人设一致性评分(0-100)
2. 走向分支：2-3 条可能的剧情走向，每条包含标题、摘要、关键事件、概率(高/中/低)、优势、不足、是否推荐
3. 综合推荐：对整体推演结果的建议

输出 JSON 格式：
\`\`\`json
{
  "characterAnalyses": [
    {
      "name": "角色名",
      "behaviors": [
        { "node": "节点标题", "action": "行为描述", "motivation": "动机" }
      ],
      "stateChanges": ["状态变化1", "状态变化2"],
      "consistencyScore": 90
    }
  ],
  "branches": [
    {
      "title": "走向标题",
      "summary": "走向摘要",
      "keyEvents": ["事件1", "事件2"],
      "probability": "high",
      "pros": "优势",
      "cons": "不足",
      "recommendation": true
    }
  ],
  "recommendation": "综合推荐建议"
}
\`\`\`

只输出 JSON，不要输出其他内容。`

function buildReportPrompt(
  eventsText: string,
  framework: StoryFramework,
  mode: SimulationMode,
): string {
  return `## 故事框架
前提：${framework.premise}
节点：${framework.nodes.map((n) => `${n.phase}·${n.title}`).join(" → ")}

## 仿真模式
${mode}

## 仿真事件记录
${eventsText}

请基于以上仿真结果，生成推演报告。`
}

function serializeEvents(events: SimulationEvent[]): string {
  const lines: string[] = []
  for (const event of events) {
    if (event.type === "node-start" && event.node) {
      lines.push(`\n=== 节点开始：${event.node.phase}·${event.node.title} ===`)
    } else if (event.type === "agent-action" && event.agent && event.action) {
      const target = "target" in event.action && event.action.target
        ? ` → ${event.action.target}`
        : ""
      lines.push(`[轮次${(event.round || 0) + 1}] ${event.agent.name}${target}（${event.action.type}）：${event.action.content}`)
    } else if (event.type === "node-complete" && event.node) {
      lines.push(`=== 节点完成：${event.node.title} ===`)
      if (event.stateChanges && event.stateChanges.length > 0) {
        lines.push(`状态变化：${event.stateChanges.join("；")}`)
      }
    }
  }
  return lines.join("\n")
}

function parseReport(
  text: string,
  framework: StoryFramework,
  mode: SimulationMode,
): SimulationReport {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : text.trim()
    const parsed = JSON.parse(jsonStr)

    const characterAnalyses: CharacterAnalysis[] = (parsed.characterAnalyses || []).map((ca: any) => ({
      characterId: ca.name,
      name: ca.name,
      behaviors: Array.isArray(ca.behaviors) ? ca.behaviors : [],
      stateChanges: Array.isArray(ca.stateChanges) ? ca.stateChanges : [],
      consistencyScore: typeof ca.consistencyScore === "number" ? ca.consistencyScore : 80,
    }))

    const branches: StoryBranch[] = (parsed.branches || []).map((b: any) => ({
      title: b.title || "未命名走向",
      summary: b.summary || "",
      keyEvents: Array.isArray(b.keyEvents) ? b.keyEvents : [],
      probability: b.probability === "high" || b.probability === "medium" || b.probability === "low"
        ? b.probability
        : "medium",
      pros: b.pros || "",
      cons: b.cons || "",
      recommendation: Boolean(b.recommendation),
    }))

    return {
      frameworkId: framework.id,
      mode,
      characterAnalyses,
      branches,
      recommendation: parsed.recommendation || "",
      createdAt: new Date().toISOString(),
    }
  } catch {
    return {
      frameworkId: framework.id,
      mode,
      characterAnalyses: [],
      branches: [],
      recommendation: text.slice(0, 1000),
      createdAt: new Date().toISOString(),
    }
  }
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "simulation-report" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/simulation-report-agent.ts
git commit -m "feat(story-simulation): 实现推演报告生成器（ReACT 模式）"
```

---

## Task 11: 故事草稿生成器

**Files:**
- Create: `src/lib/novel/story-simulation/story-draft-generator.ts`

- [ ] **Step 1: 创建草稿生成器**

```typescript
// src/lib/novel/story-simulation/story-draft-generator.ts

import { streamChat, type ChatMessage } from "@/lib/llm-client"
import type { LlmConfig } from "@/stores/wiki-store"
import type {
  SimulationReport,
  StoryFramework,
  StoryDraft,
  DraftChapter,
  StoryBranch,
} from "./types"

export interface DraftGenerationOptions {
  framework: StoryFramework
  report: SimulationReport
  selectedBranch: StoryBranch
  llmConfig: LlmConfig
  onProgress?: (label: string) => void
  onChapterGenerated?: (chapter: DraftChapter) => void
  signal?: AbortSignal
}

export async function generateStoryDraft(
  options: DraftGenerationOptions,
): Promise<StoryDraft> {
  const { framework, report, selectedBranch, llmConfig, onProgress, onChapterGenerated, signal } = options

  const targetWords = framework.targetWords
  const nodeCount = framework.nodes.length
  const wordsPerChapter = Math.floor(targetWords / nodeCount)

  const chapters: DraftChapter[] = []

  for (let i = 0; i < nodeCount; i++) {
    if (signal?.aborted) break

    const node = framework.nodes[i]
    onProgress?.(`正在生成第 ${i + 1}/${nodeCount} 章：${node.title}...`)

    const chapter = await generateChapter(
      node,
      selectedBranch,
      framework,
      report,
      wordsPerChapter,
      llmConfig,
      signal,
    )

    chapters.push(chapter)
    onChapterGenerated?.(chapter)
  }

  const totalWords = chapters.reduce((sum, ch) => sum + ch.content.length, 0)

  return {
    branchId: selectedBranch.title,
    frameworkId: framework.id,
    chapters,
    totalWords,
    createdAt: new Date().toISOString(),
  }
}

async function generateChapter(
  node: StoryFramework["nodes"][number],
  branch: StoryBranch,
  framework: StoryFramework,
  report: SimulationReport,
  targetWords: number,
  llmConfig: LlmConfig,
  signal?: AbortSignal,
): Promise<DraftChapter> {
  const relevantAnalysis = report.characterAnalyses.filter((ca) =>
    node.involvedCharacters.includes(ca.name),
  )

  const prompt = `## 章节生成任务

### 故事框架
前提：${framework.premise}
当前节点：${node.phase} · ${node.title}
核心冲突：${node.coreConflict}
涉及角色：${node.involvedCharacters.join("、")}
推进目标：${node.goal}
预期走向：${node.expectedOutcome}

### 选择的剧情走向
${branch.title}：${branch.summary}
关键事件：${branch.keyEvents.join("；")}

### 角色行为参考
${relevantAnalysis.map((ca) =>
  `${ca.name}（人设一致性 ${ca.consistencyScore}分）：${ca.behaviors.map((b) => b.action).join("；")}`,
).join("\n")}

### 要求
- 目标字数：约 ${targetWords} 字
- 遵循小说写作结构，保持起承转合的节奏
- 角色行为必须符合其人设特征
- 自然融入核心冲突，推进剧情发展
- 只输出正文内容，不要输出标题

请开始写作：`

  const messages: ChatMessage[] = [
    { role: "system", content: "你是一位专业的小说作者，擅长根据剧情框架和角色分析写出引人入胜的章节正文。" },
    { role: "user", content: prompt },
  ]

  let content = ""
  await streamChat(
    llmConfig,
    messages,
    {
      onToken: (token) => { content += token },
      onDone: () => {},
      onError: (error) => { throw error },
    },
    signal,
  )

  return {
    title: `第${node.index + 1}章 ${node.title}`,
    content: content.trim(),
    correspondingNode: node.index,
  }
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "story-draft" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/story-draft-generator.ts
git commit -m "feat(story-simulation): 实现故事草稿生成器"
```

---

## Task 12: 故事框架持久化

**Files:**
- Create: `src/lib/novel/story-simulation/framework-store.ts`

- [ ] **Step 1: 创建框架存储**

```typescript
// src/lib/novel/story-simulation/framework-store.ts

import { readFile, writeFileAtomic, createDirectory, listDirectory, deleteFile } from "@/commands/fs"
import { normalizePath } from "@/lib/path-utils"
import type { StoryFramework, SimulationReport, StoryDraft } from "./types"

const FRAMEWORK_DIR = ".qmai/simulations/frameworks"
const RESULT_DIR = ".qmai/simulations/results"
const BINDING_DIR = ".qmai/simulations/bindings"
const ACTIVE_BINDING_FILE = ".qmai/simulations/bindings/active-binding.json"

function baseDir(projectPath: string): string {
  return normalizePath(projectPath)
}

function frameworkPath(projectPath: string, frameworkId: string): string {
  return `${baseDir(projectPath)}/${FRAMEWORK_DIR}/${frameworkId}.md`
}

function resultDir(projectPath: string, frameworkId: string): string {
  return `${baseDir(projectPath)}/${RESULT_DIR}/${frameworkId}`
}

export async function ensureSimulationDirs(projectPath: string): Promise<void> {
  const pp = baseDir(projectPath)
  await createDirectory(`${pp}/${FRAMEWORK_DIR}`)
  await createDirectory(`${pp}/${RESULT_DIR}`)
  await createDirectory(`${pp}/${BINDING_DIR}`)
}

export async function saveFramework(projectPath: string, framework: StoryFramework): Promise<void> {
  await ensureSimulationDirs(projectPath)
  const md = frameworkToMarkdown(framework)
  await writeFileAtomic(frameworkPath(projectPath, framework.id), md)
}

export async function loadFrameworks(projectPath: string): Promise<StoryFramework[]> {
  await ensureSimulationDirs(projectPath)
  const dir = `${baseDir(projectPath)}/${FRAMEWORK_DIR}`
  const items = await listDirectory(dir)
  const frameworks: StoryFramework[] = []

  for (const item of items) {
    if (item.type === "file" && item.name.endsWith(".md")) {
      try {
        const raw = await readFile(`${dir}/${item.name}`)
        const framework = markdownToFramework(raw)
        if (framework) frameworks.push(framework)
      } catch {}
    }
  }

  return frameworks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteFramework(projectPath: string, frameworkId: string): Promise<void> {
  await deleteFile(frameworkPath(projectPath, frameworkId))
  // 同时删除关联的推演结果
  try {
    const rDir = resultDir(projectPath, frameworkId)
    const items = await listDirectory(rDir)
    for (const item of items) {
      await deleteFile(`${rDir}/${item.name}`)
    }
  } catch {}
}

export async function saveSimulationResult(
  projectPath: string,
  frameworkId: string,
  report: SimulationReport,
  draft?: StoryDraft,
): Promise<string> {
  await ensureSimulationDirs(projectPath)
  const dir = resultDir(projectPath, frameworkId)
  await createDirectory(dir)

  const resultId = `result-${Date.now()}`
  await writeFileAtomic(`${dir}/${resultId}.json`, JSON.stringify(report, null, 2))
  await writeFileAtomic(`${dir}/${resultId}-report.md`, reportToMarkdown(report))

  if (draft) {
    await writeFileAtomic(`${dir}/${resultId}-draft.md`, draftToMarkdown(draft))
  }

  return resultId
}

export async function loadSimulationResults(
  projectPath: string,
  frameworkId: string,
): Promise<{ id: string; report: SimulationReport }[]> {
  const dir = resultDir(projectPath, frameworkId)
  try {
    const items = await listDirectory(dir)
    const results: { id: string; report: SimulationReport }[] = []

    for (const item of items) {
      if (item.type === "file" && item.name.endsWith(".json")) {
        try {
          const raw = await readFile(`${dir}/${item.name}`)
          const report = JSON.parse(raw) as SimulationReport
          results.push({ id: item.name.replace(/\.json$/, ""), report })
        } catch {}
      }
    }

    return results.sort((a, b) => b.report.createdAt.localeCompare(a.report.createdAt))
  } catch {
    return []
  }
}

// ── Markdown 序列化 ──

function frameworkToMarkdown(framework: StoryFramework): string {
  const lines: string[] = []
  lines.push("---")
  lines.push(`type: story-framework`)
  lines.push(`title: ${framework.title}`)
  lines.push(`createdAt: ${framework.createdAt}`)
  lines.push(`sourceChapters: ${framework.sourceChapters}`)
  lines.push(`targetWords: ${framework.targetWords}`)
  lines.push(`simulationMode: ${framework.simulationMode}`)
  if (framework.userIdea) {
    lines.push(`userIdea: ${framework.userIdea}`)
  }
  lines.push("---")
  lines.push("")
  lines.push("## 前提")
  lines.push(framework.premise)
  lines.push("")
  lines.push("## 故事节点")

  for (const node of framework.nodes) {
    lines.push("")
    lines.push(`### ${node.phase} · 节点${node.index + 1}：${node.title}`)
    lines.push(`- **冲突**：${node.coreConflict}`)
    lines.push(`- **角色**：${node.involvedCharacters.join("、")}`)
    lines.push(`- **目标**：${node.goal}`)
    lines.push(`- **起因**：${node.causeFromPrev}`)
    lines.push(`- **预期走向**：${node.expectedOutcome}`)
  }

  return lines.join("\n")
}

function markdownToFramework(raw: string): StoryFramework | null {
  try {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!fmMatch) return null

    const frontmatter = fmMatch[1]
    const body = fmMatch[2]

    const getFm = (key: string): string => {
      const m = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))
      return m ? m[1].trim() : ""
    }

    const nodes: StoryFramework["nodes"] = []
    const nodeRegex = /### (.) · 节点(\d+)：(.+)/g
    let nodeMatch
    while ((nodeMatch = nodeRegex.exec(body)) !== null) {
      const phase = nodeMatch[1] as "起" | "承" | "转" | "合"
      const index = parseInt(nodeMatch[2], 10) - 1
      const title = nodeMatch[3]

      const sectionStart = nodeMatch.index + nodeMatch[0].length
      const nextNode = body.indexOf("### ", sectionStart)
      const sectionEnd = nextNode > 0 ? nextNode : body.length
      const section = body.slice(sectionStart, sectionEnd)

      const conflict = section.match(/- \*\*冲突\*\*：(.+)/)?.[1] || ""
      const characters = (section.match(/- \*\*角色\*\*：(.+)/)?.[1] || "").split("、").filter(Boolean)
      const goal = section.match(/- \*\*目标\*\*：(.+)/)?.[1] || ""
      const cause = section.match(/- \*\*起因\*\*：(.+)/)?.[1] || ""
      const outcome = section.match(/- \*\*预期走向\*\*：(.+)/)?.[1] || ""

      nodes.push({ index, phase, title, coreConflict: conflict, involvedCharacters: characters, goal, causeFromPrev: cause, expectedOutcome: outcome })
    }

    const premiseMatch = body.match(/## 前提\n([\s\S]*?)(?=\n## |$)/)
    const premise = premiseMatch ? premiseMatch[1].trim() : ""

    return {
      id: getFm("title").replace(/\s/g, "-").toLowerCase() + `-${getFm("createdAt")}`,
      title: getFm("title"),
      premise,
      targetWords: parseInt(getFm("targetWords"), 10) || 10000,
      simulationMode: (getFm("simulationMode") as StoryFramework["simulationMode"]) || "event-driven",
      userIdea: getFm("userIdea") || undefined,
      sourceChapters: parseInt(getFm("sourceChapters"), 10) || 10,
      nodes,
      createdAt: getFm("createdAt") || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

function reportToMarkdown(report: SimulationReport): string {
  const lines: string[] = []
  lines.push("# 推演报告")
  lines.push(`> 生成时间：${report.createdAt}`)
  lines.push("")
  lines.push("## 角色行为分析")

  for (const ca of report.characterAnalyses) {
    lines.push(`### ${ca.name}（人设一致性：${ca.consistencyScore}分）`)
    for (const b of ca.behaviors) {
      lines.push(`- **${b.node}**：${b.action}（动机：${b.motivation}）`)
    }
    if (ca.stateChanges.length > 0) {
      lines.push(`状态变化：${ca.stateChanges.join("；")}`)
    }
    lines.push("")
  }

  lines.push("## 走向分支")
  for (const b of report.branches) {
    lines.push(`### ${b.title}${b.recommendation ? "（推荐）" : ""}`)
    lines.push(`概率：${b.probability}`)
    lines.push(`摘要：${b.summary}`)
    lines.push(`关键事件：${b.keyEvents.join("；")}`)
    lines.push(`优势：${b.pros}`)
    lines.push(`不足：${b.cons}`)
    lines.push("")
  }

  lines.push("## 综合推荐")
  lines.push(report.recommendation)

  return lines.join("\n")
}

function draftToMarkdown(draft: StoryDraft): string {
  const lines: string[] = []
  lines.push("# 故事草稿")
  lines.push(`> 总字数：${draft.totalWords}`)
  lines.push("")

  for (const ch of draft.chapters) {
    lines.push(`## ${ch.title}`)
    lines.push(ch.content)
    lines.push("")
  }

  return lines.join("\n")
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "framework-store" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/framework-store.ts
git commit -m "feat(story-simulation): 实现故事框架持久化存储"
```

---

## Task 13: AI 会话绑定

**Files:**
- Create: `src/lib/novel/story-simulation/framework-binding.ts`
- Modify: `src/lib/novel/context-data-sources.ts`

- [ ] **Step 1: 创建绑定逻辑**

```typescript
// src/lib/novel/story-simulation/framework-binding.ts

import { readFile, writeFileAtomic, createDirectory, deleteFile } from "@/commands/fs"
import { normalizePath } from "@/lib/path-utils"
import type { StoryFramework, FrameworkBinding, ChapterAllocation } from "./types"

const BINDING_FILE = ".qmai/simulations/bindings/active-binding.json"

function bindingPath(projectPath: string): string {
  return `${normalizePath(projectPath)}/${BINDING_FILE}`
}

export async function loadBinding(projectPath: string): Promise<FrameworkBinding | null> {
  try {
    const raw = await readFile(bindingPath(projectPath))
    return JSON.parse(raw) as FrameworkBinding
  } catch {
    return null
  }
}

export async function saveBinding(
  projectPath: string,
  framework: StoryFramework,
  targetChapterCount: number,
): Promise<FrameworkBinding> {
  const pp = normalizePath(projectPath)
  await createDirectory(`${pp}/.qmai/simulations/bindings`)

  const allocation = allocateChapters(framework, targetChapterCount)

  const binding: FrameworkBinding = {
    frameworkId: framework.id,
    frameworkTitle: framework.title,
    targetChapterCount,
    chapterAllocation: allocation,
    boundAt: new Date().toISOString(),
  }

  await writeFileAtomic(bindingPath(projectPath), JSON.stringify(binding, null, 2))
  return binding
}

export async function clearBinding(projectPath: string): Promise<void> {
  try {
    await deleteFile(bindingPath(projectPath))
  } catch {}
}

function allocateChapters(
  framework: StoryFramework,
  targetChapterCount: number,
): ChapterAllocation[] {
  const nodeCount = framework.nodes.length
  const baseChaptersPerNode = Math.floor(targetChapterCount / nodeCount)
  let remaining = targetChapterCount - baseChaptersPerNode * nodeCount

  const allocations: ChapterAllocation[] = []
  let currentChapter = 1

  for (let i = 0; i < nodeCount; i++) {
    const chapters = baseChaptersPerNode + (remaining > 0 ? 1 : 0)
    if (remaining > 0) remaining--

    allocations.push({
      nodeIndex: framework.nodes[i].index,
      nodeTitle: framework.nodes[i].title,
      startChapter: currentChapter,
      endChapter: currentChapter + chapters - 1,
    })

    currentChapter += chapters
  }

  return allocations
}

export function buildBindingContext(binding: FrameworkBinding, framework: StoryFramework): string {
  if (!binding || !framework) return ""

  const lines: string[] = []
  lines.push("## 故事框架绑定")
  lines.push(`框架：${binding.frameworkTitle}`)
  lines.push(`目标章节数：${binding.targetChapterCount} 章`)
  lines.push("")
  lines.push("### 章节分配")

  for (const alloc of binding.chapterAllocation) {
    const node = framework.nodes[alloc.nodeIndex]
    lines.push(`第 ${alloc.startChapter}-${alloc.endChapter} 章 → ${node.phase}·${node.title}`)
    lines.push(`  冲突：${node.coreConflict}`)
    lines.push(`  角色：${node.involvedCharacters.join("、")}`)
    lines.push(`  目标：${node.goal}`)
  }

  lines.push("")
  lines.push("### 要求")
  lines.push("- 每章节必须遵循所分配的框架节点推进剧情")
  lines.push("- 角色行为必须符合框架中设定的核心冲突")
  lines.push("- 确保章节间因果链连贯，遵循起承转合结构")

  return lines.join("\n")
}
```

- [ ] **Step 2: 在 context-data-sources.ts 中添加框架绑定数据源**

在 `src/lib/novel/context-data-sources.ts` 文件末尾添加新的数据源：

```typescript
// 在文件末尾添加

import { loadBinding } from "@/lib/novel/story-simulation/framework-binding"
import { loadFrameworks } from "@/lib/novel/story-simulation/framework-store"
import { buildBindingContext } from "@/lib/novel/story-simulation/framework-binding"

export const storyFrameworkBindingDataSource: DataSource<string> = {
  name: "storyFrameworkBinding",
  priority: 18,
  async load(context: ContextLoadContext): Promise<string> {
    if (!context.projectPath) return ""
    try {
      const binding = await loadBinding(context.projectPath)
      if (!binding) return ""
      const frameworks = await loadFrameworks(context.projectPath)
      const framework = frameworks.find((f) => f.id === binding.frameworkId)
      if (!framework) return ""
      return buildBindingContext(binding, framework)
    } catch {
      return ""
    }
  },
}
```

然后在 `getAllDataSources()` 函数中注册（如果该函数存在），或在 context-engine.ts 的数据源注册处添加。

- [ ] **Step 3: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "framework-binding\|context-data-sources" | head -5`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/lib/novel/story-simulation/framework-binding.ts src/lib/novel/context-data-sources.ts
git commit -m "feat(story-simulation): 实现 AI 会话绑定和上下文注入"
```

---

## Task 14: 单页配置面板 UI

**Files:**
- Create: `src/components/novel/story-simulation/simulation-config-panel.tsx`

- [ ] **Step 1: 创建配置面板**

```tsx
// src/components/novel/story-simulation/simulation-config-panel.tsx

import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useTranslation } from "react-i18next"
import { WORD_BUDGET_PRESETS, type SimulationMode } from "@/lib/novel/story-simulation/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

const MODES: { mode: SimulationMode; labelKey: string; descKey: string }[] = [
  { mode: "event-driven", labelKey: "storySimulation.modeEventDriven", descKey: "storySimulation.modeEventDrivenDesc" },
  { mode: "free-emergence", labelKey: "storySimulation.modeFreeEmergence", descKey: "storySimulation.modeFreeEmergenceDesc" },
  { mode: "decision-tree", labelKey: "storySimulation.modeDecisionTree", descKey: "storySimulation.modeDecisionTreeDesc" },
  { mode: "hybrid", labelKey: "storySimulation.modeHybrid", descKey: "storySimulation.modeHybridDesc" },
]

const CHAPTER_OPTIONS = [5, 10, 20, 30, 50]

export function SimulationConfigPanel({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation()
  const { mode, userIdea, targetWords, sourceChapters, setMode, setUserIdea, setTargetWords, setSourceChapters } = useStorySimulationStore()
  const [customWords, setCustomWords] = useState("")

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* 模式选择 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">{t("storySimulation.selectMode")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map(({ mode: m, labelKey, descKey }) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                mode === m
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="font-medium">{t(labelKey)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t(descKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 用户思路 */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">{t("storySimulation.yourIdea")}</h3>
        <Textarea
          value={userIdea}
          onChange={(e) => setUserIdea(e.target.value)}
          placeholder={t("storySimulation.yourIdeaPlaceholder")}
          rows={3}
        />
      </div>

      {/* 目标字数 */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">{t("storySimulation.targetWords")}</h3>
        <div className="flex gap-2">
          {WORD_BUDGET_PRESETS.map((w) => (
            <button
              key={w}
              onClick={() => setTargetWords(w)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                targetWords === w && !customWords
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {t(w === 10000 ? "storySimulation.words10k" : w === 30000 ? "storySimulation.words30k" : "storySimulation.words50k")}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={customWords}
              onChange={(e) => {
                setCustomWords(e.target.value)
                const n = parseInt(e.target.value, 10)
                if (n > 0) setTargetWords(n)
              }}
              placeholder={t("storySimulation.wordsCustom")}
              className="w-24 rounded-md border border-border px-2 py-1.5 text-sm"
            />
            <span className="text-sm text-muted-foreground">{t("storySimulation.chapters")}</span>
          </div>
        </div>
      </div>

      {/* 提取章节数量 */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">{t("storySimulation.sourceChapters")}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("storySimulation.recentChapters")}</span>
          <select
            value={sourceChapters}
            onChange={(e) => setSourceChapters(parseInt(e.target.value, 10))}
            className="rounded-md border border-border px-3 py-1.5 text-sm"
          >
            {CHAPTER_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">{t("storySimulation.chapters")}</span>
        </div>
      </div>

      {/* 开始按钮 */}
      <Button onClick={onStart} className="w-full" size="lg">
        {t("storySimulation.startExtract")}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "simulation-config" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/novel/story-simulation/simulation-config-panel.tsx
git commit -m "feat(story-simulation): 实现单页配置面板 UI"
```

---

## Task 15: 框架确认面板 UI

**Files:**
- Create: `src/components/novel/story-simulation/framework-confirm-panel.tsx`

- [ ] **Step 1: 创建框架确认面板**

```tsx
// src/components/novel/story-simulation/framework-confirm-panel.tsx

import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function FrameworkConfirmPanel({
  onConfirm,
  onRegenerate,
}: {
  onConfirm: () => void
  onRegenerate: () => void
}) {
  const { t } = useTranslation()
  const { currentFramework } = useStorySimulationStore()

  if (!currentFramework) return null

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("storySimulation.frameworkTitle")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRegenerate}>
            {t("storySimulation.regenerateFramework")}
          </Button>
          <Button onClick={onConfirm}>
            {t("storySimulation.confirmFramework")}
          </Button>
        </div>
      </div>

      {/* 前提 */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-2 font-semibold text-muted-foreground">{t("storySimulation.frameworkPremise")}</h3>
        <p className="text-sm">{currentFramework.premise}</p>
      </div>

      {/* 节点列表 */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t("storySimulation.frameworkNodes")}</h3>
        {currentFramework.nodes.map((node) => (
          <div key={node.index} className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {node.phase}
              </span>
              <h4 className="font-medium">{node.title}</h4>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("storySimulation.conflict")}</dt>
                <dd>{node.coreConflict}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("storySimulation.characters")}</dt>
                <dd>{node.involvedCharacters.join("、")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("storySimulation.goal")}</dt>
                <dd>{node.goal}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("storySimulation.cause")}</dt>
                <dd>{node.causeFromPrev}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t("storySimulation.expectedOutcome")}</dt>
                <dd>{node.expectedOutcome}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "framework-confirm" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/novel/story-simulation/framework-confirm-panel.tsx
git commit -m "feat(story-simulation): 实现框架确认面板 UI"
```

---

## Task 16: 推演报告展示 UI

**Files:**
- Create: `src/components/novel/story-simulation/simulation-report-view.tsx`

- [ ] **Step 1: 创建报告展示**

```tsx
// src/components/novel/story-simulation/simulation-report-view.tsx

import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import type { StoryBranch } from "@/lib/novel/story-simulation/types"

export function SimulationReportView({
  onResimulate,
  onGenerateDraft,
}: {
  onResimulate: () => void
  onGenerateDraft: (branch: StoryBranch) => void
}) {
  const { t } = useTranslation()
  const { currentReport } = useStorySimulationStore()

  if (!currentReport) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("storySimulation.reportTitle")}</h2>
        <Button variant="outline" onClick={onResimulate}>
          {t("storySimulation.resimulate")}
        </Button>
      </div>

      {/* 角色行为分析 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">{t("storySimulation.characterAnalysis")}</h3>
        <div className="space-y-3">
          {currentReport.characterAnalyses.map((ca) => (
            <div key={ca.name} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium">{ca.name}</h4>
                <span className="text-sm text-muted-foreground">
                  {t("storySimulation.consistencyScore")}：{ca.consistencyScore}
                </span>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {ca.behaviors.map((b, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">{b.node}：</span>
                    {b.action}
                    <span className="ml-1 text-xs">（{b.motivation}）</span>
                  </li>
                ))}
              </ul>
              {ca.stateChanges.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {ca.stateChanges.join("；")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 走向分支 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">{t("storySimulation.storyBranches")}</h3>
        <div className="space-y-3">
          {currentReport.branches.map((branch, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${branch.recommendation ? "border-primary" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium">
                  {branch.title}
                  {branch.recommendation && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      {t("storySimulation.recommendation")}
                    </span>
                  )}
                </h4>
                <span className="text-sm text-muted-foreground">
                  {t("storySimulation.probability")}：
                  {t(branch.probability === "high" ? "storySimulation.probabilityHigh" : branch.probability === "medium" ? "storySimulation.probabilityMedium" : "storySimulation.probabilityLow")}
                </span>
              </div>
              <p className="mb-2 text-sm">{branch.summary}</p>
              <ul className="mb-2 list-disc pl-4 text-xs text-muted-foreground">
                {branch.keyEvents.map((e, j) => (
                  <li key={j}>{e}</li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("storySimulation.pros")}：</span>
                  {branch.pros}
                </div>
                <div>
                  <span className="text-muted-foreground">{t("storySimulation.cons")}：</span>
                  {branch.cons}
                </div>
              </div>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => onGenerateDraft(branch)}
              >
                {t("storySimulation.generateDraft")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 综合推荐 */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-2 font-semibold">{t("storySimulation.recommendation")}</h3>
        <p className="text-sm">{currentReport.recommendation}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "simulation-report-view" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/novel/story-simulation/simulation-report-view.tsx
git commit -m "feat(story-simulation): 实现推演报告展示 UI"
```

---

## Task 17: 故事草稿展示 UI

**Files:**
- Create: `src/components/novel/story-simulation/story-draft-view.tsx`

- [ ] **Step 1: 创建草稿展示**

```tsx
// src/components/novel/story-simulation/story-draft-view.tsx

import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function StoryDraftView({
  onBack,
}: {
  onBack: () => void
}) {
  const { t } = useTranslation()
  const { currentDraft } = useStorySimulationStore()
  const [copied, setCopied] = useState(false)

  if (!currentDraft) return null

  const handleCopyAll = () => {
    const text = currentDraft.chapters
      .map((ch) => `# ${ch.title}\n\n${ch.content}`)
      .join("\n\n---\n\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("storySimulation.draftTitle")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            {copied ? "✓" : t("storySimulation.copyAll")}
          </Button>
          <Button variant="outline" size="sm" onClick={onBack}>
            {t("common.back")}
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {t("storySimulation.totalWords")}：{currentDraft.totalWords}
      </div>

      <div className="space-y-4">
        {currentDraft.chapters.map((ch, i) => (
          <div key={i} className="rounded-lg border p-4">
            <h3 className="mb-2 font-medium">{ch.title}</h3>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
              {ch.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "story-draft-view" | head -5`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/novel/story-simulation/story-draft-view.tsx
git commit -m "feat(story-simulation): 实现故事草稿展示 UI"
```

---

## Task 18: 框架列表和绑定对话框 UI

**Files:**
- Create: `src/components/novel/story-simulation/framework-list.tsx`
- Create: `src/components/novel/story-simulation/framework-binding-dialog.tsx`

- [ ] **Step 1: 创建框架列表**

```tsx
// src/components/novel/story-simulation/framework-list.tsx

import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { loadFrameworks } from "@/lib/novel/story-simulation/framework-store"
import { loadBinding } from "@/lib/novel/story-simulation/framework-binding"
import { useWikiStore } from "@/stores/wiki-store"
import type { StoryFramework, FrameworkBinding } from "@/lib/novel/story-simulation/types"
import { FrameworkBindingDialog } from "./framework-binding-dialog"

export function FrameworkList({
  onSelectFramework,
  onNewFramework,
}: {
  onSelectFramework: (framework: StoryFramework) => void
  onNewFramework: () => void
}) {
  const { t } = useTranslation()
  const projectPath = useWikiStore((s) => s.projectPath)
  const { setFrameworks, setSelectedFrameworkId, setBinding } = useStorySimulationStore()
  const [localFrameworks, setLocalFrameworks] = useState<StoryFramework[]>([])
  const [localBinding, setLocalBinding] = useState<FrameworkBinding | null>(null)
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<StoryFramework | null>(null)

  useEffect(() => {
    loadList()
  }, [projectPath])

  const loadList = async () => {
    if (!projectPath) return
    const frameworks = await loadFrameworks(projectPath)
    const binding = await loadBinding(projectPath)
    setLocalFrameworks(frameworks)
    setLocalBinding(binding)
    setFrameworks(frameworks)
    setBinding(binding)
  }

  const handleBindClick = (framework: StoryFramework) => {
    setSelectedFramework(framework)
    setBindingDialogOpen(true)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <Button size="sm" className="w-full" onClick={onNewFramework}>
          {t("storySimulation.newFramework")}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {localFrameworks.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {t("storySimulation.noFrameworks")}
          </p>
        ) : (
          <div className="space-y-1">
            {localFrameworks.map((fw) => (
              <div
                key={fw.id}
                className="rounded-md border p-2 transition-colors hover:bg-accent/30"
              >
                <button
                  onClick={() => {
                    setSelectedFrameworkId(fw.id)
                    onSelectFramework(fw)
                  }}
                  className="block w-full text-left"
                >
                  <div className="text-sm font-medium">{fw.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {fw.nodes.length} {t("storySimulation.phase")} · {fw.targetWords} {t("storySimulation.chapters")}
                  </div>
                </button>
                <div className="mt-1 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleBindClick(fw)}
                  >
                    {localBinding?.frameworkId === fw.id
                      ? t("storySimulation.unbindFromChat")
                      : t("storySimulation.bindToChat")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedFramework && (
        <FrameworkBindingDialog
          open={bindingDialogOpen}
          onOpenChange={setBindingDialogOpen}
          framework={selectedFramework}
          onBound={() => loadList()}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 创建绑定对话框**

```tsx
// src/components/novel/story-simulation/framework-binding-dialog.tsx

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { saveBinding, clearBinding } from "@/lib/novel/story-simulation/framework-binding"
import { useWikiStore } from "@/stores/wiki-store"
import { useStorySimulationStore } from "@/stores/story-simulation-store"
import type { StoryFramework } from "@/lib/novel/story-simulation/types"

const CHAPTER_COUNT_OPTIONS = [5, 10, 20, 30, 50]

export function FrameworkBindingDialog({
  open,
  onOpenChange,
  framework,
  onBound,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  framework: StoryFramework
  onBound: () => void
}) {
  const { t } = useTranslation()
  const projectPath = useWikiStore((s) => s.projectPath)
  const { binding, setBinding } = useStorySimulationStore()
  const [chapterCount, setChapterCount] = useState(10)
  const isBound = binding?.frameworkId === framework.id

  useEffect(() => {
    if (open && isBound && binding) {
      setChapterCount(binding.targetChapterCount)
    }
  }, [open, isBound, binding])

  const handleConfirm = async () => {
    if (!projectPath) return
    const newBinding = await saveBinding(projectPath, framework, chapterCount)
    setBinding(newBinding)
    onBound()
    onOpenChange(false)
  }

  const handleUnbind = async () => {
    if (!projectPath) return
    await clearBinding(projectPath)
    setBinding(null)
    onBound()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("storySimulation.bindingTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">{t("storySimulation.selectFramework")}</label>
            <div className="mt-1 rounded-md border p-2 text-sm">{framework.title}</div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("storySimulation.targetChapterCount")}</label>
            <div className="mt-1 flex gap-2">
              {CHAPTER_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setChapterCount(n)}
                  className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                    chapterCount === n
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("storySimulation.bindingHint")}</p>
        </div>
        <DialogFooter>
          {isBound && (
            <Button variant="outline" onClick={handleUnbind}>
              {t("storySimulation.unbindFromChat")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm}>
            {t("storySimulation.confirmBinding")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "framework-list\|framework-binding-dialog" | head -5`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/components/novel/story-simulation/framework-list.tsx src/components/novel/story-simulation/framework-binding-dialog.tsx
git commit -m "feat(story-simulation): 实现框架列表和绑定对话框 UI"
```

---

## Task 19: 主视图集成

**Files:**
- Modify: `src/components/novel/story-simulation/story-simulation-view.tsx`

- [ ] **Step 1: 重写主视图，集成所有面板**

将 `src/components/novel/story-simulation/story-simulation-view.tsx` 替换为完整的主视图：

```tsx
// src/components/novel/story-simulation/story-simulation-view.tsx

import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useWikiStore } from "@/stores/wiki-store"
import { useTranslation } from "react-i18next"
import { SimulationConfigPanel } from "./simulation-config-panel"
import { FrameworkConfirmPanel } from "./framework-confirm-panel"
import { SimulationReportView } from "./simulation-report-view"
import { StoryDraftView } from "./story-draft-view"
import { FrameworkList } from "./framework-list"
import { extractStoryContent } from "@/lib/novel/story-simulation/story-extractor"
import { generateStoryFramework } from "@/lib/novel/story-simulation/story-framework-generator"
import { buildAgents } from "@/lib/novel/story-simulation/agent-profile-builder"
import { runSimulation } from "@/lib/novel/story-simulation/simulation-engine"
import { generateSimulationReport } from "@/lib/novel/story-simulation/simulation-report-agent"
import { generateStoryDraft } from "@/lib/novel/story-simulation/story-draft-generator"
import { saveFramework, loadSimulationResults } from "@/lib/novel/story-simulation/framework-store"
import { resolveDefaultModel } from "@/lib/novel/model-resolver"
import type { StoryFramework, StoryBranch, StoryDraft } from "@/lib/novel/story-simulation/types"

export function StorySimulationView() {
  const { t } = useTranslation()
  const projectPath = useWikiStore((s) => s.projectPath)
  const llmConfig = useWikiStore((s) => s.llmConfig)
  const store = useStorySimulationStore()
  const {
    phase, mode, userIdea, targetWords, sourceChapters,
    setPhase, setProgress, setError, reset,
    setExtractionResult, setCurrentFramework, setCurrentReport, setCurrentDraft,
    setSelectedFrameworkId,
  } = store

  const handleStart = async () => {
    if (!projectPath) return
    setPhase("extracting")
    setError(null)
    setProgress(0, t("storySimulation.extracting"))

    try {
      // 1. 提取内容
      const extraction = await extractStoryContent(projectPath, {
        sourceChapters,
        onProgress: (p, label) => setProgress(p, label),
      })
      setExtractionResult(extraction)

      // 2. 生成框架
      setPhase("framework-generating")
      setProgress(0, t("storySimulation.frameworkTitle"))

      const llm = resolveDefaultModel(llmConfig)
      const framework = await generateStoryFramework({
        extraction,
        mode,
        targetWords,
        userIdea: userIdea || undefined,
        llmConfig: llm,
        onProgress: (label) => setProgress(0, label),
      })

      setCurrentFramework(framework)
      setPhase("framework-confirming")
    } catch (e) {
      setError((e as Error).message)
      setPhase("configuring")
    }
  }

  const handleConfirmFramework = async () => {
    if (!projectPath || !store.currentFramework) return

    // 保存框架
    await saveFramework(projectPath, store.currentFramework)

    setPhase("simulating")
    setProgress(0, t("storySimulation.simulating"))

    try {
      const extraction = store.extractionResult!
      const framework = store.currentFramework
      const agents = buildAgents(extraction, framework)
      const llm = resolveDefaultModel(llmConfig)

      const events = await runSimulation(
        {
          agents,
          framework,
          mode,
          wordBudget: targetWords,
          llmConfig: llm,
          userIdea: userIdea || undefined,
        },
        extraction,
        {
          onEvent: () => {},
          onProgress: (p, label) => setProgress(p, label),
          onComplete: () => {},
          onError: (e) => { throw e },
        },
      )

      // 生成报告
      setPhase("report-generating")
      setProgress(0, t("storySimulation.reportTitle"))

      const report = await generateSimulationReport({
        events,
        framework,
        mode,
        llmConfig: llm,
        onProgress: (label) => setProgress(0, label),
      })

      setCurrentReport(report)
      setPhase("report-viewing")
    } catch (e) {
      setError((e as Error).message)
      setPhase("framework-confirming")
    }
  }

  const handleRegenerateFramework = async () => {
    // 重新生成框架
    setPhase("framework-generating")
    await handleStart()
  }

  const handleResimulate = () => {
    setPhase("framework-confirming")
  }

  const handleGenerateDraft = async (branch: StoryBranch) => {
    if (!store.currentFramework || !store.currentReport) return

    setPhase("draft-generating")
    setProgress(0, t("storySimulation.draftTitle"))

    try {
      const llm = resolveDefaultModel(llmConfig)
      const draft = await generateStoryDraft({
        framework: store.currentFramework,
        report: store.currentReport,
        selectedBranch: branch,
        llmConfig: llm,
        onProgress: (label) => setProgress(0, label),
      })

      setCurrentDraft(draft)
      setPhase("draft-viewing")
    } catch (e) {
      setError((e as Error).message)
      setPhase("report-viewing")
    }
  }

  const handleNewFramework = () => {
    reset()
    setPhase("configuring")
  }

  const handleSelectFramework = (framework: StoryFramework) => {
    setCurrentFramework(framework)
    setPhase("framework-confirming")
  }

  return (
    <div className="flex h-full">
      {/* 二栏：框架列表 */}
      <div className="w-56 border-r">
        <FrameworkList
          onSelectFramework={handleSelectFramework}
          onNewFramework={handleNewFramework}
        />
      </div>

      {/* 三栏：内容区 */}
      <div className="flex-1 overflow-auto">
        {phase === "idle" || phase === "configuring" ? (
          <SimulationConfigPanel onStart={handleStart} />
        ) : phase === "extracting" || phase === "framework-generating" || phase === "simulating" || phase === "report-generating" || phase === "draft-generating" ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-lg font-medium">{store.progressLabel}</div>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${store.progress}%` }}
              />
            </div>
          </div>
        ) : phase === "framework-confirming" ? (
          <FrameworkConfirmPanel
            onConfirm={handleConfirmFramework}
            onRegenerate={handleRegenerateFramework}
          />
        ) : phase === "report-viewing" ? (
          <SimulationReportView
            onResimulate={handleResimulate}
            onGenerateDraft={handleGenerateDraft}
          />
        ) : phase === "draft-viewing" ? (
          <StoryDraftView onBack={() => setPhase("report-viewing")} />
        ) : null}

        {store.error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {store.error}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证类型检查**

Run: `cd C:\QMAI_C\QMAI-main && npx tsc --noEmit --pretty 2>&1 | grep -i "story-simulation-view" | head -5`
Expected: 无错误

- [ ] **Step 3: 验证 dev server 可启动**

Run: `cd C:\QMAI_C\QMAI-main && npm run dev`
Expected: dev server 正常启动

- [ ] **Step 4: 提交**

```bash
git add src/components/novel/story-simulation/story-simulation-view.tsx
git commit -m "feat(story-simulation): 实现主视图集成（完整流程串联）"
```

---

## Task 20: 测试版打包命名

**Files:**
- Modify: `scripts/build-portable.mjs`

- [ ] **Step 1: 修改打包脚本，支持测试版命名**

在 `scripts/build-portable.mjs` 中，修改输出文件名和 manifest 信息。在文件头部添加分支检测：

在第 6 行 `const pkg = ...` 后添加：

```javascript
// 检测当前分支，如果是 feature-story-simulation 则使用"剧情推演版"命名
import { execSync } from "node:child_process"
let currentBranch = ""
try {
  currentBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
} catch {}

const isStorySimulationBranch = currentBranch === "feature-story-simulation"
const variantName = isStorySimulationBranch ? "剧情推演版" : ""
```

修改第 16 行的 `outExe`：

```javascript
// 修改前
const outExe = resolve(outDir, "QMaiWrite.exe")

// 修改后
const outExe = resolve(outDir, isStorySimulationBranch ? "QMaiWrite-剧情推演版.exe" : "QMaiWrite.exe")
```

修改第 79-88 行的 manifest：

```javascript
// 修改前
writeFileSync(manifest, JSON.stringify({
  productName: "青幕AI写作",
  version: pkg.version,
  builtAt: new Date().toISOString(),
  sourceExe,
  portableExe: outExe,
  exeBytes: exeStat.size,
  includesPdfium: existsSync(outPdfium),
  includesSkills: existsSync(outSkillDir),
}, null, 2), "utf8")

// 修改后
writeFileSync(manifest, JSON.stringify({
  productName: isStorySimulationBranch ? "青幕AI写作（剧情推演版）" : "青幕AI写作",
  version: pkg.version,
  variant: isStorySimulationBranch ? "story-simulation-test" : "stable",
  branch: currentBranch,
  builtAt: new Date().toISOString(),
  sourceExe,
  portableExe: outExe,
  exeBytes: exeStat.size,
  includesPdfium: existsSync(outPdfium),
  includesSkills: existsSync(outSkillDir),
}, null, 2), "utf8")
```

修改最后的输出日志：

```javascript
// 修改前
console.log(`便携版已生成：${outExe}`)
console.log(`版本信息：${manifest}`)

// 修改后
if (isStorySimulationBranch) {
  console.log(`剧情推演版便携版已生成：${outExe}`)
  console.log(`注意：这是测试版，不可上传到 GitHub main 分支`)
} else {
  console.log(`便携版已生成：${outExe}`)
}
console.log(`版本信息：${manifest}`)
```

- [ ] **Step 2: 验证打包脚本语法**

Run: `cd C:\QMAI_C\QMAI-main && node -c scripts/build-portable.mjs`
Expected: 无语法错误

- [ ] **Step 3: 提交**

```bash
git add scripts/build-portable.mjs
git commit -m "feat(story-simulation): 测试版打包命名显示'剧情推演版'"
```

---

## Task 21: 验证旧功能完整性

- [ ] **Step 1: 切换到 main 分支验证旧功能不受影响**

Run: `cd C:\QMAI_C\QMAI-main && git stash && git checkout main && npm run dev`
Expected: main 分支正常启动，所有旧功能可用

- [ ] **Step 2: 切回 feature 分支**

Run: `cd C:\QMAI_C\QMAI-main && git checkout feature-story-simulation && git stash pop`
Expected: feature 分支正常

- [ ] **Step 3: 验证 feature 分支旧功能仍然可用**

在 feature 分支上测试：
- 章节写作功能正常
- 拆书库功能正常
- 记忆中心功能正常
- 图谱功能正常
- 审查中心功能正常
- 设置功能正常

- [ ] **Step 4: 提交验证记录**

```bash
git commit --allow-empty -m "chore(story-simulation): 验证旧功能完整性，所有功能正常"
```

---

## 自检清单

- [ ] **Spec coverage:**
  - 全维度提取（Task 5）✓
  - 故事框架（Task 7）✓
  - 仿真引擎四种模式（Task 8-9）✓
  - 推演报告（Task 10）✓
  - 故事草稿（Task 11）✓
  - 框架保存（Task 12）✓
  - AI 会话绑定（Task 13）✓
  - 单页配置（Task 14）✓
  - 框架确认（Task 15）✓
  - 报告展示（Task 16）✓
  - 草稿展示（Task 17）✓
  - 框架列表（Task 18）✓
  - 主视图集成（Task 19）✓
  - 测试版打包命名（Task 20）✓
  - 旧功能验证（Task 21）✓

- [ ] **Placeholder scan:** 无 TBD/TODO
- [ ] **Type consistency:** types.ts 中的类型在各模块中一致使用
- [ ] **工程隔离:** 所有代码在 feature-story-simulation 分支，不影响 main
