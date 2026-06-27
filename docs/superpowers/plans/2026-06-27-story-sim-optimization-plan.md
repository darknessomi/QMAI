# 剧情推演室第四轮优化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现框架节点拖拽排序、草稿章节预览编辑、采访继续对话、对比差异高亮四个功能

**Architecture:** 在现有 feature-more-optimizations 分支上开发。新增 @dnd-kit 依赖用于拖拽，复用已有 milkdown 编辑器用于草稿编辑，复用已有 simulation-serializer 用于采访续聊的 agent 恢复，在 ReportContent 中扩展对比高亮逻辑。四个功能相互独立，按功能分 Task 实现。

**Tech Stack:** React + TypeScript + Zustand + @dnd-kit/sortable + milkdown + Tailwind CSS

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `package.json` | 修改 | 添加 @dnd-kit/core 和 @dnd-kit/sortable 依赖 |
| `src/lib/novel/story-simulation/types.ts` | 修改 | DraftChapter 添加 rawContent 字段 |
| `src/lib/novel/story-simulation/interview-store.ts` | 修改 | SavedInterview 添加 agentSnapshot 字段，saveInterview 添加参数 |
| `src/stores/story-simulation-store.ts` | 修改 | 添加续聊模式状态、草稿编辑状态 |
| `src/components/novel/story-simulation/framework-confirm-panel.tsx` | 修改 | 节点列表改为可拖拽 |
| `src/components/novel/story-simulation/story-draft-view.tsx` | 修改 | 添加章节编辑弹窗 |
| `src/components/novel/story-simulation/interview-history-view.tsx` | 修改 | 添加"继续对话"按钮和恢复逻辑 |
| `src/components/novel/story-simulation/story-simulation-view.tsx` | 修改 | 采访续聊状态管理、保存采访时传入 agentSnapshot |
| `src/components/novel/story-simulation/simulation-report-view.tsx` | 修改 | ReportContent 添加对比差异高亮 |

---

## Task 1: 安装 @dnd-kit 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: 验证安装成功**

