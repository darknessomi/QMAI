import { PreviewPanel } from "@/components/layout/preview-panel"
import { OutlineChatPanel } from "@/components/sources/outline-chat-panel"
import { useWikiStore } from "@/stores/wiki-store"

export function OutlineWorkbench() {
  const project = useWikiStore((s) => s.project)

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        请先打开项目
      </div>
    )
  }

  return (
    <div
      className="flex h-full min-h-0 overflow-hidden bg-background"
      data-testid="outline-workbench"
    >
      <div className="h-full min-w-0 flex-1 overflow-hidden" data-testid="outline-editor-pane">
        <PreviewPanel />
      </div>

      <div
        className="h-full min-h-0 shrink-0 overflow-hidden border-l bg-background"
        style={{ width: "50%" }}
        data-testid="outline-ai-pane"
      >
        <OutlineChatPanel onClose={() => {}} />
      </div>
    </div>
  )
}
