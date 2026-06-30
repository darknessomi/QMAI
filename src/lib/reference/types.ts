export type ReferenceCategory =
  | "chapter"
  | "memory"
  | "outline"
  | "deduction"
  | "skill"
  | "chat_history"
  | "outline_history"

export interface ReferenceToken {
  id: string
  category: ReferenceCategory
  title: string
  /** 文件路径或数据源标识 */
  path?: string
  /** 技能时存 skillId */
  skillId?: string
  /** 对话时存 conversationId */
  conversationId?: string
  /** 芯片显示用的截断标题 */
  displayTitle: string
}
