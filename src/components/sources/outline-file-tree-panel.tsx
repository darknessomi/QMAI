import { useCallback, useEffect, useState } from "react"
import type { FileNode } from "@/types/wiki"
import { copyFile, createDirectory, deleteFile, fileExists, listDirectory } from "@/commands/fs"
import { useWikiStore } from "@/stores/wiki-store"
import { useOutlineChatStore } from "@/stores/outline-chat-store"
import { OutlineFileTree } from "@/components/sources/outline-file-tree"
import {
  DEFAULT_OUTLINE_FOLDER_PATHS,
  getDefaultOutlineFolderPath,
  getOutlineRoot,
  planOutlineFileMove,
} from "@/lib/novel/outline-workbench"
import { normalizePath } from "@/lib/path-utils"

interface OutlineFileTreePanelProps {
  showHeader?: boolean
}

function getDirName(path: string): string {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf("/")
  return index >= 0 ? normalized.slice(0, index) : ""
}

function ensureMarkdownFileName(name: string): string {
  const trimmed = name.trim()
  return trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`
}

export function OutlineFileTreePanel({ showHeader = true }: OutlineFileTreePanelProps) {
  const project = useWikiStore((s) => s.project)
  const selectedFile = useWikiStore((s) => s.selectedFile)
  const setSelectedFile = useWikiStore((s) => s.setSelectedFile)
  const setFileTree = useWikiStore((s) => s.setFileTree)
  const bumpDataVersion = useWikiStore((s) => s.bumpDataVersion)
  const dataVersion = useWikiStore((s) => s.dataVersion)
  const enqueueOutlineReferenceTokens = useOutlineChatStore((s) => s.enqueueReferenceTokens)
  const [outlineNodes, setOutlineNodes] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTrees = useCallback(async () => {
    if (!project) return
    const projectPath = normalizePath(project.path)
    const outlineRoot = getOutlineRoot(projectPath)
    const [nextOutlineNodes, nextProjectTree] = await Promise.all([
      listDirectory(outlineRoot),
      listDirectory(projectPath),
    ])
    setOutlineNodes(nextOutlineNodes)
    setFileTree(nextProjectTree)
    bumpDataVersion()
  }, [bumpDataVersion, project, setFileTree])

  useEffect(() => {
    if (!project) {
      setOutlineNodes([])
      return
    }

    let cancelled = false
    async function load() {
      if (!project) return
      setLoading(true)
      setError(null)
      try {
        const projectPath = normalizePath(project.path)
        await Promise.all(
          DEFAULT_OUTLINE_FOLDER_PATHS.map((folderPath) =>
            createDirectory(getDefaultOutlineFolderPath(projectPath, folderPath)),
          ),
        )
        const nodes = await listDirectory(getOutlineRoot(projectPath))
        if (cancelled) return
        setOutlineNodes(nodes)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [dataVersion, project])

  const handleMoveFile = useCallback(
    async (sourcePath: string, targetFolderPath: string) => {
      if (!project) return
      const outlineRoot = getOutlineRoot(project.path)
      const initialPlan = planOutlineFileMove({
        outlineRoot,
        sourcePath,
        targetFolderPath,
        targetExists: false,
      })
      if (!initialPlan.ok) throw new Error(initialPlan.error)

      const exists = await fileExists(initialPlan.targetPath)
      const plan = planOutlineFileMove({
        outlineRoot,
        sourcePath,
        targetFolderPath,
        targetExists: exists,
      })
      if (!plan.ok) throw new Error(plan.error)

      await copyFile(sourcePath, plan.targetPath)
      await deleteFile(sourcePath)
      if (selectedFile === sourcePath) {
        setSelectedFile(plan.targetPath)
      }
      await refreshTrees()
    },
    [project, refreshTrees, selectedFile, setSelectedFile],
  )

  const handleRenameFile = useCallback(
    async (sourcePath: string, nextName: string) => {
      if (!project) return
      const fileName = ensureMarkdownFileName(nextName)
      if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
        throw new Error("文件名不能包含路径分隔符。")
      }
      const source = normalizePath(sourcePath)
      const targetPath = `${getDirName(source)}/${fileName}`
      if (targetPath === source) return

      const exists = await fileExists(targetPath)
      if (exists) throw new Error("目标文件已存在，请更换文件名。")

      await copyFile(source, targetPath)
      await deleteFile(source)
      if (selectedFile === sourcePath || normalizePath(selectedFile ?? "") === source) {
        setSelectedFile(targetPath)
      }
      await refreshTrees()
    },
    [project, refreshTrees, selectedFile, setSelectedFile],
  )

  const handleSendToOutlineChat = useCallback(
    (sourcePath: string, sourceName: string) => {
      const normalizedPath = normalizePath(sourcePath)
      enqueueOutlineReferenceTokens([
        {
          id: `outline:${normalizedPath}`,
          category: "outline",
          title: sourceName,
          path: normalizedPath,
          displayTitle: sourceName,
        },
      ])
    },
    [enqueueOutlineReferenceTokens],
  )

  if (!project) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        请先打开项目
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        大纲目录加载失败：{error}
      </div>
    )
  }

  if (loading && outlineNodes.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        正在加载大纲目录...
      </div>
    )
  }

  return (
    <OutlineFileTree
      nodes={outlineNodes}
      selectedPath={selectedFile}
      onSelectFile={setSelectedFile}
      onMoveFile={handleMoveFile}
      onRenameFile={handleRenameFile}
      onSendToOutlineChat={handleSendToOutlineChat}
      showHeader={showHeader}
    />
  )
}