```bash
node -e "require('@dnd-kit/core'); require('@dnd-kit/sortable'); require('@dnd-kit/utilities'); console.log('OK')"
```
Expected: 输出 `OK`

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: 添加 @dnd-kit 拖拽排序依赖"
```

---

## Task 2: 扩展 DraftChapter 类型

**Files:**
- Modify: `src/lib/novel/story-simulation/types.ts:255-259`

- [ ] **Step 1: 添加 rawContent 可选字段**

在 `DraftChapter` 接口中添加 `rawContent` 字段：

```typescript
export interface DraftChapter {
  title: string
  content: string
  correspondingNode: number
  /** 原始 AI 生成内容（编辑前的备份），未编辑时为 undefined */
  rawContent?: string
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/novel/story-simulation/types.ts
git commit -m "feat: DraftChapter 添加 rawContent 字段用于草稿编辑备份"
```

---

## Task 3: 扩展 SavedInterview 和 saveInterview 支持 agentSnapshot

**Files:**
- Modify: `src/lib/novel/story-simulation/interview-store.ts`
- Modify: `src/components/novel/story-simulation/story-simulation-view.tsx`（保存采访时传入 agentSnapshot）

- [ ] **Step 1: SavedInterview 添加 agentSnapshot 字段**

在 `interview-store.ts` 的 `SavedInterview` 接口中添加：

```typescript
import type { SerializedSimulationSnapshot } from "./simulation-serializer"

export interface SavedInterview {
  id: string
  agentName: string
  frameworkId?: string
  frameworkTitle?: string
  createdAt: string
  updatedAt: string
  session: AgentChatSession
  /** 推演时的 agent 快照，用于继续对话时恢复角色状态 */
  agentSnapshot?: SerializedSimulationSnapshot
}
```

- [ ] **Step 2: saveInterview 函数添加 agentSnapshot 参数**

修改 `saveInterview` 函数签名，在 options 中添加 `agentSnapshot`：

```typescript
export async function saveInterview(
  projectPath: string,
  session: AgentChatSession,
  options?: {
    frameworkId?: string
    frameworkTitle?: string
    existingId?: string
    agentSnapshot?: SerializedSimulationSnapshot
  },
): Promise<string> {
  // ... 现有代码不变 ...
  const payload: SavedInterview = {
    id,
    agentName: session.agentName,
    frameworkId: options?.frameworkId,
    frameworkTitle: options?.frameworkTitle,
    createdAt: now,
    updatedAt: now,
    session,
    agentSnapshot: options?.agentSnapshot,
  }
  // ... 后续不变 ...
}
```

- [ ] **Step 3: 在 story-simulation-view.tsx 中保存采访时传入 agentSnapshot**

找到保存采访的代码（`handleSaveChat` 或类似函数），在调用 `saveInterview` 时传入 `agentSnapshot`：

```typescript
// 在 story-simulation-view.tsx 的 handleSaveChat 函数中
import { serializeSimulationState } from "@/lib/novel/story-simulation/simulation-serializer"

// 保存时传入当前 agents 快照
const agentSnapshot = lastSimulationStateRef.current && lastAgentsRef.current.length > 0
  ? serializeSimulationState(lastSimulationStateRef.current, lastAgentsRef.current)
  : undefined

await saveInterview(projectPath, session, {
  frameworkId: currentFramework?.id,
  frameworkTitle: currentFramework?.title,
  existingId: options?.existingId,
  agentSnapshot,
})
```

- [ ] **Step 4: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/lib/novel/story-simulation/interview-store.ts src/components/novel/story-simulation/story-simulation-view.tsx
git commit -m "feat: 采访保存支持 agentSnapshot 持久化"
```

---

## Task 4: 框架节点拖拽排序

**Files:**
- Modify: `src/components/novel/story-simulation/framework-confirm-panel.tsx`

- [ ] **Step 1: 添加 dnd-kit 导入和拖拽相关 hook**

在文件顶部添加导入：

```typescript
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Pencil, X, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useStorySimulationStore } from "@/stores/story-simulation-store"
import type { StoryNode } from "@/lib/novel/story-simulation/types"
import { cn } from "@/lib/utils"
```

- [ ] **Step 2: 添加 SortableNodeCard 组件**

在 `FrameworkNodeCard` 组件定义之前，添加一个可排序包装组件：

```typescript
/** 可排序的节点卡片包装器 */
function SortableNodeCard({
  node,
  onUpdate,
}: {
  node: StoryNode
  onUpdate: (updates: Partial<StoryNode>) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.index })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* 拖拽手柄 */}
      <button
        type="button"
        className="absolute left-0 top-0 z-10 flex h-full w-6 cursor-grab items-center justify-center text-muted-foreground/30 hover:text-primary active:cursor-grabbing"
        {...attributes}
        {...listeners}
        title="拖拽排序"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="pl-6">
        <FrameworkNodeCard node={node} onUpdate={onUpdate} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 在 FrameworkConfirmPanel 中使用 DndContext 替换原节点列表**

将原来第222-236行的节点列表部分替换为：

```typescript
  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 拖拽结束时重排节点
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !currentFramework) return

    const sortedNodes = currentFramework.nodes.slice().sort((a, b) => a.index - b.index)
    const oldIndex = sortedNodes.findIndex((n) => n.index === active.id)
    const newIndex = sortedNodes.findIndex((n) => n.index === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedNodes, oldIndex, newIndex)
    // 重新分配 index，保持 phase 不变
    const updatedNodes = reordered.map((n, i) => ({ ...n, index: i }))
    setCurrentFramework({
      ...currentFramework,
      nodes: updatedNodes,
    })
    // 显示未保存提示
    setSavedTip(false)
  }

  const sortedNodes = currentFramework.nodes.slice().sort((a, b) => a.index - b.index)
