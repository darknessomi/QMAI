import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CharacterSaveDraft } from "@/lib/novel/character-save-extractor"
import type { OutlineSaveRequest } from "@/lib/novel/outline-save-request"

export interface OutlineSaveConfirmPayload {
  requests: OutlineSaveRequest[]
  characterDrafts: CharacterSaveDraft[]
}

interface OutlineSaveConfirmDialogProps {
  open: boolean
  title: string
  mode: "normal" | "character"
  requests: OutlineSaveRequest[]
  characterDrafts: CharacterSaveDraft[]
  onClose: () => void
  onConfirm: (payload: OutlineSaveConfirmPayload) => void
}

export function OutlineSaveConfirmDialog({
  open,
  title,
  mode,
  requests,
  characterDrafts,
  onClose,
  onConfirm,
}: OutlineSaveConfirmDialogProps) {
  const [drafts, setDrafts] = useState<CharacterSaveDraft[]>(characterDrafts)
  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => draft.selected),
    [drafts],
  )

  useEffect(() => {
    if (!open) return
    setDrafts(characterDrafts)
  }, [characterDrafts, open])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose()
    }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[82vh] w-[680px] max-w-[calc(100vw-32px)] overflow-hidden p-0 sm:max-w-[680px]"
      >
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {mode === "character"
                  ? "检测到人物角色内容，请选择要保存的人物小传。"
                  : "请确认文件分类和保存位置。"}
              </DialogDescription>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 max-h-[56vh] overflow-y-auto px-5 py-4">
          {mode === "character" ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                已识别 {drafts.length} 个角色，已选择 {selectedDrafts.length} 个。
              </div>
              {drafts.map((draft) => (
                <label
                  key={draft.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                >
                  <input
                    aria-label={`保存 ${draft.roleType} - ${draft.characterName}`}
                    type="checkbox"
                    checked={draft.selected}
                    onChange={(event) => {
                      setDrafts((items) =>
                        items.map((item) =>
                          item.id === draft.id
                            ? { ...item, selected: event.target.checked }
                            : item,
                        ),
                      )
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {draft.roleType} - {draft.characterName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      文件名：{draft.fileName}
                    </span>
                    {draft.confidence !== "high" ? (
                      <span className="mt-1 block text-xs text-amber-600">
                        识别置信度较低，请保存前检查角色名称和定位。
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {requests.map((request) => (
                <div
                  key={`${request.targetFolder}/${request.fileName}`}
                  className="rounded-md border px-3 py-2"
                >
                  <div className="font-medium">{request.fileName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {request.targetFolder}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            disabled={mode === "character" && selectedDrafts.length === 0}
            onClick={() =>
              onConfirm({
                requests,
                characterDrafts: selectedDrafts,
              })
            }
          >
            确认保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
