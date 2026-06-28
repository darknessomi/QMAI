import { useEffect, useMemo, useState } from "react"
import {
  BUILT_IN_DE_AI_SKILLS,
  createProjectDeAiSkillFromTemplate,
  deleteProjectDeAiSkill,
  getAllDeAiSkills,
  loadDeAiSkillConfig,
  saveDeAiSkillConfig,
  setDeAiSkillEnabled,
  setDefaultDeAiSkill,
  updateProjectDeAiSkill,
  type DeAiSkill,
  type DeAiSkillConfig,
} from "@/lib/novel/de-ai-skill-library"
import { useWikiStore } from "@/stores/wiki-store"

function sourceLabel(skill: DeAiSkill): string {
  if (skill.source === "built-in") return "内置"
  if (skill.source === "legacy") return "旧版"
  return "项目"
}

export function SkillLibraryView() {
  const project = useWikiStore((s) => s.project)
  const [config, setConfig] = useState<DeAiSkillConfig | null>(null)
  const [selectedSkillId, setSelectedSkillId] = useState<string>("")
  const [draftName, setDraftName] = useState("")
  const [draftDescription, setDraftDescription] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const allSkills = useMemo(() => config ? getAllDeAiSkills(config) : [], [config])
  const selectedSkill = allSkills.find((skill) => skill.id === selectedSkillId) ?? allSkills[0] ?? null
  const disabledSkillIds = new Set(config?.disabledSkillIds ?? [])
  const selectedIsEditable = selectedSkill != null && selectedSkill.source !== "built-in"

  useEffect(() => {
    let cancelled = false
    setConfig(null)
    setSelectedSkillId("")
    setMessage("")
    loadDeAiSkillConfig(project?.path)
      .then((loaded) => {
        if (cancelled) return
        setConfig(loaded)
        const firstSkill = getAllDeAiSkills(loaded)[0]
        setSelectedSkillId(loaded.defaultSkillId || firstSkill?.id || "")
      })
      .catch(() => {
        if (!cancelled) setMessage("技能库加载失败")
      })
    return () => {
      cancelled = true
    }
  }, [project?.path])

  useEffect(() => {
    if (!selectedSkill) {
      setDraftName("")
      setDraftDescription("")
      setDraftContent("")
      return
    }
    setDraftName(selectedSkill.name)
    setDraftDescription(selectedSkill.description)
    setDraftContent(selectedSkill.content)
    setMessage("")
  }, [selectedSkill?.id])

  async function persist(nextConfig: DeAiSkillConfig, nextSelectedSkillId = selectedSkillId) {
    if (!project) {
      setConfig(nextConfig)
      setSelectedSkillId(nextSelectedSkillId)
      return
    }
    setSaving(true)
    try {
      await saveDeAiSkillConfig(project.path, nextConfig)
      setConfig(nextConfig)
      setSelectedSkillId(nextSelectedSkillId)
      setMessage("已保存")
    } catch {
      setMessage("技能库保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function handleCopySkill() {
    if (!config || !selectedSkill) return
    const now = Date.now()
    const next = createProjectDeAiSkillFromTemplate(config, selectedSkill.id, now)
    await persist(next, `project:${now}`)
  }

  async function handleSaveSkill() {
    if (!config || !selectedSkill || !selectedIsEditable) return
    const name = draftName.trim()
    const content = draftContent.trim()
    if (!name) {
      setMessage("技能名称不能为空")
      return
    }
    if (!content) {
      setMessage("技能规则不能为空")
      return
    }
    await persist(updateProjectDeAiSkill(config, selectedSkill.id, {
      name,
      description: draftDescription.trim(),
      content,
    }))
  }

  async function handleSetDefault() {
    if (!config || !selectedSkill) return
    await persist(setDefaultDeAiSkill(config, selectedSkill.id))
  }

  async function handleToggleSkill(skill: DeAiSkill, enabled: boolean) {
    if (!config) return
    const next = setDeAiSkillEnabled(config, skill.id, enabled)
    await persist(next, next.defaultSkillId)
  }

  async function handleDeleteSkill() {
    if (!config || !selectedSkill || selectedSkill.source === "built-in") return
    const confirmed = window.confirm(`确定删除「${selectedSkill.name}」吗？`)
    if (!confirmed) return
    const next = deleteProjectDeAiSkill(config, selectedSkill.id)
    const nextSelected = next.defaultSkillId || getAllDeAiSkills(next)[0]?.id || ""
    await persist(next, nextSelected)
  }

  return (
    <div data-testid="skill-library-view" className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-3 py-2">
        <h1 className="text-sm font-semibold">技能库</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">管理当前项目可用的去AI味技能。</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-sm font-medium">去AI味技能</div>
            <button
              type="button"
              onClick={() => {
                if (!config) return
                const next = createProjectDeAiSkillFromTemplate(config, BUILT_IN_DE_AI_SKILLS[0].id)
                void persist(next, next.projectSkills[0]?.id)
              }}
              className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              新建技能
            </button>
          </div>

          <div data-testid="skill-list" className="max-h-[42vh] overflow-y-auto px-2 pb-2">
            {allSkills.map((skill) => {
              const active = skill.id === selectedSkill?.id
              const enabled = !disabledSkillIds.has(skill.id)
              return (
                <div
                  key={skill.id}
                  onClick={() => setSelectedSkillId(skill.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedSkillId(skill.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`mb-2 w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent ${
                    active ? "border-primary bg-accent/60" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {sourceLabel(skill)}
                    </span>
                    {config?.defaultSkillId === skill.id ? (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">默认</span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{skill.description}</div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => void handleToggleSkill(skill, event.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    显示在调用入口
                  </label>
                </div>
              )
            })}
          </div>
        </section>

        <main className="min-w-0 p-3">
          {!selectedSkill ? (
            <div className="text-sm text-muted-foreground">暂无技能。</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{sourceLabel(selectedSkill)}技能</div>
                  <h2 className="truncate text-base font-semibold">{selectedSkill.name}</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    data-testid="skill-copy-button"
                    type="button"
                    onClick={() => void handleCopySkill()}
                    className="rounded-md border px-2 py-1.5 text-xs hover:bg-accent"
                    disabled={saving}
                  >
                    复制为项目技能
                  </button>
                  <button
                    data-testid="skill-default-button"
                    type="button"
                    onClick={() => void handleSetDefault()}
                    className="rounded-md border px-2 py-1.5 text-xs hover:bg-accent"
                    disabled={saving || config?.defaultSkillId === selectedSkill.id}
                  >
                    设为默认
                  </button>
                  {selectedSkill.source !== "built-in" ? (
                    <button
                      data-testid="skill-delete-button"
                      type="button"
                      onClick={() => void handleDeleteSkill()}
                      className="rounded-md border px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                      disabled={saving}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
              </div>

              <label className="grid gap-1.5 text-xs">
                <span className="font-medium">技能名称</span>
                <input
                  data-testid="skill-name-input"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  disabled={!selectedIsEditable}
                  className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <label className="grid gap-1.5 text-xs">
                <span className="font-medium">说明</span>
                <input
                  data-testid="skill-description-input"
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  disabled={!selectedIsEditable}
                  className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <label className="grid gap-1.5 text-xs">
                <span className="font-medium">规则正文</span>
                <textarea
                  data-testid="skill-content-input"
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  disabled={!selectedIsEditable}
                  className="min-h-[280px] rounded-md border bg-background px-2 py-2 font-mono text-xs leading-5 outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  data-testid="skill-save-button"
                  type="button"
                  onClick={() => void handleSaveSkill()}
                  disabled={!selectedIsEditable || saving}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
