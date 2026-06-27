# 剧情推演室第四轮优化设计

> 日期：2026-06-27
> 分支：feature-more-optimizations
> 方案：B（体验优先）

## 背景

剧情推演室已完成三轮优化（模式差异化、采访持久化、导入进度条、模式可视化、历史采访查看、推演结果对比）。本轮继续优化以下4个功能。

## 功能1：框架节点拖拽排序

### 目标
在框架确认面板（`framework-confirm-panel.tsx`）中支持拖拽调整节点顺序。

### 设计
- 使用 `@dnd-kit/core` + `@dnd-kit/sortable`（新依赖）
- 节点列表用 `SortableContext` 包裹，每个节点卡片用 `useSortable` hook
- 卡片左侧添加拖拽手柄（`GripVertical` 图标），悬停时手柄变主色调
- 拖拽时：被拖卡片半透明（opacity-50），下方显示半透明占位线
- 松手后：重新分配 `index`（0,1,2,...），`phase` 保持不变
- 更新 `currentFramework.nodes` 数组顺序
- 拖拽后"保存框架"按钮高亮提示有未保存改动

### 数据流
```
用户拖拽节点 → onDragEnd 回调 → arrayMove(nodes, from, to) → 
重新分配 index → setCurrentFramework(updatedFramework) → 
UI 自动刷新 → 保存框架按钮高亮
```

### 涉及文件
- `framework-confirm-panel.tsx`：重写节点列表为可拖拽
- `package.json`：添加 @dnd-kit/core 和 @dnd-kit/sortable

## 功能2：草稿章节预览编辑

### 目标
草稿生成后可在弹窗中编辑章节内容，确认后再导入到正式章节。

### 设计
- 在 `story-draft-view.tsx` 中，每个章节卡片增加"编辑"按钮（`Pencil` 图标）
- 点击后弹出全屏 Dialog
- Dialog 内嵌入 milkdown 编辑器（复用项目已有的编辑器组件）
- 编辑器底部显示字数统计
- 底部按钮："保存修改"和"放弃"
- 编辑内容保存在内存中的 draft 数据结构（`DraftChapter.content`）
- 原始 AI 生成内容保留在新字段 `DraftChapter.rawContent`（需扩展类型）
- 导入到正式章节时使用编辑后的 content
- 导入完成后清除编辑缓存

### 数据流
```
点击编辑按钮 → 打开 Dialog → 加载章节 content 到 milkdown → 
用户编辑 → 点击保存 → 更新 draft.chapters[i].content → 
关闭 Dialog → 导入时使用编辑后的 content
```

### 涉及文件
- `story-draft-view.tsx`：添加编辑按钮和 Dialog
- 可能复用已有的 milkdown 编辑器组件（需查找项目中现有使用）

## 功能3：采访继续对话

### 目标
从历史采访进入后，恢复角色 agent 状态，可继续与角色对话。

### 设计
- 在 `interview-history-view.tsx` 的对话详情视图中，添加"继续对话"按钮
- 修改 `SavedInterview` 接口，添加可选的 `agentSnapshot` 字段（SerializedSimulationSnapshot 类型）
- 保存采访时，如果有 agentSnapshot（从 `lastAgentsRef` 获取），一并保存
- 点击"继续对话"后：
  1. 优先从采访记录的 `agentSnapshot` 字段恢复 `NovelAgent[]`
  2. 若采访记录无 agentSnapshot（旧版数据），尝试从对应 frameworkId 的最新推演结果中恢复
  3. 若都找不到，禁用"继续对话"按钮，提示"无法恢复角色状态，仅支持只读查看"
  4. 恢复成功后，将旧对话消息加载到 `story-simulation-store` 的 `agentChatMessages`
  5. 设置 `activeChatAgent` 为对应角色，激活采访面板
  6. 复用现有 `interviewAgent` 函数继续对话
- 新消息追加到旧 session 末尾
- 保存时弹出选择：覆盖原采访 or 另存为新采访

### 数据流
```
点击"继续对话" → 反序列化 agentSnapshot → 恢复 NovelAgent[] → 
加载旧消息到 agentChatMessages → 设置 activeChatAgent → 
关闭历史面板 → 采访面板激活 → 用户继续发消息 → 
interviewAgent() 生成回复 → 追加到 agentChatMessages → 
保存时选择覆盖/另存
```

### 涉及文件
- `interview-history-view.tsx`：添加"继续对话"按钮和恢复逻辑
- `interview-store.ts`：SavedInterview 接口添加 agentSnapshot 字段，saveInterview 函数添加 agentSnapshot 参数
- `story-simulation-view.tsx`：可能需要调整采访面板状态管理
- `story-simulation-store.ts`：可能需要添加"继续模式"状态
- `types.ts`：DraftChapter 添加 rawContent 字段

## 功能4：对比差异高亮

### 目标
推演结果对比模式下，高亮显示两个结果的差异部分。

### 设计
- 在 `ReportContent` 组件中，对比模式下传入 `compareReport` 参数
- 计算两个 report 的差异并标记：

#### 角色分析差异
- 按角色名匹配
- 仅A有的角色：绿色背景标记
- 仅B有的角色：红色背景标记
- 共有角色但一致性分数不同：黄色背景标记分数
- 行为列表不同：黄色背景标记差异行为

#### 走向分支差异
- 按标题匹配
- 仅A有的分支：绿色背景
- 仅B有的分支：红色背景
- 共有分支但概率不同：黄色背景标记概率
- 利弊内容变化：黄色背景标记

#### 综合推荐差异
- 按句号分段
- 逐段对比，不同段落标黄色背景

#### 时间线事件差异
- 顶部统计栏：对比事件总数、角色活跃度排名变化
- 事件数量差异用数字标注（如 A:23 vs B:18）

### 高亮颜色规范
- 绿色（仅A有）：`bg-green-100 dark:bg-green-950/40`
- 红色（仅B有）：`bg-red-100 dark:bg-red-950/40`
- 黄色（内容不同）：`bg-amber-100 dark:bg-amber-950/40`

### 数据流
```
对比模式开启 → 选择对比结果 → ReportContent 接收 compareReport → 
计算 diff（角色分析/分支/推荐/时间线）→ 渲染时添加高亮背景色 → 
用户直观看到差异
```

### 涉及文件
- `simulation-report-view.tsx`：在 ReportContent 中添加对比逻辑和高亮

## 依赖变更
- 新增：`@dnd-kit/core`、`@dnd-kit/sortable`
- 已有：milkdown（用于草稿编辑）

## 风险评估
- **低风险**：4个功能相互独立，不会相互影响
- **中风险**：dnd-kit 新依赖可能与现有样式冲突，需测试拖拽动画
- **低风险**：milkdown 编辑器已在项目中使用，弹窗集成是已知模式
- **低风险**：采访续聊复用现有函数，agent 恢复已有反序列化逻辑

## 测试计划
1. 框架节点拖拽：拖拽后验证 index 正确、phase 不变、保存后重新加载顺序正确
2. 草稿编辑：编辑后导入验证内容正确、原始内容未丢失
3. 采访续聊：恢复后验证 agent 状态正确、新消息正常生成、保存覆盖/另存正确
4. 对比高亮：验证高亮标记准确、颜色区分清晰

## 成功标准
- 4个功能均可正常使用
- 旧功能（推演、报告、草稿导入、采访、历史查看、模式选择）不受影响
- TypeScript 类型检查通过
- 前端构建成功
- 便携版打包成功
