import { readFile, writeFileAtomic } from "@/commands/fs"
import { replaceWholeChapterBody } from "@/lib/chapter-selection"
import { requestEditorExternalChapterBodyUpdate } from "@/lib/editor-external-update-session"
import { normalizePath } from "@/lib/path-utils"

export interface OpenChapterBodyUpdateInput {
  path: string
  candidateContent: string
  currentOpenPath(): string | null
  currentMarkdown(): string
  invalidatePendingSave(): void
  runExternalUpdate(path: string, write: () => Promise<void>): Promise<number>
  markEditorSession(path: string, version?: number): void
  writeFileAtomic(path: string, content: string): Promise<void>
  commitEditor(content: string): void
  bumpDataVersion(): void
}

export async function applyOpenChapterBodyUpdate(input: OpenChapterBodyUpdateInput): Promise<boolean> {
  const targetPath = normalizePath(input.path)
  const initialOpenPath = input.currentOpenPath()
  if (!initialOpenPath || normalizePath(initialOpenPath) !== targetPath) return false
  const merged = replaceWholeChapterBody(input.currentMarkdown(), input.candidateContent)
  input.invalidatePendingSave()
  const externalVersion = await input.runExternalUpdate(input.path, () =>
    input.writeFileAtomic(input.path, merged),
  )
  input.bumpDataVersion()
  const latestOpenPath = input.currentOpenPath()
  if (latestOpenPath && normalizePath(latestOpenPath) === targetPath) {
    input.commitEditor(merged)
    input.markEditorSession(input.path, externalVersion)
  }
  return true
}

export interface DeAiBatchChapterApplierOptions {
  requestOpenUpdate(path: string, candidateContent: string): Promise<boolean>
  readFile(path: string): Promise<string>
  writeFileAtomic(path: string, content: string): Promise<void>
}

export function createDeAiBatchChapterApplier(
  options: DeAiBatchChapterApplierOptions = {
    requestOpenUpdate: requestEditorExternalChapterBodyUpdate,
    readFile,
    writeFileAtomic,
  },
): (path: string, candidateContent: string) => Promise<void> {
  return async (path, candidateContent) => {
    if (await options.requestOpenUpdate(path, candidateContent)) return
    const currentMarkdown = await options.readFile(path)
    const merged = replaceWholeChapterBody(currentMarkdown, candidateContent)
    await options.writeFileAtomic(path, merged)
  }
}

