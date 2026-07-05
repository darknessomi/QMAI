# huihualishianniu 分支说明

## 概述
将 AI 会话顶部原本"一行横向滚动全部历史"改为三段式紧凑布局，减少宽度占用，新增"绘画历史记录"展开按钮。

## 改动内容

### 1. src/components/chat/chat-panel.tsx
- import 增加 `History` 图标、`type CSSProperties`
- 重写 `ConversationTabs`：
  - 左侧「新建写作绘画」按钮（保持原 `qmai-new-conversation-button` 类与 aria-label）
  - 中部「正在工作的绘画」：仅展示当前激活会话 chip；无会话时显示占位文案
  - 右侧「绘画历史记录」按钮（计数徽标 + ChevronDown），点击展开下拉浮层
- 历史浮层用 `createPortal` 挂到 body，基于按钮 `getBoundingClientRect` 自适应定位：
  - 水平：优先宽口右侧展开，空间不足时左侧展开
  - 垂直：默认下方展开，空间不足时翻转到上方
  - 半屏/窄窗口下不会贴死窗口右边缘
- 抽出 `renderConversationChip` / `handleDeleteConversation` 复用
- 外部点击 / Esc 关闭浮层
- 切换激活会话自动收起浮层

### 2. src/i18n/zh.json
新增：`chat.conversationHistory` / `chat.noHistoryConversations`
新增：`novel.chat.conversationHistory` / `novel.chat.noHistoryConversations`

### 3. src/i18n/en.json
新增：`chat.conversationHistory` / `chat.noHistoryConversations`
新增：`novel.chat.conversationHistory` / `novel.chat.noHistoryConversations`

## 验证记录
- chat-panel.spec.tsx：69 通过，0 失败
- 全项目 vitest：73 失败、2734 通过（与 HEAD 一致，未引入新失败）
- tsc --noEmit：chat-panel.tsx 无 TS 错误
- build:portable 打包成功