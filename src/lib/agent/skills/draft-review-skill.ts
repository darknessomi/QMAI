import {
  loadCognitionState,
  type CognitionState,
} from "@/lib/novel/character-cognition";
import {
  loadCharacterStates,
  type CharacterStateStore,
} from "@/lib/novel/character-state";
import {
  loadForeshadowingTracker,
  type ForeshadowingStore,
} from "@/lib/novel/foreshadowing-tracker";
import {
  listSnapshots,
  loadSnapshot,
  type ChapterSnapshot,
} from "@/lib/novel/chapter-ingest";

export type DeviationType =
  "cognition" | "state" | "continuity" | "foreshadowing";
export type DeviationSeverity = "high" | "mid" | "low";

export interface Deviation {
  id: string;
  type: DeviationType;
  location: string;
  originalText: string;
  expected: string;
  memoryEvidence: string;
  severity: DeviationSeverity;
  repairAction?: string;
}

export interface DraftReviewInput {
  projectPath: string;
  draftChapterText: string;
  draftChapterNumber: number;
  mode: "full" | "incremental";
  previousRound?: DraftReviewResult;
}

export interface DraftReviewResult {
  deviations: Deviation[];
  revisedDraft: string;
  repairSummary: string;
  retryRound: number;
  truncated: boolean;
}

export interface ReviewEvidence {
  cognition: CognitionState | null;
  characterStates: CharacterStateStore;
  foreshadowing: ForeshadowingStore;
  previousSnapshot: ChapterSnapshot | null;
  /** 派生数据内部矛盾标志，Task 3/4 会扩展检测逻辑 */
  internalConflict: boolean;
  rawLoadError: boolean;
}

export async function loadReviewEvidence(
  projectPath: string,
): Promise<ReviewEvidence> {
  let cognition: CognitionState | null = null;
  let characterStates: CharacterStateStore = {
    characters: [],
    lastUpdated: "",
  };
  let foreshadowing: ForeshadowingStore = { items: [], lastUpdated: "" };
  let previousSnapshot: ChapterSnapshot | null = null;
  let rawLoadError = false;

  try {
    cognition = await loadCognitionState(projectPath);
  } catch {
    rawLoadError = true;
  }
  try {
    characterStates = await loadCharacterStates(projectPath);
  } catch {
    rawLoadError = true;
  }
  try {
    foreshadowing = await loadForeshadowingTracker(projectPath);
  } catch {
    rawLoadError = true;
  }
  try {
    const numbers = await listSnapshots(projectPath);
    const valid = numbers.filter((n) => n > 0);
    if (valid.length > 0)
      previousSnapshot = await loadSnapshot(projectPath, Math.max(...valid));
  } catch {
    rawLoadError = true;
  }

  return {
    cognition,
    characterStates,
    foreshadowing,
    previousSnapshot,
    internalConflict: false,
    rawLoadError,
  };
}

let _nextId = 1;
function nextDeviationId(): string {
  return "dev-cog-" + String(_nextId++);
}

function findMatchingCharacter(draft: string, character: string): boolean {
  return draft.includes(character);
}

const COGNITION_LEAK_PATTERNS = [
  "知道",
  "知道了",
  "得知了",
  "察觉到",
  "意识到",
  "已经知道了",
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLocation(draft: string, character: string): string {
  const lines = draft.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(character)) {
      return "第 " + String(i + 1) + " 行";
    }
  }
  return "第 1 行";
}

export function identifyDeviations(
  draft: string,
  evidence: ReviewEvidence,
): Deviation[] {
  const { cognition } = evidence;
  if (!cognition) return [];

  const deviations: Deviation[] = [];

  for (const cc of cognition.characters) {
    const { character, doesNotKnow } = cc;
    if (!findMatchingCharacter(draft, character)) continue;

    for (const unknown of doesNotKnow) {
      const pattern = COGNITION_LEAK_PATTERNS.some((kw) => {
        const sentencePattern = new RegExp(
          escapeRegex(character) +
            "[^。！？\\n]{0,50}" +
            escapeRegex(kw) +
            "[^。！？\\n]{0,50}" +
            escapeRegex(unknown),
        );
        if (sentencePattern.test(draft)) return true;

        const reversePattern = new RegExp(
          escapeRegex(unknown) +
            "[^。！？\\n]{0,50}" +
            escapeRegex(kw) +
            "[^。！？\\n]{0,50}" +
            escapeRegex(character),
        );
        if (reversePattern.test(draft)) return true;

        return false;
      });

      if (!pattern) continue;

      deviations.push({
        id: nextDeviationId(),
        type: "cognition",
        location: findLocation(draft, character),
        originalText: character + "提及了 " + unknown,
        expected: character + "不知道" + unknown,
        memoryEvidence:
          "记忆中心记录：" + character + " 不知道\u300C" + unknown + "\u300D",
        severity: "high",
      });
    }
  }

  return deviations;
}