```

然后在 JSX 中替换节点列表渲染：

```tsx
      {/* 节点列表 - 可拖拽排序 */}
      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-muted-foreground">
          {t("storySimulation.frameworkNodes")}
          <span className="ml-2 text-xs text-primary/60">（拖拽手柄可排序）</span>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedNodes.map((n) => n.index)}
            strategy={verticalListSortingStrategy}
          >
            {sortedNodes.map((node) => (
              <SortableNodeCard
                key={node.index}
                node={node}
                onUpdate={(updates) => updateNode(node.index, updates)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
```

- [ ] **Step 4: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 5: 构建验证**

```bash
npm run build
```
Expected: 构建成功

- [ ] **Step 6: 提交**

```bash
git add src/components/novel/story-simulation/framework-confirm-panel.tsx
git commit -m "feat: 框架节点支持拖拽排序，phase保持不变"
```

---

## Task 5: 草稿章节预览编辑

**Files:**
- Modify: `src/components/novel/story-simulation/story-draft-view.tsx`
- Modify: `src/components/novel/story-simulation/story-draft-generator.ts`（生成时设置 rawContent）

- [ ] **Step 1: 在 story-draft-generator.ts 中生成时设置 rawContent**

找到 `generateStoryDraft` 函数中创建 `DraftChapter` 的地方，在生成时将 content 同时存入 rawContent：

```typescript
// 在创建 DraftChapter 时
const chapter: DraftChapter = {
  title: chapterTitle,
  content: chapterContent,
  correspondingNode: nodeIndex,
  rawContent: chapterContent, // 保存原始内容
}
```

- [ ] **Step 2: 在 story-draft-view.tsx 中添加编辑状态和 Dialog**

在文件顶部添加导入和状态：

```typescript
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Check, Copy, Download, FileText, BookOpen, Pencil, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useStorySimulationStore } from "@/stores/story-simulation-store"
import { useWikiStore } from "@/stores/wiki-store"
import { exportDraft } from "@/lib/novel/story-simulation/draft-export"
import { importDraftToChapters } from "@/lib/novel/story-simulation/draft-importer"
import { getNextChapterNumber } from "@/lib/novel/chapter-utils"
import { refreshProjectState } from "@/lib/project-refresh"
import type { StoryDraft } from "@/lib/novel/story-simulation/types"
```

在组件函数中添加编辑状态：

```typescript
  const [editingChapterIdx, setEditingChapterIdx] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editTitle, setEditTitle] = useState("")

  // 打开编辑弹窗
  const openEditDialog = (idx: number) => {
    if (!draft) return
    const chapter = draft.chapters[idx]
    setEditTitle(chapter.title)
    setEditContent(chapter.content)
    setEditingChapterIdx(idx)
  }

  // 保存编辑
  const saveEdit = () => {
    if (editingChapterIdx === null || !draft) return
    const updatedDraft: StoryDraft = {
      ...draft,
      chapters: draft.chapters.map((ch, i) =>
        i === editingChapterIdx
          ? { ...ch, title: editTitle.trim() || ch.title, content: editContent }
          : ch,
      ),
    }
    setCurrentDraft(updatedDraft)
    setEditingChapterIdx(null)
  }

  // 放弃编辑
  const cancelEdit = () => {
    setEditingChapterIdx(null)
  }
```

注意：需要在 store 解构中添加 `setCurrentDraft`：

```typescript
  const setCurrentDraft = useStorySimulationStore((s) => s.setCurrentDraft)
```

- [ ] **Step 3: 在章节卡片中添加编辑按钮**

将章节渲染部分（第218-228行）替换为：

```tsx
          {draft.chapters.map((chapter, idx) => (
            <div key={idx} className="rounded-lg border p-4">
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {chapter.title}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 w-7 p-0 opacity-50 hover:opacity-100"
                  onClick={() => openEditDialog(idx)}
                  title="编辑章节"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {chapter.content}
              </p>
              {chapter.rawContent && chapter.rawContent !== chapter.content && (
                <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                  ✓ 已编辑（原始内容已备份）
                </div>
              )}
            </div>
          ))}
```

- [ ] **Step 4: 添加编辑 Dialog**

在导入 Dialog 之后添加编辑 Dialog：

```tsx
      {/* 章节编辑对话框 */}
      <Dialog open={editingChapterIdx !== null} onOpenChange={(open) => {
        if (!open) cancelEdit()
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑章节</DialogTitle>
            <DialogDescription>
              编辑后的内容将用于导入到章节库。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">章节标题</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">章节内容</label>
                <span className="text-xs text-muted-foreground">
                  {editContent.length} 字
                </span>
              </div>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[50vh] text-sm leading-relaxed"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelEdit}>
              放弃
            </Button>
            <Button onClick={saveEdit}>
              <Save className="mr-1 h-3.5 w-3.5" />
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 5: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/components/novel/story-simulation/story-draft-view.tsx src/lib/novel/story-simulation/story-draft-generator.ts
git commit -m "feat: 草稿章节支持编辑，原始内容备份到rawContent"
```

---

## Task 6: 采访继续对话

**Files:**
- Modify: `src/components/novel/story-simulation/interview-history-view.tsx`
- Modify: `src/stores/story-simulation-store.ts`
- Modify: `src/components/novel/story-simulation/story-simulation-view.tsx`

- [ ] **Step 1: 在 store 中添加续聊模式状态**

在 `story-simulation-store.ts` 的接口和实现中添加：

```typescript
  /** 当前续聊的采访ID（用于保存时判断覆盖/另存） */
  continuingInterviewId: string | null
  
  setContinuingInterviewId: (id: string | null) => void
```

初始值：
```typescript
  continuingInterviewId: null,
```

setter：
```typescript
  setContinuingInterviewId: (continuingInterviewId) => set({ continuingInterviewId }),
```

reset 中添加：
```typescript
  continuingInterviewId: null,
```

- [ ] **Step 2: 在 interview-history-view.tsx 中添加"继续对话"按钮**

在对话详情视图的工具栏中（第148-173行之间），在导出按钮之前添加"继续对话"按钮：

```typescript
import { deserializeSimulationSnapshot } from "@/lib/novel/story-simulation/simulation-serializer"
import { loadSimulationResults } from "@/lib/novel/story-simulation/framework-store"
import type { NovelAgent } from "@/lib/novel/story-simulation/types"
```

添加恢复 agent 的函数和"继续对话"按钮：

```typescript
  const setContinuingInterviewId = useStorySimulationStore((s) => s.setContinuingInterviewId)
  const setActiveChatAgent = useStorySimulationStore((s) => s.setActiveChatAgent)
  const setAgentChatMessages = useStorySimulationStore((s) => s.setAgentChatMessages)
  const [resuming, setResuming] = useState(false)

  /** 从采访记录或推演结果中恢复 agent 状态 */
  const handleContinueInterview = async (interview: SavedInterview) => {
    if (!projectPath) return
    setResuming(true)
    try {
      let agents: NovelAgent[] = []

      // 优先从采访记录的 agentSnapshot 恢复
      if (interview.agentSnapshot) {
        const { agents: deserializedAgents } = deserializeSimulationSnapshot(interview.agentSnapshot)
        agents = deserializedAgents
      }

      // 若采访记录无快照，尝试从对应 frameworkId 的推演结果恢复
      if (agents.length === 0 && interview.frameworkId) {
        const results = await loadSimulationResults(projectPath, interview.frameworkId)
        for (const r of results) {
          if (r.agentSnapshot) {
            const { agents: deserializedAgents } = deserializeSimulationSnapshot(r.agentSnapshot)
            // 找到匹配 agentName 的结果
            if (deserializedAgents.some((a) => a.name === interview.agentName)) {
              agents = deserializedAgents
              break
            }
          }
        }
      }

      if (agents.length === 0) {
        setError("无法恢复角色状态，仅支持只读查看")
        setTimeout(() => setError(null), 3000)
        return
      }

      // 找到对应角色的 agent
      const targetAgent = agents.find((a) => a.name === interview.agentName)
      if (!targetAgent) {
        setError(`未找到角色「${interview.agentName}」的 agent 数据`)
        setTimeout(() => setError(null), 3000)
        return
      }

      // 加载旧对话消息到 store
      setAgentChatMessages(interview.session.messages)
      setActiveChatAgent(targetAgent.characterId)
      setContinuingInterviewId(interview.id)
      setShowInterviewHistory(false)
      setViewingInterview(null)
      setError("已恢复采访，可继续对话")
      setTimeout(() => setError(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "恢复失败")
      setTimeout(() => setError(null), 3000)
    } finally {
      setResuming(false)
    }
  }
```

在对话详情视图的工具栏中添加按钮（导出按钮之前）：

```tsx
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleContinueInterview(viewingInterview)}
                    disabled={resuming}
                  >
                    {resuming ? "恢复中..." : "继续对话"}
                  </Button>
```

- [ ] **Step 3: 修改 store 的 setAgentChatMessages**

确保 store 中有 `setAgentChatMessages` 函数，如果没有则添加：

```typescript
  setAgentChatMessages: (messages: AgentChatMessage[]) => void
```

实现：
```typescript
  setAgentChatMessages: (messages) => set({ agentChatMessages: messages }),
```

- [ ] **Step 4: 在 story-simulation-view.tsx 中处理续聊保存**

修改保存采访的逻辑，支持续聊模式下的覆盖/另存选择。在 `handleSaveChat` 或类似函数中：

```typescript
  const continuingInterviewId = useStorySimulationStore((s) => s.continuingInterviewId)
  const setContinuingInterviewId = useStorySimulationStore((s) => s.setContinuingInterviewId)

  // 在保存采访时
  const handleSaveChat = async () => {
    // ... 现有逻辑 ...
    
    // 如果是续聊模式，询问覆盖还是另存
    let existingId: string | undefined
    if (continuingInterviewId) {
      const choice = confirm("覆盖原采访对话？\n\n确定 = 覆盖原采访\n取消 = 另存为新采访")
      if (choice) {
        existingId = continuingInterviewId
      }
    }
    
    const agentSnapshot = lastSimulationStateRef.current && lastAgentsRef.current.length > 0
      ? serializeSimulationState(lastSimulationStateRef.current, lastAgentsRef.current)
      : undefined

    const interviewId = await saveInterview(projectPath, session, {
      frameworkId: currentFramework?.id,
      frameworkTitle: currentFramework?.title,
      existingId,
      agentSnapshot,
    })
    
    setContinuingInterviewId(null)
    // ... 后续逻辑 ...
  }
```

- [ ] **Step 5: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/stores/story-simulation-store.ts src/components/novel/story-simulation/interview-history-view.tsx src/components/novel/story-simulation/story-simulation-view.tsx
git commit -m "feat: 采访支持继续对话，恢复agent状态追加到旧对话"
```

---

## Task 7: 对比差异高亮 - 角色分析和走向分支

**Files:**
- Modify: `src/components/novel/story-simulation/simulation-report-view.tsx`

- [ ] **Step 1: 在 ReportContent 中添加 compareReport 参数**

修改 `ReportContentProps` 接口：

```typescript
interface ReportContentProps {
  report: SimulationReport
  timelineEvents: TimelineEvent[]
  framework?: StoryFramework | null
  onInterviewAgent?: (agentId: string, agentName: string) => void
  onGenerateDraft?: (branch: StoryBranch) => void
  title?: string
  compact?: boolean
  /** 对比模式下的另一个报告，用于高亮差异 */
  compareReport?: SimulationReport | null
  /** 对比模式下的另一组时间线事件，用于差异统计 */
  compareTimelineEvents?: TimelineEvent[]
}
```

在 `ReportContent` 函数签名中解构 `compareReport` 和 `compareTimelineEvents`。

- [ ] **Step 2: 添加角色分析差异高亮**

在 `ReportContent` 中，角色分析渲染部分添加差异对比逻辑：

```typescript
  // 对比模式：计算角色分析差异
  const characterDiff = useMemo(() => {
    if (!compareReport) return null
    const aNames = new Set(report.characterAnalyses.map((c) => c.name))
    const bNames = new Set(compareReport.characterAnalyses.map((c) => c.name))
    const onlyInA = new Set([...aNames].filter((n) => !bNames.has(n)))
    const onlyInB = new Set([...bNames].filter((n) => !aNames.has(n)))
    const scoreDiff = new Map<string, { a: number; b: number }>()
    for (const ca of report.characterAnalyses) {
      const cb = compareReport.characterAnalyses.find((c) => c.name === ca.name)
      if (cb && ca.consistencyScore !== cb.consistencyScore) {
        scoreDiff.set(ca.name, { a: ca.consistencyScore, b: cb.consistencyScore })
      }
    }
    return { onlyInA, onlyInB, scoreDiff }
  }, [report.characterAnalyses, compareReport])

  // 获取角色卡片高亮类名
  const getCharHighlightClass = (name: string): string => {
    if (!characterDiff) return ""
    if (characterDiff.onlyInA.has(name)) return "bg-green-100 dark:bg-green-950/40"
    if (characterDiff.onlyInB.has(name)) return "bg-red-100 dark:bg-red-950/40"
    if (characterDiff.scoreDiff.has(name)) return "bg-amber-100 dark:bg-amber-950/40"
    return ""
  }
```

在角色分析卡片渲染中添加高亮：

```tsx
                {report.characterAnalyses.map((char) => (
                  <div key={char.characterId} className={cn("rounded-lg border p-3", getCharHighlightClass(char.name))}>
```

需要在导入中添加 `cn`：

```typescript
import { cn } from "@/lib/utils"
```

对于一致性分数差异，在显示分数时添加标记：

```tsx
                      <span className="rounded px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        一致性: {char.consistencyScore}
                        {characterDiff?.scoreDiff.has(char.name) && (
                          <span className="ml-1 text-amber-600">
                            (B: {characterDiff.scoreDiff.get(char.name)!.b})
                          </span>
                        )}
                      </span>
```

- [ ] **Step 3: 添加走向分支差异高亮**

在 `ReportContent` 中添加分支差异计算：

```typescript
  // 对比模式：计算走向分支差异
  const branchDiff = useMemo(() => {
    if (!compareReport) return null
    const aTitles = new Set(report.branches.map((b) => b.title))
    const bTitles = new Set(compareReport.branches.map((b) => b.title))
    const onlyInA = new Set([...aTitles].filter((t) => !bTitles.has(t)))
    const onlyInB = new Set([...bTitles].filter((t) => !aTitles.has(t)))
    const probDiff = new Map<string, { a: string; b: string }>()
    for (const ba of report.branches) {
      const bb = compareReport.branches.find((b) => b.title === ba.title)
      if (bb && ba.probability !== bb.probability) {
        probDiff.set(ba.title, { a: ba.probability, b: bb.probability })
      }
    }
    return { onlyInA, onlyInB, probDiff }
  }, [report.branches, compareReport])

  const getBranchHighlightClass = (title: string): string => {
    if (!branchDiff) return ""
    if (branchDiff.onlyInA.has(title)) return "bg-green-100 dark:bg-green-950/40"
    if (branchDiff.onlyInB.has(title)) return "bg-red-100 dark:bg-red-950/40"
    if (branchDiff.probDiff.has(title)) return "bg-amber-100 dark:bg-amber-950/40"
    return ""
  }
```

在分支卡片渲染中添加高亮：

```tsx
                  <div key={idx} className={cn("rounded-lg border p-3", getBranchHighlightClass(branch.title))}>
```

- [ ] **Step 4: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/components/novel/story-simulation/simulation-report-view.tsx
git commit -m "feat: 对比模式高亮角色分析和走向分支差异"
```

---

## Task 8: 对比差异高亮 - 综合推荐和时间线

**Files:**
- Modify: `src/components/novel/story-simulation/simulation-report-view.tsx`

- [ ] **Step 1: 添加综合推荐差异高亮**

在 `ReportContent` 中添加推荐差异计算：

```typescript
  // 对比模式：计算综合推荐差异（按句号分段）
  const recommendationDiff = useMemo(() => {
    if (!compareReport || !report.recommendation) return null
    if (!compareReport.recommendation) return { segments: [report.recommendation] }
    
    const aSegments = report.recommendation.split(/[。！？]/).filter((s) => s.trim())
    const bSegments = new Set(compareReport.recommendation.split(/[。！？]/).filter((s) => s.trim()))
    
    // 标记 A 中有但 B 中没有的段落
    return {
      segments: aSegments.map((seg) => ({
        text: seg,
        isDifferent: !bSegments.has(seg),
      })),
    }
  }, [report.recommendation, compareReport])
```

在综合推荐渲染中添加高亮：

```tsx
          {report.recommendation && (
            <section>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  综合推荐
                  {recommendationDiff && (
                    <span className="ml-auto text-xs font-normal text-amber-600">有差异</span>
                  )}
                </h3>
                {recommendationDiff ? (
                  <div className="space-y-1 text-sm leading-relaxed">
                    {recommendationDiff.segments.map((seg, i) => (
                      <span
                        key={i}
                        className={seg.isDifferent ? "rounded bg-amber-100 px-1 dark:bg-amber-950/40" : ""}
                      >
                        {seg.text}。
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{report.recommendation}</p>
                )}
              </div>
            </section>
          )}
```

- [ ] **Step 2: 添加时间线事件差异统计**

在 `ReportContent` 的关系网络区域之前添加时间线差异统计栏：

```typescript
  // 对比模式：计算时间线事件差异
  const timelineDiff = useMemo(() => {
    if (!compareReport || !compareTimelineEvents) return null
    const aCount = timelineEvents.length
    const bCount = compareTimelineEvents.length
    
    // 角色活跃度排名对比
    const aActivity = new Map<string, number>()
    for (const ev of timelineEvents) {
      aActivity.set(ev.actorName, (aActivity.get(ev.actorName) || 0) + 1)
    }
    const aRanking = Array.from(aActivity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    
    return { aCount, bCount, aRanking }
  }, [timelineEvents, compareReport, compareTimelineEvents])
```

在时间线事件区域顶部添加对比统计栏：

```tsx
          {timelineDiff && (
            <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
              <span className="font-medium">事件数量对比：</span>
              <span className="text-primary">A: {timelineDiff.aCount}</span>
              <span className="text-muted-foreground">vs</span>
              <span className="text-red-500">B: {timelineDiff.bCount}</span>
              <span className="ml-auto text-muted-foreground">
                差异: {Math.abs(timelineDiff.aCount - timelineDiff.bCount)} 条
              </span>
            </div>
          )}
```

- [ ] **Step 3: 在对比双栏中传入 compareReport**

在 `SimulationReportView` 的双栏对比渲染中，给左侧 ReportContent 传入 `compareReport`：

```tsx
          <div className="min-w-0 flex-1 border-r">
            <ReportContent
              report={activeReport}
              timelineEvents={activeTimeline}
              framework={currentFramework}
              onInterviewAgent={!currentResult ? onInterviewAgent : undefined}
              onGenerateDraft={!currentResult ? onGenerateDraft : undefined}
              title={currentResult ? `结果 A (${formatDate(currentResult.createdAt)})` : "结果 A (最新)"}
              compact={true}
              compareReport={compareResult?.report}
              compareTimelineEvents={compareResult?.timelineEvents || []}
            />
          </div>
```

- [ ] **Step 4: 类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 5: 构建验证**

```bash
npm run build
```
Expected: 构建成功

- [ ] **Step 6: 提交**

```bash
git add src/components/novel/story-simulation/simulation-report-view.tsx
git commit -m "feat: 对比模式高亮综合推荐和时间线事件差异"
```

---

## Task 9: 最终验证和打包

**Files:**
- 无文件修改

- [ ] **Step 1: 完整类型检查**

```bash
npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 2: 完整构建**

```bash
npm run build
```
Expected: 构建成功

- [ ] **Step 3: 打包便携版**

```bash
npm run build:portable
```
Expected: 输出 `C:\QMAI_C\QMAI-main\release-portable\QMaiWrite.exe`

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 完成第四轮优化 - 拖拽排序/草稿编辑/采访续聊/对比高亮"
```

---

## 测试清单

完成实现后，逐项手动验证：

- [ ] 框架节点拖拽：拖拽后 index 正确、phase 不变
- [ ] 框架节点拖拽：保存后重新加载顺序正确
- [ ] 草稿编辑：编辑后内容正确保存
- [ ] 草稿编辑：编辑后导入验证内容正确
- [ ] 草稿编辑：原始内容 rawContent 未丢失
- [ ] 采访续聊：恢复后 agent 状态正确
- [ ] 采访续聊：新消息正常生成
- [ ] 采访续聊：保存覆盖/另存正确
- [ ] 采访续聊：无 agentSnapshot 时禁用按钮
- [ ] 对比高亮：角色分析差异标记准确
- [ ] 对比高亮：走向分支差异标记准确
- [ ] 对比高亮：综合推荐差异段落高亮
- [ ] 对比高亮：时间线事件数量对比显示
- [ ] 旧功能验证：推演流程正常
- [ ] 旧功能验证：报告导出正常
- [ ] 旧功能验证：草稿导入正常
- [ ] 旧功能验证：采访保存正常
- [ ] 旧功能验证：历史采访查看正常
- [ ] 旧功能验证：模式选择正常
