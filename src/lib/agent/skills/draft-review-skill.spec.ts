import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  identifyDeviations,
  loadReviewEvidence,
  type Deviation,
  type DraftReviewInput,
  type DraftReviewResult,
  type ReviewEvidence,
} from "./draft-review-skill";

const mockCognition = vi.hoisted(() => vi.fn());
const mockCharacterStates = vi.hoisted(() => vi.fn());
const mockForeshadowing = vi.hoisted(() => vi.fn());
const mockListSnapshots = vi.hoisted(() => vi.fn());
const mockLoadSnapshot = vi.hoisted(() => vi.fn());

vi.mock("@/lib/novel/character-cognition", () => ({
  loadCognitionState: mockCognition,
  emptyCognitionState: vi.fn(() => ({
    characters: [],
    readerKnows: [],
    lastUpdatedChapter: 0,
  })),
}));

vi.mock("@/lib/novel/character-state", () => ({
  loadCharacterStates: mockCharacterStates,
  createEmptyCharacterStateStore: vi.fn(() => ({
    characters: [],
    lastUpdated: "2026-07-05T00:00:00.000Z",
  })),
}));

vi.mock("@/lib/novel/foreshadowing-tracker", () => ({
  loadForeshadowingTracker: mockForeshadowing,
  createEmptyForeshadowingStore: vi.fn(() => ({
    items: [],
    lastUpdated: "2026-07-05T00:00:00.000Z",
  })),
}));

vi.mock("@/lib/novel/chapter-ingest", () => ({
  listSnapshots: mockListSnapshots,
  loadSnapshot: mockLoadSnapshot,
}));

const aSnapshot = (chapterNumber: number) => ({
  chapterId: `ch${chapterNumber}`,
  chapterNumber,
  characters: [],
  locations: [],
  organizations: [],
  items: [],
  events: [],
  characterStateChanges: [],
  relationshipChanges: [],
  knowledgeChanges: [],
  foreshadowingChanges: [],
  newCanonFacts: [],
  timelineEvents: [],
  conflicts: [],
  summary: "",
  endingHook: "",
  snapshotPath: "",
  memorySynced: true,
  memorySyncedAt: "",
});

describe("loadReviewEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCognition.mockResolvedValue(null);
    mockCharacterStates.mockResolvedValue({ characters: [], lastUpdated: "" });
    mockForeshadowing.mockResolvedValue({ items: [], lastUpdated: "" });
    mockListSnapshots.mockResolvedValue([]);
    mockLoadSnapshot.mockResolvedValue(null);
  });

  it("返回空真源当记忆中心没有任何派生数据", async () => {
    const evidence = await loadReviewEvidence("/proj");
    expect(evidence.cognition).toBeNull();
    expect(evidence.characterStates.characters).toHaveLength(0);
    expect(evidence.foreshadowing.items).toHaveLength(0);
    expect(evidence.previousSnapshot).toBeNull();
    expect(evidence.internalConflict).toBe(false);
    expect(evidence.rawLoadError).toBe(false);
  });

  it("当全部读取成功时聚合返回", async () => {
    mockCognition.mockResolvedValueOnce({
      characters: [{ character: "李雷", knows: ["暗杀计划"], doesNotKnow: [] }],
      readerKnows: [],
      lastUpdatedChapter: 3,
    });
    mockCharacterStates.mockResolvedValueOnce({
      characters: [
        {
          characterName: "李雷",
          currentLocation: "客栈",
          status: "正常",
          equipment: [],
          abilities: [],
          relationships: {},
          lastUpdatedChapter: 3,
          lastUpdatedAt: "",
        },
      ],
      lastUpdated: "",
    });
    mockForeshadowing.mockResolvedValueOnce({
      items: [
        {
          id: "fs1",
          name: "黑令符",
          description: "暗杀信物",
          status: "planted",
          plantedChapter: 2,
          advancedChapters: [],
          relatedCharacters: [],
          relatedEvents: [],
          notes: "",
        },
      ],
      lastUpdated: "",
    });
    mockListSnapshots.mockResolvedValueOnce([3]);
    mockLoadSnapshot.mockResolvedValueOnce(aSnapshot(3));

    const evidence = await loadReviewEvidence("/proj");
    expect(evidence.cognition?.characters[0].character).toBe("李雷");
    expect(evidence.characterStates.characters[0].characterName).toBe("李雷");
    expect(evidence.foreshadowing.items[0].name).toBe("黑令符");
    expect(evidence.previousSnapshot?.chapterNumber).toBe(3);
    expect(evidence.rawLoadError).toBe(false);
  });

  it("读取异常时 rawLoadError=true 但不抛出", async () => {
    mockCognition.mockRejectedValueOnce(new Error("文件损坏"));

    const evidence = await loadReviewEvidence("/proj");
    expect(evidence.rawLoadError).toBe(true);
    expect(evidence.cognition).toBeNull();
    expect(evidence.characterStates.characters).toHaveLength(0);
    expect(evidence.foreshadowing.items).toHaveLength(0);
  });

  it("listSnapshots 返回负数时只取正数章节快照", async () => {
    mockCognition.mockResolvedValueOnce(null);
    mockListSnapshots.mockResolvedValueOnce([-2, -1, 3]);
    mockLoadSnapshot.mockResolvedValueOnce(aSnapshot(3));

    const evidence = await loadReviewEvidence("/proj");
    expect(evidence.previousSnapshot?.chapterNumber).toBe(3);
    expect(evidence.rawLoadError).toBe(false);
  });

  it("多个模块同时失败时 rawLoadError 仍为 true", async () => {
    mockCognition.mockRejectedValueOnce(new Error("损坏1"));
    mockCharacterStates.mockRejectedValueOnce(new Error("损坏2"));
    mockForeshadowing.mockRejectedValueOnce(new Error("损坏3"));

    const evidence = await loadReviewEvidence("/proj");
    expect(evidence.rawLoadError).toBe(true);
    expect(evidence.cognition).toBeNull();
  });
});

