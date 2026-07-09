import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useWikiStore } from "@/stores/wiki-store"
import { OutlineActionToolbar } from "@/components/sources/outline-action-toolbar"
import { OutlineWorkbench } from "@/components/sources/outline-workbench"
import { PreviewPanel } from "@/components/layout/preview-panel"

export function SourcesView() {
  const { t } = useTranslation()
  const novelMode = useWikiStore((s) => s.novelMode)
  const [bulkIngestResult, setBulkIngestResult] = useState<string | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">
          {t(novelMode ? "novel.sources.title" : "sources.title")}
        </h2>
        <div className="flex flex-wrap gap-1">
          {novelMode ? (
            <OutlineActionToolbar onBulkIngestResult={setBulkIngestResult} />
          ) : null}
        </div>
      </div>

      {bulkIngestResult ? (
        <div className="border-b px-4 py-2 text-xs text-muted-foreground whitespace-pre-line">
          {bulkIngestResult}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {novelMode ? <OutlineWorkbench /> : <PreviewPanel />}
      </div>
    </div>
  )
}