describe("identifyDeviations - 角色认知偏差", () => {
  it("角色说出了 doesNotKnow 里的信息 → 标 high 偏差", () => {
    const evidence: ReviewEvidence = {
      cognition: {
        characters: [
          { character: "李雷", knows: [], doesNotKnow: ["暗杀计划"] },
        ],
        readerKnows: [],
        lastUpdatedChapter: 3,
      },
      characterStates: { characters: [], lastUpdated: "" },
      foreshadowing: { items: [], lastUpdated: "" },
      previousSnapshot: null,
      internalConflict: false,
      rawLoadError: false,
    };
    const draft = '李雷说："我已经知道了暗杀计划，所以早有准备。"';
    const deviations = identifyDeviations(draft, evidence);
    expect(deviations).toHaveLength(1);
    expect(deviations[0].type).toBe("cognition");
    expect(deviations[0].severity).toBe("high");
    expect(deviations[0].expected).toContain("李雷不知道暗杀计划");
    expect(deviations[0].memoryEvidence).toContain("暗杀计划");
  });

  it("没有偏差时返回空数组", () => {
    const evidence: ReviewEvidence = {
      cognition: {
        characters: [
          { character: "李雷", knows: ["暗杀计划"], doesNotKnow: [] },
        ],
        readerKnows: [],
        lastUpdatedChapter: 3,
      },
      characterStates: { characters: [], lastUpdated: "" },
      foreshadowing: { items: [], lastUpdated: "" },
      previousSnapshot: null,
      internalConflict: false,
      rawLoadError: false,
    };
    const draft = '李雷说："我已经知道了暗杀计划，所以早有准备。"';
    const deviations = identifyDeviations(draft, evidence);
    expect(deviations).toHaveLength(0);
  });

  it("记忆中心为空时不下偏差（新作品首章）", () => {
    const evidence: ReviewEvidence = {
      cognition: null,
      characterStates: { characters: [], lastUpdated: "" },
      foreshadowing: { items: [], lastUpdated: "" },
      previousSnapshot: null,
      internalConflict: false,
      rawLoadError: false,
    };
    const deviations = identifyDeviations("任意草稿内容", evidence);
    expect(deviations).toHaveLength(0);
  });
});
